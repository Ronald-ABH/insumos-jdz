import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Registro } from '../types/registro'
import { formatearFecha } from './constants'

interface ExportarPDFOpciones {
  titulo: string
  columnaInsumo: string
  registros: Registro[]
  filtroMes?: string
  busqueda?: string
}

export function exportarPDF({
  titulo,
  columnaInsumo,
  registros,
  filtroMes,
  busqueda,
}: ExportarPDFOpciones) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

  const fecha = new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

  doc.setFontSize(16)
  doc.setTextColor(168, 15, 28)
  doc.text(titulo, 40, 40)

  let subtitulo = `Generado: ${fecha} · ${registros.length} registro(s)`
  if (filtroMes && filtroMes !== 'TODOS') subtitulo += ` · Mes: ${filtroMes}`
  if (busqueda) subtitulo += ` · Búsqueda: "${busqueda}"`

  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(subtitulo, 40, 56)

  const body = registros.map((r) => [
    r.mes,
    r.ceco ?? '—',
    r.tienda,
    String(r.cantidad),
    r.insumo,
    formatearFecha(r.fecha_envio),
    r.evidencia_url ? 'Ver foto' : '—',
  ])

  autoTable(doc, {
    startY: 72,
    head: [['Mes', 'CECO', 'Tienda', 'Cant.', columnaInsumo, 'Fecha envío', 'Evidencia']],
    body,
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: [168, 15, 28], textColor: 255 },
    alternateRowStyles: { fillColor: [253, 236, 235] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const registro = registros[data.row.index]
        if (registro?.evidencia_url) {
          data.cell.styles.textColor = [216, 19, 36]
        }
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const registro = registros[data.row.index]
        if (registro?.evidencia_url) {
          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
            url: registro.evidencia_url,
          })
        }
      }
    },
    didDrawPage: (data) => {
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        `Página ${data.pageNumber}`,
        doc.internal.pageSize.getWidth() - 60,
        doc.internal.pageSize.getHeight() - 20
      )
    },
  })

  const slug = titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
  const nombreArchivo = `${slug}-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(nombreArchivo)
}
