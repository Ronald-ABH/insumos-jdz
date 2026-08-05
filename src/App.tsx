import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import Login from './pages/Login'
import Layout from './components/Layout'
import Insumos from './pages/Insumos'
import Hallazgos from './pages/Hallazgos'
import Etiquetas from './pages/Etiquetas'
import Configuracion from './pages/Configuracion'

function App() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/insumos" replace />} />
        <Route path="/insumos" element={<Insumos />} />
        <Route path="/hallazgos" element={<Hallazgos />} />
        <Route path="/etiquetas" element={<Etiquetas />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="*" element={<Navigate to="/insumos" replace />} />
      </Route>
    </Routes>
  )
}

export default App
