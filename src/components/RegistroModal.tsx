import { useState, type FormEvent } from 'react'
import { MESES } from '../lib/constants'
import { subirEvidencia } from '../lib/api'
import type { NuevoRegistro, Registro } from '../types/registro'
import './RegistroModal.css'

interface Props {
  registro: Registro | null
  onClose: () => void
  onSave: (data: NuevoRegistro) => Promise<void>
}

const vacio: NuevoRegistro = {
  mes: MESES[new Date().getMonth()],
  ceco: '',
  tienda: '',
  cantidad: 1,
  insumo: '',
  fecha_envio: null,
  evidencia_url: null,
}

export default function RegistroModal({ registro, onClose, onSave }: Props) {
  const [form, setForm] = useState<NuevoRegistro>(
    registro
      ? {
          mes: registro.mes,
          ceco: registro.ceco,
          tienda: registro.tienda,
          cantidad: registro.cantidad,
          insumo: registro.insumo,
          fecha_envio: registro.fecha_envio,
          evidencia_url: registro.evidencia_url,
        }
      : vacio
  )
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(registro?.evidencia_url ?? null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleArchivo = (file: File | null) => {
    setArchivo(file)
    if (file) setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.ceco || !form.tienda || !form.insumo) {
      setError('Completa CECO, Tienda e Insumo.')
      return
    }

    setGuardando(true)
    setError(null)
    try {
      let evidencia_url = form.evidencia_url
      if (archivo) {
        evidencia_url = await subirEvidencia(archivo)
      }
      await onSave({ ...form, evidencia_url })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al guardar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{registro ? 'Editar registro' : 'Nuevo registro'}</h2>

        <div className="modal-grid">
          <label>
            Mes
            <select
              value={form.mes}
              onChange={(e) => setForm({ ...form, mes: e.target.value })}
            >
              {MESES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label>
            CECO
            <input
              value={form.ceco}
              onChange={(e) => setForm({ ...form, ceco: e.target.value })}
              placeholder="6A18T00145"
            />
          </label>

          <label className="span-2">
            Tienda
            <input
              value={form.tienda}
              onChange={(e) => setForm({ ...form, tienda: e.target.value })}
              placeholder="TIENDA ESCUELA SALDAÑA"
            />
          </label>

          <label>
            Cantidad
            <input
              type="number"
              min={1}
              value={form.cantidad}
              onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value) })}
            />
          </label>

          <label>
            Fecha de envío
            <input
              type="date"
              value={form.fecha_envio ?? ''}
              onChange={(e) => setForm({ ...form, fecha_envio: e.target.value || null })}
            />
          </label>

          <label className="span-2">
            Insumo
            <input
              value={form.insumo}
              onChange={(e) => setForm({ ...form, insumo: e.target.value })}
              placeholder="ESCRITORIO, ESTIBADOR MANUAL, etc."
            />
          </label>

          <label className="span-2">
            Evidencia (foto)
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleArchivo(e.target.files?.[0] ?? null)}
            />
          </label>

          {preview && (
            <div className="span-2 preview-wrap">
              <img src={preview} alt="Vista previa de evidencia" />
            </div>
          )}
        </div>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
