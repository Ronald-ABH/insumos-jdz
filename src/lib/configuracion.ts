import { supabase } from './supabaseClient'

export async function obtenerCorreoRespaldo(): Promise<string | null> {
  const { data, error } = await supabase
    .from('configuracion')
    .select('correo_respaldo')
    .eq('id', 1)
    .single()

  if (error) throw error
  return data?.correo_respaldo ?? null
}

export async function guardarCorreoRespaldo(correo: string | null): Promise<void> {
  const { error } = await supabase
    .from('configuracion')
    .update({ correo_respaldo: correo, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) throw error
}
