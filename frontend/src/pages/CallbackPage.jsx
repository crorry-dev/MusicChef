import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeCode } from '../lib/spotify-pkce'
import { useTranslation } from '../context/LanguageContext'

const BASE = import.meta.env.BASE_URL

export default function CallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const { t } = useTranslation()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const authError = params.get('error')

    if (authError) {
      setError(`${t('callback.spotifyError')} ${authError}`)
      return
    }

    if (!code) {
      setError(t('callback.noCode'))
      return
    }

    exchangeCode(code)
      .then(() => {
        window.location.replace(BASE)
      })
      .catch((err) => {
        setError(err.message || t('callback.loginFailed'))
      })
  }, [navigate, t])

  if (error) {
    return (
      <div className="spinner-fullpage">
        <div style={{ textAlign: 'center', maxWidth: '420px', padding: '0 1.25rem' }}>
          <div className="error-box" style={{ marginBottom: '1.5rem' }}>
            ⚠️ {error}
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/', { replace: true })}>
            {t('callback.backToLogin')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="spinner-fullpage">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p className="text-muted">{t('callback.completing')}</p>
      </div>
    </div>
  )
}
