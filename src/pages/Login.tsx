import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/AuthContext'
import d1Logo from '../assets/brand/d1-logo.png'
import './Login.css'

export default function Login() {
  const { login } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const ok = login(password)
    if (!ok) {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <img src={d1Logo} alt="D1" className="login-logo" />
        <h1>Solicitudes JDZ</h1>
        <p className="login-subtitle">Insumos y Hallazgos BPM / SST</p>

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError(false)
          }}
          autoFocus
          placeholder="Ingresa la contraseña"
        />

        {error && <p className="login-error">Contraseña incorrecta</p>}

        <button type="submit">Entrar</button>
      </form>
    </div>
  )
}
