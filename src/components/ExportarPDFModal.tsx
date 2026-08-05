import { useMemo, useState } from 'react'
import { MESES } from '../lib/constants'
import { exportarPDF } from '../lib/pdf'
import type { Registro } from '../types/registro'
import './ExportarPDFModal.css'

interface Props {
  titulo: string
  columnaInsumo: string
  todos: Registro[]
  filtrados: Registro[]
  filtroMes: string
  busqueda: string
  onClose: () => void
}

type Alcance = 'filtros' | 'todos' | 'meses'
type Evidencia = 'TODOS' | 'CON' | 'SIN'

export default function ExportarPDFModal({
  titulo,
  columnaInsumo,
  todos,
  filtrados,
  filtroMes,
  busqueda,
  onClose,
}: Props) {
  const [alcance, setAlcance] = useState<Alcance>('filtros')
  const [mesesElegidos, setMesesElegidos] = useState<string[]>([])
  const [evidencia, setEvidencia] = useState<Evidencia>('TODOS')

  const toggleMes = (mes: string) => {
    setMesesElegidos((prev) => (prev.includes(mes) ? prev.filter((m) => m !== mes) : [...prev, mes]))
  }

  const seleccionFinal = useMemo(() => {
    if (alcance === 'filtros') return filtrados

    let base = todos
    if (alcance === 'meses' && mesesElegidos.length > 0) {
      base = base.filter((r) => mesesElegidos.includes(r.mes))
    }
    if (evidencia === 'CON') base = base.filter((r) => !!r.evidencia_url)
    if (evidencia === 'SIN') base = base.filter((r) => !r.evidencia_url)
    return base
  }, [alcance, mesesElegidos, evidencia, todos, filtrados])

  const generar = () => {
    if (alcance === 'filtros') {
      exportarPDF({ titulo, columnaInsumo, registros: filtrados, filtroMes, busqueda })
      onClose()
      return
    }

    const notaMeses = alcance === 'meses' && mesesElegidos.length > 0 ? mesesElegidos.join(', ') : undefined
    const notaEvidencia =
      evidencia !== 'TODOS' ? `Evidencia: ${evidencia === 'CON' ? 'con foto' : 'sin foto'}` : undefined

    exportarPDF({
      titulo,
      columnaInsumo,
      registros: seleccionFinal,
      filtroMes: notaMeses,
      busqueda: notaEvidencia,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card exportar-pdf-card" onClick={(e) => e.stopPropagation()}>
        <h2>Exportar PDF</h2>

        <div className="exportar-opciones">
          <label className="exportar-radio">
            <input type="radio" checked={alcance === 'filtros'} onChange={() => setAlcance('filtros')} />
            Usar lo que estoy viendo ahora ({filtrados.length} registro(s))
          </label>

          <label className="exportar-radio">
            <input type="radio" checked={alcance === 'todos'} onChange={() => setAlcance('todos')} />
            Todos los registros ({todos.length})
          </label>

          <label className="exportar-radio">
            <input type="radio" checked={alcance === 'meses'} onChange={() => setAlcance('meses')} />
            Elegir meses específicos
          </label>

          {alcance === 'meses' && (
            <div className="exportar-meses">
              {MESES.map((m) => (
                <label key={m} className="exportar-mes-chip">
                  <input type="checkbox" checked={mesesElegidos.includes(m)} onChange={() => toggleMes(m)} />
                  {m}
                </label>
              ))}
            </div>
          )}

          {alcance !== 'filtros' && (
            <label className="exportar-campo">
              Evidencia
              <select value={evidencia} onChange={(e) => setEvidencia(e.target.value as Evidencia)}>
                <option value="TODOS">Con o sin evidencia</option>
                <option value="CON">Solo con evidencia</option>
                <option value="SIN">Solo sin evidencia</option>
              </select>
            </label>
          )}
        </div>

        <p className="exportar-resumen">Se exportarán {seleccionFinal.length} registro(s).</p>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={generar} disabled={seleccionFinal.length === 0}>
            Generar PDF
          </button>
        </div>
      </div>
    </div>
  )
}
