// Script de respaldo diario: genera PDFs de Insumos y Hallazgos y los envía por correo.
// Se ejecuta desde el GitHub Action programado (.github/workflows/respaldo-diario.yml)
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import nodemailer from 'nodemailer'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Faltan SUPABASE_URL / SUPABASE_ANON_KEY en las variables de entorno.')
}
if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  throw new Error('Faltan GMAIL_USER / GMAIL_APP_PASSWORD en las variables de entorno.')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function obtenerCorreoDestino() {
  const { data, error } = await supabase
    .from('configuracion')
    .select('correo_respaldo')
    .eq('id', 1)
    .single()
  if (error) throw error
  return data?.correo_respaldo || null
}

async function obtenerRegistros(tabla) {
  const { data, error } = await supabase
    .from(tabla)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

function construirPDF(titulo, columnaInsumo, registros) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const fecha = new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  doc.setFontSize(16)
  doc.setTextColor(168, 15, 28)
  doc.text(titulo, 40, 40)

  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Respaldo automático · Generado: ${fecha} · ${registros.length} registro(s)`, 40, 56)

  const body = registros.map((r) => [
    r.mes,
    r.ceco ?? '—',
    r.tienda,
    String(r.cantidad),
    r.insumo,
    r.fecha_envio ?? '—',
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
        if (registro?.evidencia_url) data.cell.styles.textColor = [216, 19, 36]
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
  })

  return Buffer.from(doc.output('arraybuffer'))
}

async function main() {
  const correo = await obtenerCorreoDestino()
  if (!correo) {
    console.log('No hay correo de respaldo configurado en la app todavía. No se envía nada.')
    return
  }

  const [insumos, hallazgos] = await Promise.all([
    obtenerRegistros('insumos'),
    obtenerRegistros('hallazgos'),
  ])

  const pdfInsumos = construirPDF('Solicitud de Insumos', 'Insumo', insumos)
  const pdfHallazgos = construirPDF('Hallazgos BPM y SST', 'Hallazgo', hallazgos)

  const fechaTitulo = new Date().toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const fechaArchivo = new Date().toISOString().slice(0, 10)

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  })

  await transporter.sendMail({
    from: `Solicitudes JDZ D1 <${GMAIL_USER}>`,
    to: correo,
    subject: `Respaldo diario JDZ D1 - ${fechaTitulo}`,
    text: [
      `Respaldo automático del ${fechaTitulo}.`,
      '',
      `Insumos: ${insumos.length} registro(s)`,
      `Hallazgos BPM y SST: ${hallazgos.length} registro(s)`,
      '',
      'Se adjuntan los PDF con todo lo que hay guardado hasta hoy en la app.',
    ].join('\n'),
    attachments: [
      { filename: `insumos-${fechaArchivo}.pdf`, content: pdfInsumos },
      { filename: `hallazgos-${fechaArchivo}.pdf`, content: pdfHallazgos },
    ],
  })

  console.log(`Respaldo enviado a ${correo} (${insumos.length} insumos, ${hallazgos.length} hallazgos).`)
}

main().catch((err) => {
  console.error('Error enviando el respaldo:', err)
  process.exit(1)
})
