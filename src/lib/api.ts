import { supabase } from './supabaseClient'
import type { NuevoRegistro, Registro } from '../types/registro'

export type TableName = 'insumos' | 'hallazgos'

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
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from('evidencias').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error

  const { data } = supabase.storage.from('evidencias').getPublicUrl(path)
  return data.publicUrl
}
