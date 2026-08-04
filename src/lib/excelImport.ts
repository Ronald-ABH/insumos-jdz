import JSZip from 'jszip'

export interface FilaImportada {
  filaExcel: number
  mes: string
  ceco: string | null
  tienda: string
  cantidad: number
  insumo: string
  fecha_envio: string | null
  imagen: { blob: Blob; extension: string } | null
}

export interface HojaExcel {
  nombre: string
  path: string
}

const CAMPOS: Record<string, string[]> = {
  mes: ['MES'],
  ceco: ['CECO'],
  tienda: ['TIENDA'],
  cantidad: ['CANTIDAD'],
  insumo: ['INSUMO', 'HALLAZGO'],
  fecha_envio: ['ENVIO A TIENDA', 'FECHA DE ENVIO', 'FECHA ENVIO', 'FECHA'],
  evidencia: ['EVIDENCIA'],
}

function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
}

function localName(tag: string): string {
  const i = tag.indexOf(':')
  return i === -1 ? tag : tag.slice(i + 1)
}

function childElements(el: Element): Element[] {
  const out: Element[] = []
  const nodes = el.childNodes
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (n.nodeType === 1) out.push(n as Element)
  }
  return out
}

function findDescendants(el: Element | Document, tagLocalName: string): Element[] {
  const all = el.getElementsByTagName('*')
  const out: Element[] = []
  for (let i = 0; i < all.length; i++) {
    const node = all[i]
    if (localName(node.tagName) === tagLocalName) out.push(node)
  }
  return out
}

function getAttrAny(el: Element, suffix: string): string | null {
  const attrs = el.attributes
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i]
    if (a.name === suffix || a.name.endsWith(':' + suffix)) return a.value
  }
  return null
}

function colLetterToIndex(letter: string): number {
  let n = 0
  for (const ch of letter) {
    n = n * 26 + (ch.charCodeAt(0) - 64)
  }
  return n
}

function cellRefToRowCol(ref: string): { row: number; col: number } {
  const match = ref.match(/^([A-Z]+)(\d+)$/)
  if (!match) return { row: 0, col: 0 }
  return { row: parseInt(match[2], 10), col: colLetterToIndex(match[1]) }
}

// 1899-12-30 es el "dia cero" del sistema de fechas de Excel
const EXCEL_EPOCH = Date.UTC(1899, 11, 30)

function serialExcelAFecha(serial: number): string | null {
  if (!isFinite(serial) || serial <= 0) return null
  const ms = EXCEL_EPOCH + Math.round(serial) * 86400000
  const d = new Date(ms)
  if (isNaN(d.getTime())) return null
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function textoAFecha(texto: string): string | null {
  const t = texto.trim()
  // dd/mm/yyyy o d/m/yyyy
  const m1 = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m1) {
    const [, d, mo, y] = m1
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // yyyy-mm-dd ya viene bien
  const m2 = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m2) {
    const [, y, mo, d] = m2
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const serial = Number(t)
  if (!isNaN(serial) && serial > 20000 && serial < 60000) {
    return serialExcelAFecha(serial)
  }
  return null
}

async function leerSharedStrings(zip: JSZip): Promise<string[]> {
  const file = zip.file('xl/sharedStrings.xml')
  if (!file) return []
  const xml = await file.async('string')
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const items = findDescendants(doc, 'si')
  return items.map((si) => {
    const ts = findDescendants(si, 't')
    return ts.map((t) => t.textContent ?? '').join('')
  })
}

export async function listarHojas(arrayBuffer: ArrayBuffer): Promise<HojaExcel[]> {
  const zip = await JSZip.loadAsync(arrayBuffer)
  const wbXml = await zip.file('xl/workbook.xml')!.async('string')
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')!.async('string')

  const wbDoc = new DOMParser().parseFromString(wbXml, 'application/xml')
  const relsDoc = new DOMParser().parseFromString(relsXml, 'application/xml')

  const relIdToTarget = new Map<string, string>()
  for (const rel of findDescendants(relsDoc, 'Relationship')) {
    const id = rel.getAttribute('Id')
    const target = rel.getAttribute('Target')
    if (id && target) relIdToTarget.set(id, target)
  }

  const hojas: HojaExcel[] = []
  for (const sheetEl of findDescendants(wbDoc, 'sheet')) {
    const nombre = sheetEl.getAttribute('name') ?? 'Hoja'
    const rId = getAttrAny(sheetEl, 'id')
    const target = rId ? relIdToTarget.get(rId) : undefined
    if (target) {
      const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`
      hojas.push({ nombre, path })
    }
  }
  return hojas
}

export async function parsearHoja(
  arrayBuffer: ArrayBuffer,
  hojaPath: string,
  onProgreso?: (mensaje: string) => void
): Promise<FilaImportada[]> {
  const reportar = (m: string) => onProgreso?.(m)

  reportar('Abriendo el archivo...')
  const zip = await JSZip.loadAsync(arrayBuffer)
  const sharedStrings = await leerSharedStrings(zip)

  const sheetFile = zip.file(hojaPath)
  if (!sheetFile) throw new Error('No se encontró la hoja seleccionada dentro del archivo.')

  reportar('Leyendo filas y columnas...')
  const sheetXml = await sheetFile.async('string')
  const doc = new DOMParser().parseFromString(sheetXml, 'application/xml')

  // --- Leer celdas por fila (valores + referencias a imagenes "en la celda") ---
  type FilaCruda = Map<number, string>
  const filas = new Map<number, FilaCruda>()
  const vmPorFilaCol = new Map<number, Map<number, number>>()

  for (const rowEl of findDescendants(doc, 'row')) {
    const rowNum = parseInt(rowEl.getAttribute('r') ?? '0', 10)
    const celdas: FilaCruda = new Map()
    for (const c of childElements(rowEl)) {
      if (localName(c.tagName) !== 'c') continue
      const ref = c.getAttribute('r') ?? ''
      const { col } = cellRefToRowCol(ref)

      const vm = c.getAttribute('vm')
      if (vm) {
        if (!vmPorFilaCol.has(rowNum)) vmPorFilaCol.set(rowNum, new Map())
        vmPorFilaCol.get(rowNum)!.set(col, parseInt(vm, 10))
      }

      const tipo = c.getAttribute('t')
      let valor = ''
      if (tipo === 'inlineStr') {
        const t = findDescendants(c, 't')[0]
        valor = t?.textContent ?? ''
      } else {
        const vEl = childElements(c).find((ch) => localName(ch.tagName) === 'v')
        const raw = vEl?.textContent ?? ''
        if (tipo === 's') {
          const idx = parseInt(raw, 10)
          valor = sharedStrings[idx] ?? ''
        } else {
          valor = raw
        }
      }
      celdas.set(col, valor)
    }
    filas.set(rowNum, celdas)
  }

  const numerosFila = Array.from(filas.keys()).sort((a, b) => a - b)
  if (numerosFila.length === 0) return []

  // --- Detectar la fila de encabezados: puede no ser la primera (títulos, filas en blanco, etc.) ---
  let filaHeader = numerosFila[0]
  let colPorCampo: Record<string, number> = {}
  let mejorPuntaje = -1

  for (const rowNum of numerosFila.slice(0, 25)) {
    const celdas = filas.get(rowNum)!
    const mapaCampos: Record<string, number> = {}
    celdas.forEach((valor, col) => {
      const norm = normalizarTexto(valor)
      if (!norm) return
      for (const [campo, variantes] of Object.entries(CAMPOS)) {
        if (variantes.some((v) => norm === v || norm.includes(v))) {
          if (!(campo in mapaCampos)) mapaCampos[campo] = col
        }
      }
    })
    const puntaje = Object.keys(mapaCampos).length
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje
      filaHeader = rowNum
      colPorCampo = mapaCampos
    }
  }

  // --- Imágenes: primero el formato moderno "Insertar imagen en la celda" (Excel 365) ---
  reportar('Buscando fotos en formato moderno (imagen en celda)...')
  const mediaPorVm = await leerRichDataImagenes(zip)

  // --- y como respaldo, el formato clásico de imagen flotante anclada a una celda ---
  reportar('Buscando fotos en formato clásico (flotantes)...')
  const imagenesFlotantesPorFila = await leerImagenesDeHoja(zip, hojaPath)

  const colEvidencia = colPorCampo['evidencia']

  interface FilaEnConstruccion extends Omit<FilaImportada, 'imagen'> {
    mediaPathPendiente: string | null
    imagenFlotante: { blob: Blob; extension: string } | null
  }

  const filasConstruidas: FilaEnConstruccion[] = []
  for (const rowNum of numerosFila) {
    if (rowNum <= filaHeader) continue
    const celdas = filas.get(rowNum)!
    const get = (campo: string) => {
      const col = colPorCampo[campo]
      return col !== undefined ? (celdas.get(col) ?? '').trim() : ''
    }

    const tienda = get('tienda')
    const insumo = get('insumo')
    if (!tienda && !insumo) continue // fila vacía

    const cantidadTexto = get('cantidad')
    const cantidad = cantidadTexto ? Math.round(Number(cantidadTexto)) || 1 : 1
    const fechaTexto = get('fecha_envio')

    // Buscar la imagen de esta fila: primero en la columna de evidencia (formato moderno),
    // si no hay columna detectada usamos cualquier celda con imagen de esa fila.
    let mediaPathPendiente: string | null = null
    const vmDeFila = vmPorFilaCol.get(rowNum)
    if (vmDeFila) {
      const vm = colEvidencia !== undefined ? vmDeFila.get(colEvidencia) : vmDeFila.values().next().value
      if (vm !== undefined) {
        mediaPathPendiente = mediaPorVm.get(vm) ?? null
      }
    }

    filasConstruidas.push({
      filaExcel: rowNum,
      mes: get('mes').toUpperCase() || 'SIN MES',
      ceco: get('ceco') || null,
      tienda: tienda || 'SIN NOMBRE',
      cantidad,
      insumo: insumo || 'SIN DESCRIPCION',
      fecha_envio: fechaTexto ? textoAFecha(fechaTexto) : null,
      mediaPathPendiente,
      imagenFlotante: mediaPathPendiente ? null : imagenesFlotantesPorFila.get(rowNum) ?? null,
    })
  }

  // --- Resolver los blobs reales de las fotos en formato moderno, una por una ---
  const total = filasConstruidas.filter((f) => f.mediaPathPendiente).length
  let hechas = 0
  for (const fila of filasConstruidas) {
    if (!fila.mediaPathPendiente) continue
    hechas += 1
    reportar(`Extrayendo fotos (${hechas} de ${total})...`)
    const mediaFile = zip.file(fila.mediaPathPendiente)
    if (mediaFile) {
      const arrayBuffer = await mediaFile.async('arraybuffer')
      const extension = extensionDeArchivo(fila.mediaPathPendiente)
      fila.imagenFlotante = { blob: new Blob([arrayBuffer], { type: mimeDeExtension(extension) }), extension }
    }
  }

  return filasConstruidas.map(({ mediaPathPendiente: _mediaPathPendiente, imagenFlotante, ...resto }) => ({
    ...resto,
    imagen: imagenFlotante,
  }))
}

function extensionDeArchivo(path: string): string {
  const m = path.match(/\.([a-zA-Z0-9]+)$/)
  return m ? m[1].toLowerCase() : 'png'
}

function mimeDeExtension(ext: string): string {
  const mapa: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    webp: 'image/webp',
  }
  return mapa[ext] ?? 'application/octet-stream'
}

// Excel 365 "Insertar imagen > En la celda": la imagen queda referenciada desde la celda
// via el atributo vm="N" (value metadata), no como un dibujo flotante clasico.
// Cadena: celda vm -> xl/metadata.xml (bk en orden, vm-1) -> indice de rich value
//         -> xl/richData/rdrichvalue.xml (rv en orden) -> indice de relacion
//         -> xl/richData/richValueRel.xml (rel en orden) -> r:id
//         -> xl/richData/_rels/richValueRel.xml.rels -> ruta real del archivo de imagen
async function leerRichDataImagenes(zip: JSZip): Promise<Map<number, string>> {
  const resultado = new Map<number, string>()

  const metadataFile = zip.file('xl/metadata.xml')
  const rvFile = zip.file('xl/richData/rdrichvalue.xml')
  const relListFile = zip.file('xl/richData/richValueRel.xml')
  const relsFile = zip.file('xl/richData/_rels/richValueRel.xml.rels')
  if (!metadataFile || !rvFile || !relListFile || !relsFile) return resultado

  const metadataDoc = new DOMParser().parseFromString(
    await metadataFile.async('string'),
    'application/xml'
  )
  const bks = findDescendants(metadataDoc, 'bk')
  const richIndexPorVm: number[] = bks.map((bk) => {
    const rvb = findDescendants(bk, 'rvb')[0]
    const i = rvb ? getAttrAny(rvb, 'i') : null
    return i !== null ? parseInt(i, 10) : -1
  })

  const rvDoc = new DOMParser().parseFromString(await rvFile.async('string'), 'application/xml')
  const rvNodes = findDescendants(rvDoc, 'rv')
  const relIndexPorRichIndex: number[] = rvNodes.map((rv) => {
    const primero = childElements(rv).find((c) => localName(c.tagName) === 'v')
    const txt = primero?.textContent
    return txt !== undefined && txt !== null ? parseInt(txt, 10) : -1
  })

  const relListDoc = new DOMParser().parseFromString(
    await relListFile.async('string'),
    'application/xml'
  )
  const relNodes = findDescendants(relListDoc, 'rel')
  const ridPorRelIndex: string[] = relNodes.map((rel) => getAttrAny(rel, 'id') ?? '')

  const relsDoc = new DOMParser().parseFromString(await relsFile.async('string'), 'application/xml')
  const targetPorRid = new Map<string, string>()
  for (const rel of findDescendants(relsDoc, 'Relationship')) {
    const id = rel.getAttribute('Id')
    const target = rel.getAttribute('Target')
    if (id && target) targetPorRid.set(id, target)
  }

  richIndexPorVm.forEach((richIndex, idx) => {
    const vm = idx + 1
    if (richIndex < 0 || richIndex >= relIndexPorRichIndex.length) return
    const relIndex = relIndexPorRichIndex[richIndex]
    if (relIndex < 0 || relIndex >= ridPorRelIndex.length) return
    const rid = ridPorRelIndex[relIndex]
    const target = targetPorRid.get(rid)
    if (!target) return
    resultado.set(vm, resolverRuta('xl/richData', target))
  })

  return resultado
}

async function leerImagenesDeHoja(
  zip: JSZip,
  hojaPath: string
): Promise<Map<number, { blob: Blob; extension: string }>> {
  const resultado = new Map<number, { blob: Blob; extension: string }>()

  // 1) hoja -> archivo de drawing (via rels de la hoja)
  const partes = hojaPath.split('/')
  const nombreHoja = partes[partes.length - 1]
  const dirHoja = partes.slice(0, -1).join('/')
  const relsHojaPath = `${dirHoja}/_rels/${nombreHoja}.rels`
  const relsHojaFile = zip.file(relsHojaPath)
  if (!relsHojaFile) return resultado

  const relsHojaXml = await relsHojaFile.async('string')
  const relsHojaDoc = new DOMParser().parseFromString(relsHojaXml, 'application/xml')
  let drawingTarget: string | null = null
  for (const rel of findDescendants(relsHojaDoc, 'Relationship')) {
    const type = rel.getAttribute('Type') ?? ''
    if (type.endsWith('/drawing')) {
      drawingTarget = rel.getAttribute('Target')
    }
  }
  if (!drawingTarget) return resultado

  const drawingPath = resolverRuta(dirHoja, drawingTarget)
  const drawingFile = zip.file(drawingPath)
  if (!drawingFile) return resultado

  const drawingXml = await drawingFile.async('string')

  // Estos dibujos pueden venir llenos de formas invisibles (marcadores de comentarios, etc.)
  // y pesar decenas de MB sin tener ni una sola foto real. Antes de intentar interpretar
  // todo el XML (lento y pesado), confirmamos que de verdad haya una imagen incrustada.
  if (!drawingXml.includes('r:embed=') && !drawingXml.includes('r:embed =')) {
    return resultado
  }

  const drawingDoc = new DOMParser().parseFromString(drawingXml, 'application/xml')

  // 2) drawing -> rels del drawing (rId -> archivo de media)
  const partesDrawing = drawingPath.split('/')
  const nombreDrawing = partesDrawing[partesDrawing.length - 1]
  const dirDrawing = partesDrawing.slice(0, -1).join('/')
  const relsDrawingPath = `${dirDrawing}/_rels/${nombreDrawing}.rels`
  const relsDrawingFile = zip.file(relsDrawingPath)
  const rIdToMedia = new Map<string, string>()
  if (relsDrawingFile) {
    const relsDrawingXml = await relsDrawingFile.async('string')
    const relsDrawingDoc = new DOMParser().parseFromString(relsDrawingXml, 'application/xml')
    for (const rel of findDescendants(relsDrawingDoc, 'Relationship')) {
      const id = rel.getAttribute('Id')
      const target = rel.getAttribute('Target')
      if (id && target) rIdToMedia.set(id, resolverRuta(dirDrawing, target))
    }
  }

  // 3) anclas (oneCellAnchor / twoCellAnchor) -> fila + rId de imagen
  const anclas = [
    ...findDescendants(drawingDoc, 'oneCellAnchor'),
    ...findDescendants(drawingDoc, 'twoCellAnchor'),
  ]

  for (const ancla of anclas) {
    const blip = findDescendants(ancla, 'blip')[0]
    if (!blip) continue // forma sin imagen real (autoshape, comentario, etc.)

    const fromEl = findDescendants(ancla, 'from')[0]
    if (!fromEl) continue
    const rowEl = childElements(fromEl).find((c) => localName(c.tagName) === 'row')
    if (!rowEl) continue
    const rowIndex0 = parseInt(rowEl.textContent ?? '0', 10)
    const rowNum = rowIndex0 + 1 // xlsx anchors son 0-indexados

    const rId = getAttrAny(blip, 'embed')
    if (!rId) continue
    const mediaPath = rIdToMedia.get(rId)
    if (!mediaPath) continue

    const mediaFile = zip.file(mediaPath)
    if (!mediaFile) continue
    const arrayBuffer = await mediaFile.async('arraybuffer')
    const extension = extensionDeArchivo(mediaPath)
    const blob = new Blob([arrayBuffer], { type: mimeDeExtension(extension) })
    resultado.set(rowNum, { blob, extension })
  }

  return resultado
}

function resolverRuta(base: string, relativo: string): string {
  if (relativo.startsWith('/')) return relativo.slice(1)
  const partesBase = base.split('/')
  const partesRel = relativo.split('/')
  for (const parte of partesRel) {
    if (parte === '..') partesBase.pop()
    else if (parte === '.') continue
    else partesBase.push(parte)
  }
  return partesBase.join('/')
}
