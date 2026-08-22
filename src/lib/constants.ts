export const MESES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
]

// El input type="date" y Supabase manejan la fecha en formato ISO (AAAA-MM-DD).
// Esta función la convierte a DD/MM/AAAA solo para mostrarla en tablas y reportes.
export function formatearFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  const partes = fecha.split('-')
  if (partes.length !== 3) return fecha
  const [anio, mes, dia] = partes
  return `${dia}/${mes}/${anio}`
}
