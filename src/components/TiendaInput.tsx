import { useEffect, useMemo, useRef, useState } from 'react'
import { crearTienda, listarTiendas } from '../lib/api'
import type { Tienda } from '../types/registro'
import './TiendaInput.css'

interface Props {
  value: string
  onChange: (nombre: string) => void
  onSeleccionarTienda?: (tienda: Tienda) => void
}

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function TiendaInput({ value, onChange, onSeleccionarTienda }: Props) {
  const [tiendas, setTiendas] = useState<Tienda[]>([])
  const [abierto, setAbierto] = useState(false)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [nuevoCeco, setNuevoCeco] = useState('')
  const [nuevoDepartamento, setNuevoDepartamento] = useState('')
  const [nuevoJdz, setNuevoJdz] = useState('')
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listarTiendas()
      .then(setTiendas)
      .catch(() => {
        // Si falla la carga del catálogo, el campo sigue funcionando como texto libre.
      })
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
        setFormularioAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const coincidencias = useMemo(() => {
    const q = normalizar(value)
    if (!q) return tiendas.slice(0, 8)
    return tiendas.filter((t) => normalizar(t.nombre).includes(q)).slice(0, 8)
  }, [value, tiendas])

  const existeExacta = useMemo(
    () => tiendas.some((t) => normalizar(t.nombre) === normalizar(value)),
    [tiendas, value]
  )

  const seleccionar = (tienda: Tienda) => {
    onChange(tienda.nombre)
    onSeleccionarTienda?.(tienda)
    setAbierto(false)
    setFormularioAbierto(false)
  }

  const abrirFormulario = () => {
    setError(null)
    setNuevoCeco('')
    setNuevoDepartamento('')
    setNuevoJdz('')
    setFormularioAbierto(true)
  }

  const cancelarFormulario = () => {
    setFormularioAbierto(false)
    setError(null)
  }

  const guardarNueva = async () => {
    const nombre = value.trim()
    if (!nombre) return
    setCreando(true)
    setError(null)
    try {
      const nueva = await crearTienda(
        nombre.toUpperCase(),
        nuevoCeco.trim() || null,
        nuevoDepartamento.trim() || null,
        nuevoJdz.trim() || null
      )
      setTiendas((prev) => [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      onChange(nueva.nombre)
      onSeleccionarTienda?.(nueva)
      setAbierto(false)
      setFormularioAbierto(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar la tienda.')
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="tienda-input" ref={contenedorRef}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setAbierto(true)
          setFormularioAbierto(false)
        }}
        onFocus={() => setAbierto(true)}
        placeholder="Escribe para buscar la tienda..."
        autoComplete="off"
      />
      {abierto && (coincidencias.length > 0 || value.trim()) && (
        <div className="tienda-sugerencias">
          {!formularioAbierto &&
            coincidencias.map((t) => (
              <button
                type="button"
                key={t.id}
                className="tienda-opcion"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => seleccionar(t)}
              >
                <span className="tienda-nombre">{t.nombre}</span>
                {t.ceco && <span className="tienda-ceco">{t.ceco}</span>}
              </button>
            ))}

          {value.trim() && !existeExacta && !formularioAbierto && (
            <button
              type="button"
              className="tienda-opcion tienda-agregar"
              onMouseDown={(e) => e.preventDefault()}
              onClick={abrirFormulario}
            >
              {`+ Agregar tienda "${value.trim().toUpperCase()}"`}
            </button>
          )}

          {value.trim() && !existeExacta && formularioAbierto && (
            <div className="tienda-form-nueva" onMouseDown={(e) => e.preventDefault()}>
              <p className="tienda-form-titulo">
                Nueva tienda: <strong>{value.trim().toUpperCase()}</strong>
              </p>
              <label>
                Jefe de zona
                <input
                  value={nuevoJdz}
                  onChange={(e) => setNuevoJdz(e.target.value)}
                  placeholder="Nombre del jefe de zona"
                  autoComplete="off"
                />
              </label>
              <label>
                Departamento (para la etiqueta)
                <input
                  value={nuevoDepartamento}
                  onChange={(e) => setNuevoDepartamento(e.target.value)}
                  placeholder="Ej: TOLIMA"
                  autoComplete="off"
                />
              </label>
              <label>
                CECO <span className="opcional-inline">(opcional)</span>
                <input
                  value={nuevoCeco}
                  onChange={(e) => setNuevoCeco(e.target.value)}
                  placeholder="Código de la tienda"
                  autoComplete="off"
                />
              </label>
              <div className="tienda-form-acciones">
                <button type="button" className="tienda-form-cancelar" onClick={cancelarFormulario} disabled={creando}>
                  Cancelar
                </button>
                <button type="button" className="tienda-form-guardar" onClick={guardarNueva} disabled={creando}>
                  {creando ? 'Guardando...' : 'Guardar tienda'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {error && <p className="tienda-error">{error}</p>}
    </div>
  )
}
