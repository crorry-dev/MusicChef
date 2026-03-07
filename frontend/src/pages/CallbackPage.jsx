import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeCode } from '../lib/spotify-pkce'

const BASE = import.meta.env.BASE_URL

export default function CallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const authError = params.get('error')

    if (authError) {
      setError(`Spotify-Fehler: ${authError}`)
      return
    }

    if (!code) {
      setError('Kein Autorisierungscode erhalten.')
      return
    }

    exchangeCode(code)
      .then(() => {
        window.location.replace(BASE)
      })
      .catch((err) => {
        setError(err.message || 'Anmeldung fehlgeschlagen.')
      })
  }, [navigate])

  if (error) {
    return (
      <div className="spinner-fullpage">
        <div style={{ textAlign: 'center', maxWidth: '420px', padding: '0 1.25rem' }}>
          <div className="error-box" style={{ marginBottom: '1.5rem' }}>
            ⚠️ {error}
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/', { replace: true })}>
            Zurück zum Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="spinner-fullpage">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p className="text-muted">Anmeldung wird abgeschlossen…</p>
      </div>
    </div>
  )
}
