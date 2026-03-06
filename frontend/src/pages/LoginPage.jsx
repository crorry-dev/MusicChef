import React from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">🎵</div>
        <h1 className="login-title gradient-text">MusicChef</h1>
        <p className="login-tagline">
          Lerne Musik kennen – spielerisch und unterhaltsam
        </p>

        <div className="feature-grid">
          <div className="feature-card">
            <span className="feature-icon">🎸</span>
            <span className="feature-label">Genres</span>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🏆</span>
            <span className="feature-label">Scoring</span>
          </div>
          <div className="feature-card">
            <span className="feature-icon">📊</span>
            <span className="feature-label">Verlauf</span>
          </div>
        </div>

        <button className="spotify-btn" onClick={login}>
          <span className="spotify-logo">🎧</span>
          Mit Spotify anmelden
        </button>

        <p style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Wir benötigen Zugriff auf dein Spotify-Konto,<br />
          um personalisierte Quizzes zu erstellen.
        </p>
      </div>
    </div>
  )
}
