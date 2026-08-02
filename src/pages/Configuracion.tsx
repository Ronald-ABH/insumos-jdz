import { useEffect, useState, type FormEvent } from 'react'
import { guardarCorreoRespaldo, obtenerCorreoRespaldo } from '../lib/configuracion'
import './Configuracion.css'

export default function Configuracion() {
  const [correo, setCorreo] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    obtenerCorreoRespaldo()
      .then((c) => setCorreo(c ?? ''))
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la configuración.'))
      .finally(() => setCargando(false))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    setMensaje(null)
    try {
      await guardarCorreoRespaldo(correo.trim() || null)
      setMensaje('Guardado. Desde mañana llega el respaldo diario a ese correo.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="config-card">
      <h2>Configuración</h2>
      <p className="config-texto">
        Todos los días a las 6:00 a.m. (hora Colombia) se envía automáticamente un PDF con todo lo
        que hay en Insumos y Hallazgos a este correo, como respaldo por si algo falla.
      </p>

      {cargando ? (
        <p className="config-texto">Cargando...</p>
      ) : (
        <form onSubmit={handleSubmit} className="config-form">
          <label htmlFor="correo-respaldo">Correo de respaldo</label>
          <input
            id="correo-respaldo"
            type="email"
            placeholder="ejemplo@correo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />

          {mensaje && <p className="config-mensaje">{mensaje}</p>}
          {error && <p className="config-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      )}
    </div>
  )
}
