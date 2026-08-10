import { supabase } from './supabaseClient'
import type { NuevoRegistro, Registro, Tienda } from '../types/registro'

export type TableName = 'insumos' | 'hallazgos'

// Comprime una imagen antes de subirla: la redimensiona (máx. 1600px de lado)
// y la convierte a JPEG con buena calidad. Si el archivo no es una imagen, ya
// es pequeño (<150KB), o algo falla en el proceso, se sube el original tal
// cual sin arriesgar el registro.
async function comprimirImagen(input: Blob, maxDim = 1600, calidad = 0.72): Promise<Blob> {
  if (!input.type.startsWith('image/') || input.size < 150_000) return input

  try {
    const bitmap = await createImageBitmap(input)
    let { width, height } = bitmap
    if (width > maxDim || height > maxDim) {
      if (width >= height) {
        height = Math.round(height * (maxDim / width))
        width = maxDim
      } else {
        width = Math.round(width * (maxDim / height))
        height = maxDim
      }
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return input
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    const comprimido = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', calidad)
    )
    if (comprimido && comprimido.size < input.size) return comprimido
    return input
  } catch {
    return input
  }
}

export async function listRegistros(table: TableName): Promise<Registro[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Registro[]
}

export async function createRegistro(table: TableName, nuevo: NuevoRegistro): Promise<Registro> {
  const { data, error } = await supabase.from(table).insert(nuevo).select().single()
  if (error) throw error
  return data as Registro
}

export async function updateRegistro(
  table: TableName,
  id: string,
  cambios: Partial<NuevoRegistro>
): Promise<Registro> {
  const { data, error } = await supabase
    .from(table)
    .update(cambios)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Registro
}

export async function deleteRegistro(table: TableName, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

export async function subirEvidencia(file: File): Promise<string> {
  const comprimido = await comprimirImagen(file)
  const esJpeg = comprimido !== file
  const ext = esJpeg ? 'jpg' : (file.name.split('.').pop() ?? 'jpg')
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from('evidencias').upload(path, comprimido, {
    cacheControl: '3600',
    upsert: false,
    contentType: esJpeg ? 'image/jpeg' : file.type || undefined,
  })
  if (error) throw error

  const { data } = supabase.storage.from('evidencias').getPublicUrl(path)
  return data.publicUrl
}

export async function listarTiendas(): Promise<Tienda[]> {
  const { data, error } = await supabase.from('tiendas').select('*').order('nombre')
  if (error) throw error
  return (data ?? []) as Tienda[]
}

export async function crearTienda(
  nombre: string,
  ceco: string | null = null,
  departamento: string | null = null
): Promise<Tienda> {
  const { data, error } = await supabase
    .from('tiendas')
    .insert({ nombre, ceco, departamento })
    .select()
    .single()
  if (error) throw error
  return data as Tienda
}

export async function subirEvidenciaBlob(blob: Blob, extension: string): Promise<string> {
  const comprimido = await comprimirImagen(blob)
  const esJpeg = comprimido !== blob
  const ext = esJpeg ? 'jpg' : extension
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from('evidencias').upload(path, comprimido, {
    cacheControl: '3600',
    upsert: false,
    contentType: esJpeg ? 'image/jpeg' : blob.type || undefined,
  })
  if (error) throw error

  const { data } = supabase.storage.from('evidencias').getPublicUrl(path)
  return data.publicUrl
}
