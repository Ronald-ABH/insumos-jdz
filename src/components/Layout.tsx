import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import d1Logo from '../assets/brand/d1-logo.png'
import './Layout.css'

export default function Layout() {
  const { logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-brand">
          <img src={d1Logo} alt="D1" className="app-logo" />
          <div>
            <h1>Solicitudes JDZ</h1>
            <span>Insumos y Hallazgos BPM / SST</span>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          Salir
        </button>
      </header>

      <nav className="app-nav">
        <NavLink to="/insumos" className={({ isActive }) => (isActive ? 'active' : '')}>
          Insumos
        </NavLink>
        <NavLink to="/hallazgos" className={({ isActive }) => (isActive ? 'active' : '')}>
          Hallazgos BPM / SST
        </NavLink>
        <NavLink to="/etiquetas" className={({ isActive }) => (isActive ? 'active' : '')}>
          Etiquetas
        </NavLink>
        <NavLink to="/configuracion" className={({ isActive }) => (isActive ? 'active' : '')}>
          Configuración
        </NavLink>
      </nav>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
