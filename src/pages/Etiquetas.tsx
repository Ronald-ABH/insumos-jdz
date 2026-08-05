import { useEffect, useMemo, useState } from 'react'
import { listarTiendas } from '../lib/api'
import type { Tienda } from '../types/registro'
import './Etiquetas.css'

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function Etiquetas() {
  const [tiendas, setTiendas] = useState<Tienda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [insumo, setInsumo] = useState('')
  const [fecha, setFecha] = useState('')
  const [vista, setVista] = useState<'elegir' | 'imprimir'>('elegir')

  useEffect(() => {
    listarTiendas()
      .then((tds) => {
        setTiendas(tds)
        setSeleccionados(new Set(tds.map((t) => t.id)))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar las tiendas.'))
      .finally(() => setLoading(false))
  }, [])

  const filtradas = useMemo(() => {
    const texto = normalizar(busqueda)
    if (!texto) return tiendas
    return tiendas.filter(
      (t) =>
        normalizar(t.nombre).includes(texto) ||
        normalizar(t.departamento ?? '').includes(texto) ||
        normalizar(t.jdz ?? '').includes(texto)
    )
  }, [tiendas, busqueda])

  const toggle = (id: string) => {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })
  }

  const toggleTodas = () => {
    setSeleccionados((prev) => {
      if (filtradas.every((t) => prev.has(t.id))) {
        const nuevo = new Set(prev)
        filtradas.forEach((t) => nuevo.delete(t.id))
        return nuevo
      }
      const nuevo = new Set(prev)
      filtradas.forEach((t) => nuevo.add(t.id))
      return nuevo
    })
  }

  const tiendasAImprimir = useMemo(
    () => tiendas.filter((t) => seleccionados.has(t.id)).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [tiendas, seleccionados]
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
          {tiendasAImprimir.map((t) => (
            <div className="etiqueta" key={t.id}>
              <div className="etiqueta-tienda">{t.nombre}</div>
              {t.departamento && <div className="etiqueta-depto">{t.departamento}</div>}
              <div className="etiqueta-jdz">{t.jdz ?? '—'}</div>
              <div className="etiqueta-insumo">{insumo || '—'}</div>
              <div className="etiqueta-fecha">{fecha || '—'}</div>
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
            {seleccionados.size} tienda(s) seleccionada(s) de {tiendas.length}
          </span>
        </div>
        <div className="registros-toolbar-acciones">
          <button
            className="btn-primary"
            disabled={seleccionados.size === 0 || !insumo.trim()}
            onClick={() => setVista('imprimir')}
          >
            Generar {seleccionados.size > 0 ? `(${seleccionados.size})` : ''} etiquetas
          </button>
        </div>
      </div>

      <div className="etiquetas-lote">
        <label>
          Insumo / motivo del envío
          <input
            type="text"
            placeholder="Ej: ROTULO DE PRECIO AMARILLO PEQUEÑO"
            value={insumo}
            onChange={(e) => setInsumo(e.target.value)}
          />
        </label>
        <label>
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
      </div>
      {!insumo.trim() && (
        <p className="etiquetas-aviso">Escribe el insumo antes de generar las etiquetas.</p>
      )}

      <div className="registros-filtros">
        <input
          type="text"
          placeholder="Buscar por tienda, departamento o jefe de zona..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={filtradas.length > 0 && filtradas.every((t) => seleccionados.has(t.id))}
                  onChange={toggleTodas}
                />
              </th>
              <th>Tienda</th>
              <th>Departamento</th>
              <th>Jefe de Zona</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={4} className="registros-empty">
                  No hay tiendas que coincidan con la búsqueda.
                </td>
              </tr>
            )}
            {filtradas.map((t) => (
              <tr key={t.id}>
                <td>
                  <input type="checkbox" checked={seleccionados.has(t.id)} onChange={() => toggle(t.id)} />
                </td>
                <td>{t.nombre}</td>
                <td>{t.departamento ?? '—'}</td>
                <td>{t.jdz ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
