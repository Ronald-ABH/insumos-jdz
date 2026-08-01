import { useEffect, useMemo, useState } from 'react'
import {
  type TableName,
  createRegistro,
  deleteRegistro,
  listRegistros,
  updateRegistro,
} from '../lib/api'
import { supabase } from '../lib/supabaseClient'
import type { NuevoRegistro, Registro } from '../types/registro'
import { MESES } from '../lib/constants'
import { exportarPDF } from '../lib/pdf'
import RegistroModal from './RegistroModal'
import './RegistrosTable.css'

interface Props {
  table: TableName
  title: string
  columnaInsumo: string
}

export default function RegistrosTable({ table, title, columnaInsumo }: Props) {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Registro | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroMes, setFiltroMes] = useState('TODOS')

  const cargar = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listRegistros(table)
      setRegistros(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table])

  // Sincronización en tiempo real: refleja cambios hechos desde otros dispositivos
  useEffect(() => {
    const canal = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const nuevo = payload.new as Registro
            setRegistros((prev) => (prev.some((r) => r.id === nuevo.id) ? prev : [nuevo, ...prev]))
          } else if (payload.eventType === 'UPDATE') {
            const actualizado = payload.new as Registro
            setRegistros((prev) => prev.map((r) => (r.id === actualizado.id ? actualizado : r)))
          } else if (payload.eventType === 'DELETE') {
            const eliminado = payload.old as Registro
            setRegistros((prev) => prev.filter((r) => r.id !== eliminado.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [table])

  const filtrados = useMemo(() => {
    return registros.filter((r) => {
      const coincideMes = filtroMes === 'TODOS' || r.mes === filtroMes
      const texto = busqueda.trim().toLowerCase()
      const coincideTexto =
        !texto ||
        (r.ceco ?? '').toLowerCase().includes(texto) ||
        r.tienda.toLowerCase().includes(texto) ||
        r.insumo.toLowerCase().includes(texto)
      return coincideMes && coincideTexto
    })
  }, [registros, filtroMes, busqueda])

  const handleNuevo = () => {
    setEditando(null)
    setModalAbierto(true)
  }

  const handleEditar = (r: Registro) => {
    setEditando(r)
    setModalAbierto(true)
  }

  const handleEliminar = async (r: Registro) => {
    const ok = confirm(`¿Eliminar el registro de "${r.insumo}" en ${r.tienda}?`)
    if (!ok) return
    try {
      await deleteRegistro(table, r.id)
      setRegistros((prev) => prev.filter((x) => x.id !== r.id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar.')
    }
  }

  const handleExportar = () => {
    exportarPDF({
      titulo: title,
      columnaInsumo,
      registros: filtrados,
      filtroMes,
      busqueda,
    })
  }

  const handleGuardar = async (data: NuevoRegistro) => {
    if (editando) {
      const actualizado = await updateRegistro(table, editando.id, data)
      setRegistros((prev) => prev.map((r) => (r.id === actualizado.id ? actualizado : r)))
    } else {
      const nuevo = await createRegistro(table, data)
      setRegistros((prev) => [nuevo, ...prev])
    }
    setModalAbierto(false)
    setEditando(null)
  }

  return (
    <div className="registros-table" id={`tabla-${table}`}>
      <div className="registros-toolbar">
        <div>
          <h2>{title}</h2>
          <span className="registros-count">{filtrados.length} registro(s)</span>
        </div>
        <div className="registros-toolbar-acciones">
          <button className="btn-secondary" onClick={handleExportar} disabled={filtrados.length === 0}>
            Exportar PDF
          </button>
          <button className="btn-primary" onClick={handleNuevo}>
            + Agregar
          </button>
        </div>
      </div>

      <div className="registros-filtros">
        <input
          type="text"
          placeholder="Buscar por CECO, tienda o insumo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}>
          <option value="TODOS">Todos los meses</option>
          {MESES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="registros-msg">Cargando...</p>}
      {error && <p className="registros-msg error">{error}</p>}

      {!loading && !error && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th>CECO</th>
                <th>Tienda</th>
                <th>Cantidad</th>
                <th>{columnaInsumo}</th>
                <th>Fecha de envío</th>
                <th>Evidencia</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="registros-empty">
                    No hay registros todavía. Da clic en "+ Agregar" para crear el primero.
                  </td>
                </tr>
              )}
              {filtrados.map((r) => (
                <tr key={r.id}>
                  <td>{r.mes}</td>
                  <td>{r.ceco ?? '—'}</td>
                  <td>{r.tienda}</td>
                  <td>{r.cantidad}</td>
                  <td>{r.insumo}</td>
                  <td>{r.fecha_envio ?? '—'}</td>
                  <td>
                    {r.evidencia_url ? (
                      <a href={r.evidencia_url} target="_blank" rel="noreferrer">
                        <img className="evidencia-thumb" src={r.evidencia_url} alt="Evidencia" />
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="registros-acciones">
                    <button className="link-btn" onClick={() => handleEditar(r)}>
                      Editar
                    </button>
                    <button className="link-btn danger" onClick={() => handleEliminar(r)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <RegistroModal
          registro={editando}
          onClose={() => {
            setModalAbierto(false)
            setEditando(null)
          }}
          onSave={handleGuardar}
        />
      )}
    </div>
  )
}
