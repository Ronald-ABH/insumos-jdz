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
import { MESES, formatearFecha } from '../lib/constants'
import RegistroModal from './RegistroModal'
import ImportarExcelModal from './ImportarExcelModal'
import ExportarPDFModal from './ExportarPDFModal'
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
  const [importarAbierto, setImportarAbierto] = useState(false)
  const [exportarAbierto, setExportarAbierto] = useState(false)
  const [editando, setEditando] = useState<Registro | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroMes, setFiltroMes] = useState('TODOS')
  const [filtroEvidencia, setFiltroEvidencia] = useState('TODOS')

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
    const normalizar = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
    const texto = normalizar(busqueda)
    return registros.filter((r) => {
      const coincideMes = filtroMes === 'TODOS' || r.mes === filtroMes
      const coincideTexto =
        !texto ||
        normalizar(r.ceco ?? '').includes(texto) ||
        normalizar(r.tienda).includes(texto) ||
        normalizar(r.insumo).includes(texto)
      const coincideEvidencia =
        filtroEvidencia === 'TODOS' ||
        (filtroEvidencia === 'CON' && !!r.evidencia_url) ||
        (filtroEvidencia === 'SIN' && !r.evidencia_url)
      return coincideMes && coincideTexto && coincideEvidencia
    })
  }, [registros, filtroMes, busqueda, filtroEvidencia])

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
          <button className="btn-secondary" onClick={() => setImportarAbierto(true)}>
            Importar Excel
          </button>
          <button
            className="btn-secondary"
            onClick={() => setExportarAbierto(true)}
            disabled={registros.length === 0}
          >
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
        <select value={filtroEvidencia} onChange={(e) => setFiltroEvidencia(e.target.value)}>
          <option value="TODOS">Con o sin evidencia</option>
          <option value="CON">Con evidencia</option>
          <option value="SIN">Sin evidencia</option>
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
                  <td>{formatearFecha(r.fecha_envio)}</td>
                  <td>
                    {r.evidencia_url ? (
                      <a href={r.evidencia_url} target="_blank" rel="noreferrer">
                        <img className="evidencia-thumb" src={r.evidencia_url} alt="Evidencia" />
                      </a>
                    ) : (
                      <span className="badge badge-pendiente">Sin evidencia</span>
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

      {importarAbierto && (
        <ImportarExcelModal
          table={table}
          onClose={() => setImportarAbierto(false)}
          onImportado={cargar}
        />
      )}

      {exportarAbierto && (
        <ExportarPDFModal
          titulo={title}
          columnaInsumo={columnaInsumo}
          todos={registros}
          filtrados={filtrados}
          filtroMes={filtroMes}
          busqueda={busqueda}
          onClose={() => setExportarAbierto(false)}
        />
      )}
    </div>
  )
}
