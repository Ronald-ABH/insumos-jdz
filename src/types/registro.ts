export interface Registro {
  id: string
  mes: string
  ceco: string
  tienda: string
  cantidad: number
  insumo: string
  fecha_envio: string | null
  evidencia_url: string | null
  created_at: string
}

export type NuevoRegistro = Omit<Registro, 'id' | 'created_at'>
