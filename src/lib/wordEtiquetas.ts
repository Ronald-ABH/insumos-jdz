import { AlignmentType, convertMillimetersToTwip, Document, Packer, Paragraph, TextRun } from 'docx'
import { FORMATOS_PAPEL, type DatoEtiqueta, type FormatoPapel } from './pdfEtiquetas'

const MM_A_PT = 2.83465

// Calcula el tamaño de letra (en puntos) achicándolo si el texto es muy largo,
// igual que en la versión de impresión y de PDF.
function tamanoPt(texto: string, baseFraccion: number, altoMM: number, limite: number, minimoPt: number) {
  const basePt = baseFraccion * altoMM * MM_A_PT
  const largo = texto.trim().length
  if (largo <= limite) return Math.round(basePt)
  return Math.round(Math.max(minimoPt, basePt * (limite / largo)))
}

export async function generarWordEtiquetas(datos: DatoEtiqueta[], formato: FormatoPapel) {
  const { ancho, alto } = FORMATOS_PAPEL[formato]
  const anchoTwip = convertMillimetersToTwip(ancho)
  const altoTwip = convertMillimetersToTwip(alto)

  const children: Paragraph[] = []

  datos.forEach((d, i) => {
    const campos: { texto: string; baseFraccion: number; limite: number; minPt: number; negrita: boolean }[] = [
      { texto: d.tienda.toUpperCase(), baseFraccion: 0.075, limite: 16, minPt: 18, negrita: true },
      ...(d.departamento
        ? [{ texto: d.departamento.toUpperCase(), baseFraccion: 0.032, limite: 20, minPt: 10, negrita: false }]
        : []),
      { texto: d.jdz ?? '—', baseFraccion: 0.045, limite: 18, minPt: 12, negrita: false },
      { texto: d.insumo.toUpperCase(), baseFraccion: 0.055, limite: 20, minPt: 12, negrita: true },
      { texto: d.fecha, baseFraccion: 0.032, limite: 15, minPt: 10, negrita: false },
    ]

    campos.forEach((c, idx) => {
      const pt = tamanoPt(c.texto, c.baseFraccion, alto, c.limite, c.minPt)
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          pageBreakBefore: idx === 0 && i > 0,
          spacing: { before: idx === 0 ? 0 : 200, after: 0 },
          children: [new TextRun({ text: c.texto, bold: c.negrita, size: pt * 2 })],
        })
      )
    })
  })

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: anchoTwip, height: altoTwip },
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          },
          verticalAlign: 'center',
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

export type { FormatoPapel }
