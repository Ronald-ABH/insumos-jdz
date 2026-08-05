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
  }

  const agregarNueva = async () => {
    const nombre = value.trim()
    if (!nombre) return
    setCreando(true)
    setError(null)
    try {
      const nueva = await crearTienda(nombre.toUpperCase())
      setTiendas((prev) => [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      onChange(nueva.nombre)
      onSeleccionarTienda?.(nueva)
      setAbierto(false)
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
        }}
        onFocus={() => setAbierto(true)}
        placeholder="Escribe para buscar la tienda..."
        autoComplete="off"
      />
      {abierto && (coincidencias.length > 0 || value.trim()) && (
        <div className="tienda-sugerencias">
          {coincidencias.map((t) => (
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
          {value.trim() && !existeExacta && (
            <button
              type="button"
              className="tienda-opcion tienda-agregar"
              onMouseDown={(e) => e.preventDefault()}
              onClick={agregarNueva}
              disabled={creando}
            >
              {creando ? 'Agregando...' : `+ Agregar tienda "${value.trim().toUpperCase()}"`}
            </button>
          )}
        </div>
      )}
      {error && <p className="tienda-error">{error}</p>}
    </div>
  )
}
