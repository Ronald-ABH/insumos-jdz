import { useEffect, useMemo, useState } from 'react'
import { listRegistros, listarTiendas } from '../lib/api'
import type { Registro, Tienda } from '../types/registro'
import { MESES } from '../lib/constants'
import './Etiquetas.css'

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function Etiquetas() {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [tiendas, setTiendas] = useState<Tienda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroMes, setFiltroMes] = useState('TODOS')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [vista, setVista] = useState<'elegir' | 'imprimir'>('elegir')

  useEffect(() => {
    Promise.all([listRegistros('insumos'), listarTiendas()])
      .then(([regs, tds]) => {
        setRegistros(regs)
        setTiendas(tds)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos.'))
      .finally(() => setLoading(false))
  }, [])

  const tiendaPorNombre = useMemo(() => {
    const mapa = new Map<string, Tienda>()
    tiendas.forEach((t) => mapa.set(normalizar(t.nombre), t))
    return mapa
  }, [tiendas])

  const datosEtiqueta = (r: Registro) => {
    const t = tiendaPorNombre.get(normalizar(r.tienda))
    return {
      tienda: r.tienda,
      departamento: t?.departamento ?? null,
      jdz: t?.jdz ?? null,
      insumo: r.insumo,
      fecha: r.fecha_envio,
    }
  }

  const filtrados = useMemo(() => {
    const texto = normalizar(busqueda)
    return registros.filter((r) => {
      const coincideMes = filtroMes === 'TODOS' || r.mes === filtroMes
      const coincideTexto =
        !texto || normalizar(r.tienda).includes(texto) || normalizar(r.insumo).includes(texto)
      return coincideMes && coincideTexto
    })
  }, [registros, filtroMes, busqueda])

  const toggle = (id: string) => {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })
  }

  const toggleTodos = () => {
    setSeleccionados((prev) => {
      if (filtrados.every((r) => prev.has(r.id))) {
        const nuevo = new Set(prev)
        filtrados.forEach((r) => nuevo.delete(r.id))
        return nuevo
      }
      const nuevo = new Set(prev)
      filtrados.forEach((r) => nuevo.add(r.id))
      return nuevo
    })
  }

  const etiquetasAImprimir = useMemo(
    () => registros.filter((r) => seleccionados.has(r.id)).map(datosEtiqueta),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registros, seleccionados, tiendaPorNombre]
  )

  if (loading) return <p className="registros-msg">Cargando...</p>
  if (error) return <p className="registros-msg error">{error}</p>

  if (vista === 'imprimir') {
    return (
      <div className="etiquetas-imprimir">
        <div className="etiquetas-barra no-imprimir">
          <button className="btn-secondary" onClick={() => setVista('elegir')}>
            ← Volver a elegir
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            Imprimir
          </button>
        </div>
        <div className="etiquetas-grid">
          {etiquetasAImprimir.map((e, i) => (
            <div className="etiqueta" key={i}>
              <div className="etiqueta-tienda">
                {e.tienda}
                {e.departamento && <span className="etiqueta-depto"> ({e.departamento})</span>}
              </div>
              <div className="etiqueta-jdz">{e.jdz ?? '—'}</div>
              <div className="etiqueta-insumo">{e.insumo}</div>
              <div className="etiqueta-fecha">{e.fecha ?? '—'}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="etiquetas-page">
      <div className="registros-toolbar">
        <div>
          <h2>Etiquetas de envío</h2>
          <span className="registros-count">
            {seleccionados.size} seleccionado(s) de {filtrados.length}
          </span>
        </div>
        <div className="registros-toolbar-acciones">
          <button
            className="btn-primary"
            disabled={seleccionados.size === 0}
            onClick={() => setVista('imprimir')}
          >
            Generar {seleccionados.size > 0 ? `(${seleccionados.size})` : ''} etiquetas
          </button>
        </div>
      </div>

      <div className="registros-filtros">
        <input
          type="text"
          placeholder="Buscar por tienda o insumo..."
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

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={filtrados.length > 0 && filtrados.every((r) => seleccionados.has(r.id))}
                  onChange={toggleTodos}
                />
              </th>
              <th>Mes</th>
              <th>Tienda</th>
              <th>Departamento</th>
              <th>Jefe de Zona</th>
              <th>Insumo</th>
              <th>Fecha de envío</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="registros-empty">
                  No hay registros de Insumos todavía.
                </td>
              </tr>
            )}
            {filtrados.map((r) => {
              const t = tiendaPorNombre.get(normalizar(r.tienda))
              return (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={seleccionados.has(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                  </td>
                  <td>{r.mes}</td>
                  <td>{r.tienda}</td>
                  <td>{t?.departamento ?? '—'}</td>
                  <td>{t?.jdz ?? '—'}</td>
                  <td>{r.insumo}</td>
                  <td>{r.fecha_envio ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
