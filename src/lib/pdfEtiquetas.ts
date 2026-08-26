import jsPDF from 'jspdf'

export interface DatoEtiqueta {
  tienda: string
  zona: string | null
  jdz: string | null
  insumo: string
  fecha: string
}

export type FormatoPapel = 'carta' | 'a5' | 'oficio' | 'doble-carta'
export type Orientacion = 'vertical' | 'horizontal'

export const FORMATOS_PAPEL: Record<FormatoPapel, { etiqueta: string; ancho: number; alto: number }> = {
  carta: { etiqueta: 'Carta', ancho: 215.9, alto: 279.4 },
  a5: { etiqueta: 'A5', ancho: 148, alto: 210 },
  oficio: { etiqueta: 'Oficio', ancho: 215.9, alto: 355.6 },
  'doble-carta': { etiqueta: 'Doble carta', ancho: 279.4, alto: 431.8 },
}

const MM_A_PT = 2.83465

// Reduce el tamaño de letra (en pt) hasta que el texto quepa en el ancho disponible.
function ajustarFuente(doc: jsPDF, texto: string, anchoMaximoMM: number, tamanoPt: number, minimoPt: number) {
  let tamano = tamanoPt
  doc.setFontSize(tamano)
  while (tamano > minimoPt && doc.getTextWidth(texto) > anchoMaximoMM) {
    tamano -= 1
    doc.setFontSize(tamano)
  }
  return tamano
}

export function generarPDFEtiquetas(
  datos: DatoEtiqueta[],
  formato: FormatoPapel,
  orientacion: Orientacion = 'vertical'
) {
  const base = FORMATOS_PAPEL[formato]
  const ancho = orientacion === 'horizontal' ? base.alto : base.ancho
  const alto = orientacion === 'horizontal' ? base.ancho : base.alto
  const orientacionJsPdf = orientacion === 'horizontal' ? 'landscape' : 'portrait'
  const doc = new jsPDF({ unit: 'mm', format: [ancho, alto], orientation: orientacionJsPdf })
  const margenH = ancho * 0.1
  const anchoTexto = ancho - margenH * 2
  const centroX = ancho / 2

  datos.forEach((d, i) => {
    if (i > 0) doc.addPage([ancho, alto], orientacionJsPdf)

    const campos: { texto: string; baseMM: number; minMM: number; negrita: boolean }[] = [
      { texto: d.tienda.toUpperCase(), baseMM: alto * 0.075, minMM: alto * 0.03, negrita: true },
      ...(d.zona
        ? [{ texto: d.zona.toUpperCase(), baseMM: alto * 0.032, minMM: alto * 0.018, negrita: false }]
        : []),
      { texto: d.jdz ?? '—', baseMM: alto * 0.045, minMM: alto * 0.02, negrita: false },
      { texto: d.insumo.toUpperCase(), baseMM: alto * 0.055, minMM: alto * 0.02, negrita: true },
      { texto: d.fecha, baseMM: alto * 0.032, minMM: alto * 0.018, negrita: false },
    ]

    // Calcula el tamaño de fuente (en pt) de cada campo, achicándolo si el texto es muy largo.
    const tamanosPt = campos.map((c) => {
      doc.setFont('helvetica', c.negrita ? 'bold' : 'normal')
      const basePt = c.baseMM * MM_A_PT
      const minPt = c.minMM * MM_A_PT
      return ajustarFuente(doc, c.texto, anchoTexto, basePt, minPt)
    })

    const espacioEntreLineas = alto * 0.02 * MM_A_PT
    const alturasLinea = tamanosPt.map((pt) => pt * 1.15)
    const alturaTotal =
      alturasLinea.reduce((a, b) => a + b, 0) + espacioEntreLineas * (campos.length - 1)

    let y = (alto - alturaTotal / MM_A_PT) / 2 + alturasLinea[0] / MM_A_PT

    campos.forEach((c, idx) => {
      doc.setFont('helvetica', c.negrita ? 'bold' : 'normal')
      doc.setFontSize(tamanosPt[idx])
      doc.setTextColor(0, 0, 0)
      doc.text(c.texto, centroX, y, { align: 'center' })
      y += alturasLinea[idx] / MM_A_PT + espacioEntreLineas / MM_A_PT
    })
  })

  doc.save(`etiquetas-${new Date().toISOString().slice(0, 10)}.pdf`)
}
