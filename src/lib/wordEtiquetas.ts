import {
  AlignmentType,
  convertMillimetersToTwip,
  Document,
  HeightRule,
  PageBreak,
  PageOrientation,
  Paragraph,
  Packer,
  Table,
  TableBorders,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'
import { FORMATOS_PAPEL, type DatoEtiqueta, type FormatoPapel, type Orientacion } from './pdfEtiquetas'

const MM_A_PT = 2.83465

// Calcula el tamaño de letra (en puntos) achicándolo si el texto es muy largo,
// igual que en la versión de impresión y de PDF.
function tamanoPt(texto: string, baseFraccion: number, altoMM: number, limite: number, minimoPt: number) {
  const basePt = baseFraccion * altoMM * MM_A_PT
  const largo = texto.trim().length
  if (largo <= limite) return Math.round(basePt)
  return Math.round(Math.max(minimoPt, basePt * (limite / largo)))
}

export async function generarWordEtiquetas(
  datos: DatoEtiqueta[],
  formato: FormatoPapel,
  orientacion: Orientacion = 'vertical'
) {
  const base = FORMATOS_PAPEL[formato]
  const ancho = orientacion === 'horizontal' ? base.alto : base.ancho
  const alto = orientacion === 'horizontal' ? base.ancho : base.alto
  const anchoTwip = convertMillimetersToTwip(ancho)
  const altoTwip = convertMillimetersToTwip(alto)
  // docx espera el tamaño de página siempre en términos "verticales" (ancho corto,
  // alto largo) y él mismo los intercambia internamente según `orientation`.
  const paginaAnchoTwip = convertMillimetersToTwip(base.ancho)
  const paginaAltoTwip = convertMillimetersToTwip(base.alto)
  // Un poco menos del 100% para que no se genere una página en blanco extra.
  const altoFilaTwip = Math.round(altoTwip * 0.98)
  const margenLateralTwip = convertMillimetersToTwip(ancho * 0.08)

  const children: (Paragraph | Table)[] = []

  datos.forEach((d, i) => {
    if (i > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }

    const campos: { texto: string; baseFraccion: number; limite: number; minPt: number; negrita: boolean }[] = [
      { texto: d.tienda.toUpperCase(), baseFraccion: 0.075, limite: 16, minPt: 18, negrita: true },
      ...(d.departamento
        ? [{ texto: d.departamento.toUpperCase(), baseFraccion: 0.032, limite: 20, minPt: 10, negrita: false }]
        : []),
      { texto: d.jdz ?? '—', baseFraccion: 0.045, limite: 18, minPt: 12, negrita: false },
      { texto: d.insumo.toUpperCase(), baseFraccion: 0.055, limite: 20, minPt: 12, negrita: true },
      { texto: d.fecha, baseFraccion: 0.032, limite: 15, minPt: 10, negrita: false },
    ]

    const parrafos = campos.map((c, idx) => {
      const pt = tamanoPt(c.texto, c.baseFraccion, alto, c.limite, c.minPt)
      return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: idx === 0 ? 0 : 200, after: 0 },
        children: [new TextRun({ text: c.texto, bold: c.negrita, size: pt * 2 })],
      })
    })

    // Se mete el contenido en una tabla de una sola celda: así el centrado vertical
    // funciona tanto en Word como en Google Docs (el centrado a nivel de página no
    // lo respeta Google Docs).
    children.push(
      new Table({
        width: { size: anchoTwip, type: WidthType.DXA },
        borders: TableBorders.NONE,
        rows: [
          new TableRow({
            height: { value: altoFilaTwip, rule: HeightRule.EXACT },
            children: [
              new TableCell({
                width: { size: anchoTwip, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 0, bottom: 0, left: margenLateralTwip, right: margenLateralTwip },
                children: parrafos,
              }),
            ],
          }),
        ],
      })
    )
  })

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: paginaAnchoTwip,
              height: paginaAltoTwip,
              orientation: orientacion === 'horizontal' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          },
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `etiquetas-${new Date().toISOString().slice(0, 10)}.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export type { FormatoPapel, Orientacion }
