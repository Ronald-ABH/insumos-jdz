export interface Registro {
  id: string
  mes: string
  ceco: string | null
  tienda: string
  cantidad: number
  insumo: string
  fecha_envio: string | null
  evidencia_url: string | null
  created_at: string
}

export type NuevoRegistro = Omit<Registro, 'id' | 'created_at'>

export interface Tienda {
  id: string
  nombre: string
  ceco: string | null
  departamento: string | null
  created_at: string
}
