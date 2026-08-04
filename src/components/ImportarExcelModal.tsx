import { useState } from 'react'
import { createRegistro, subirEvidenciaBlob, type TableName } from '../lib/api'
import { listarHojas, parsearHoja, type FilaImportada, type HojaExcel } from '../lib/excelImport'
import './ImportarExcelModal.css'

interface Props {
  table: TableName
  onClose: () => void
  onImportado: () => void
}

type Estado =
  | { paso: 'elegir-archivo' }
  | { paso: 'leyendo'; mensaje: string }
  | { paso: 'elegir-hoja'; buffer: ArrayBuffer; hojas: HojaExcel[] }
  | { paso: 'revisar'; buffer: ArrayBuffer; hojaPath: string; filas: FilaImportada[] }
  | { paso: 'importando'; total: number; hechos: number; errores: string[] }
  | { paso: 'listo'; total: number; errores: string[] }

export default function ImportarExcelModal({ table, onClose, onImportado }: Props) {
  const [estado, setEstado] = useState<Estado>({ paso: 'elegir-archivo' })
  const [error, setError] = useState<string | null>(null)

  const handleArchivo = async (file: File | null) => {
    if (!file) return
    setError(null)
    setEstado({ paso: 'leyendo', mensaje: 'Abriendo el archivo...' })
    try {
      const buffer = await file.arrayBuffer()
      const hojas = await listarHojas(buffer)
      if (hojas.length === 0) {
        setError('No se encontraron hojas en este archivo.')
        setEstado({ paso: 'elegir-archivo' })
        return
      }
      if (hojas.length === 1) {
        await elegirHoja(buffer, hojas[0].path)
      } else {
        setEstado({ paso: 'elegir-hoja', buffer, hojas })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo. ¿Es un .xlsx válido?')
      setEstado({ paso: 'elegir-archivo' })
    }
  }

  const elegirHoja = async (buffer: ArrayBuffer, hojaPath: string) => {
    setError(null)
    setEstado({ paso: 'leyendo', mensaje: 'Leyendo la hoja...' })
    try {
      const filas = await parsearHoja(buffer, hojaPath, (mensaje) =>
        setEstado({ paso: 'leyendo', mensaje })
      )
      if (filas.length === 0) {
        setError('No se encontraron filas de datos en esa hoja (revisa que tenga columnas como Mes, Tienda, Insumo).')
        setEstado({ paso: 'elegir-archivo' })
        return
      }
      setEstado({ paso: 'revisar', buffer, hojaPath, filas })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la hoja seleccionada.')
      setEstado({ paso: 'elegir-archivo' })
    }
  }

  const importar = async (filas: FilaImportada[]) => {
    setEstado({ paso: 'importando', total: filas.length, hechos: 0, errores: [] })
    const errores: string[] = []
    let hechos = 0

    for (const fila of filas) {
      try {
        let evidencia_url: string | null = null
        if (fila.imagen) {
          evidencia_url = await subirEvidenciaBlob(fila.imagen.blob, fila.imagen.extension)
        }
        await createRegistro(table, {
          mes: fila.mes,
          ceco: fila.ceco,
          tienda: fila.tienda,
          cantidad: fila.cantidad,
          insumo: fila.insumo,
          fecha_envio: fila.fecha_envio,
          evidencia_url,
        })
      } catch (err) {
        errores.push(
          `Fila ${fila.filaExcel} (${fila.tienda}): ${err instanceof Error ? err.message : 'error desconocido'}`
        )
      }
      hechos += 1
      setEstado({ paso: 'importando', total: filas.length, hechos, errores })
    }

    setEstado({ paso: 'listo', total: filas.length, errores })
    onImportado()
  }

  const bloqueado = estado.paso === 'importando' || estado.paso === 'leyendo'

  return (
    <div className="modal-backdrop" onClick={bloqueado ? undefined : onClose}>
      <div className="modal-card importar-card" onClick={(e) => e.stopPropagation()}>
        <h2>Importar desde Excel</h2>

        {estado.paso === 'elegir-archivo' && (
          <>
            <p className="importar-texto">
              Selecciona el archivo .xlsx. Voy a buscar automáticamente las columnas de Mes, CECO,
              Tienda, Cantidad, Insumo, Fecha de envío, y también las fotos de evidencia (tanto las
              pegadas como las insertadas "en la celda"). Si el archivo es muy pesado (varios cientos
              de MB por las fotos), puede tardar uno o dos minutos — no cierres la ventana.
            </p>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => handleArchivo(e.target.files?.[0] ?? null)}
            />
          </>
        )}

        {estado.paso === 'leyendo' && (
          <>
            <p className="importar-texto">{estado.mensaje}</p>
            <div className="importar-barra">
              <div className="importar-barra-relleno importar-barra-indeterminada" />
            </div>
          </>
        )}

        {estado.paso === 'elegir-hoja' && (
          <>
            <p className="importar-texto">Este archivo tiene varias hojas. ¿Cuál quieres importar?</p>
            <div className="importar-hojas">
              {estado.hojas.map((h) => (
                <button
                  key={h.path}
                  className="btn-secondary"
                  onClick={() => elegirHoja(estado.buffer, h.path)}
                >
                  {h.nombre}
                </button>
              ))}
            </div>
          </>
        )}

        {estado.paso === 'revisar' && (
          <>
            <p className="importar-texto">
              Encontré <strong>{estado.filas.length}</strong> fila(s), de las cuales{' '}
              <strong>{estado.filas.filter((f) => f.imagen).length}</strong> tienen foto de
              evidencia. Revisa un vistazo rápido antes de importar:
            </p>
            <div className="importar-preview">
              <table>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>CECO</th>
                    <th>Tienda</th>
                    <th>Cant.</th>
                    <th>Insumo</th>
                    <th>Fecha</th>
                    <th>Foto</th>
                  </tr>
                </thead>
                <tbody>
                  {estado.filas.slice(0, 8).map((f) => (
                    <tr key={f.filaExcel}>
                      <td>{f.mes}</td>
                      <td>{f.ceco ?? '—'}</td>
                      <td>{f.tienda}</td>
                      <td>{f.cantidad}</td>
                      <td>{f.insumo}</td>
                      <td>{f.fecha_envio ?? '—'}</td>
                      <td>{f.imagen ? '📷' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {estado.filas.length > 8 && (
                <p className="importar-mas">...y {estado.filas.length - 8} fila(s) más.</p>
              )}
            </div>
          </>
        )}

        {estado.paso === 'importando' && (
          <>
            <p className="importar-texto">
              Importando {estado.hechos} de {estado.total}...
            </p>
            <div className="importar-barra">
              <div
                className="importar-barra-relleno"
                style={{ width: `${(estado.hechos / estado.total) * 100}%` }}
              />
            </div>
          </>
        )}

        {estado.paso === 'listo' && (
          <>
            <p className="importar-texto">
              Listo: se importaron <strong>{estado.total - estado.errores.length}</strong> de{' '}
              {estado.total} registro(s).
            </p>
            {estado.errores.length > 0 && (
              <div className="importar-errores">
                <p>Estos no se pudieron importar:</p>
                <ul>
                  {estado.errores.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          {estado.paso !== 'importando' && estado.paso !== 'listo' && estado.paso !== 'leyendo' && (
            <button className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
          )}
          {estado.paso === 'revisar' && (
            <button className="btn-primary" onClick={() => importar(estado.filas)}>
              Importar {estado.filas.length} registro(s)
            </button>
          )}
          {estado.paso === 'listo' && (
            <button className="btn-primary" onClick={onClose}>
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
