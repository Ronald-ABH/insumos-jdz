import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import d1Logo from '../assets/brand/d1-logo.png'
import './Layout.css'

/* Íconos de línea simples (16px, heredan el color vía currentColor)
   para que el nav se escanee más rápido de un vistazo. */
const IconoInsumos = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8 12 3 3 8l9 5 9-5Z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </svg>
)

const IconoHallazgos = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11.5 11 13.5 15.5 9" />
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M8 2v3M16 2v3" />
  </svg>
)

const IconoEtiquetas = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.59 2.59 20 10v.01M20 10 10 20l-8-8 10-10h8v.01" />
    <circle cx="15.5" cy="8.5" r="1.5" />
  </svg>
)

const IconoConfiguracion = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
)

export default function Layout() {
  const { logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-brand">
          <img src={d1Logo} alt="D1" className="app-logo" />
          <div>
            <h1>Insumos</h1>
            <span>JDZ y Hallazgos BPM / SST</span>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          Salir
        </button>
      </header>

      <nav className="app-nav">
        <NavLink to="/insumos" className={({ isActive }) => (isActive ? 'active' : '')}>
          <IconoInsumos />
          Insumos
        </NavLink>
        <NavLink to="/hallazgos" className={({ isActive }) => (isActive ? 'active' : '')}>
          <IconoHallazgos />
          Hallazgos BPM / SST
        </NavLink>
        <NavLink to="/etiquetas" className={({ isActive }) => (isActive ? 'active' : '')}>
          <IconoEtiquetas />
          Etiquetas
        </NavLink>
        <NavLink to="/configuracion" className={({ isActive }) => (isActive ? 'active' : '')}>
          <IconoConfiguracion />
          Configuración
        </NavLink>
      </nav>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
