import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import './Layout.css'

export default function Layout() {
  const { logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Solicitudes JDZ</h1>
          <span>Insumos y Hallazgos BPM / SST</span>
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
      </nav>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
