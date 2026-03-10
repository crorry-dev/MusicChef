import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getClientId } from '../lib/spotify-pkce'
import { getQuizHistory, clearQuizHistory } from '../lib/quiz-engine'
import Navbar from '../components/Navbar'
import {
  User, Settings, Globe, CheckCircle, LogOut, Heart,
  Moon, Sun, Monitor, AlertTriangle, ExternalLink, Trash2,
} from '../lib/icons'

export default function SettingsPage() {
  const { user, logout, updateClientId, resetSetup } = useAuth()
  const { preference, setTheme } = useTheme()
  const navigate = useNavigate()

  const [clientIdInput, setClientIdInput] = useState(getClientId() ?? '')
  const [clientIdSaved, setClientIdSaved] = useState(false)
  const [clientIdError, setClientIdError] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmClearHistory, setConfirmClearHistory] = useState(false)

  const historyCount = getQuizHistory().length

  const handleSaveClientId = useCallback(() => {
    const id = clientIdInput.trim()
    if (!id || id.length < 10) {
      setClientIdError('Bitte gib eine gültige Client ID ein (min. 10 Zeichen).')
      return
    }
    setClientIdError(null)
    updateClientId(id)
    setClientIdSaved(true)
    setTimeout(() => setClientIdSaved(false), 2500)
  }, [clientIdInput, updateClientId])

  const handleReset = useCallback(() => {
    resetSetup()
    navigate('/setup', { replace: true })
  }, [resetSetup, navigate])

  const handleClearHistory = useCallback(() => {
    clearQuizHistory()
    setConfirmClearHistory(false)
  }, [])

  return (
    <div className="home-page">
      <Navbar user={user} onLogout={logout} />

      <div className="container home-container" style={{ maxWidth: '640px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
          <Settings size={22} /> Einstellungen
        </h1>

        {/* ── Profil ──────────────────────────────────────── */}
        <section className="settings-card">
          <p className="section-title"><User size={16} /> Profil</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            {user?.image ? (
              <img
                src={user.image}
                alt={user.display_name}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--accent-dim)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', fontWeight: 700,
              }}>
                {user?.display_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-bright)' }}>
                {user?.display_name || 'Unbekannt'}
              </div>
              {user?.email && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.email}</div>
              )}
              {user?.country && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  <Globe size={12} style={{ verticalAlign: 'middle' }} /> Markt: {user.country}
                </div>
              )}
            </div>
          </div>

          {/* Status badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="sp-dropdown-status">
              <CheckCircle size={14} />
              <span>Login</span>
              <span className="sp-status-badge sp-status-ok">Verbunden</span>
            </div>
            <div className="sp-dropdown-status">
              <Globe size={14} />
              <span>API-Modus</span>
              <span className="sp-status-badge sp-status-warn">Development</span>
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <a
              href={`https://open.spotify.com/user/${user?.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.82rem' }}
            >
              <ExternalLink size={14} /> Spotify-Profil öffnen
            </a>
          </div>
        </section>

        {/* ── Client ID ───────────────────────────────────── */}
        <section className="settings-card">
          <p className="section-title"><Settings size={16} /> Spotify Client ID</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Die Client ID verbindet MusicChef mit deiner Spotify Developer App.
            Du kannst sie hier jederzeit ändern.
          </p>
          {clientIdError && (
            <div className="error-box" style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              <AlertTriangle size={14} /> {clientIdError}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
            <input
              className="input"
              type="text"
              value={clientIdInput}
              onChange={(e) => { setClientIdInput(e.target.value); setClientIdError(null); setClientIdSaved(false) }}
              placeholder="z.B. a1b2c3d4e5f6..."
              autoComplete="off"
              spellCheck={false}
              style={{ fontFamily: 'monospace', flex: 1, fontSize: '0.88rem' }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSaveClientId}
              style={{ whiteSpace: 'nowrap' }}
            >
              {clientIdSaved ? <><CheckCircle size={14} /> Gespeichert</> : 'Speichern'}
            </button>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Wird nur lokal in deinem Browser gespeichert. Kein Client Secret nötig.
          </p>
          <div style={{ marginTop: '0.75rem' }}>
            <a
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.82rem' }}
            >
              <ExternalLink size={14} /> Spotify Developer Dashboard
            </a>
          </div>
        </section>

        {/* ── Design ──────────────────────────────────────── */}
        <section className="settings-card">
          <p className="section-title"><Moon size={16} /> Design</p>
          <div className="sp-theme-switcher" style={{ justifyContent: 'flex-start' }}>
            <button
              className={`sp-theme-btn ${preference === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <Moon size={14} /> Dunkel
            </button>
            <button
              className={`sp-theme-btn ${preference === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <Sun size={14} /> Hell
            </button>
            <button
              className={`sp-theme-btn ${preference === 'system' ? 'active' : ''}`}
              onClick={() => setTheme('system')}
            >
              <Monitor size={14} /> System
            </button>
          </div>
        </section>

        {/* ── Daten ───────────────────────────────────────── */}
        <section className="settings-card">
          <p className="section-title"><Trash2 size={16} /> Daten</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Quiz-Verlauf</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {historyCount} {historyCount === 1 ? 'Quiz' : 'Quizze'} gespeichert
              </div>
            </div>
            {!confirmClearHistory ? (
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--error)', fontSize: '0.82rem' }}
                onClick={() => setConfirmClearHistory(true)}
                disabled={historyCount === 0}
              >
                <Trash2 size={14} /> Löschen
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClearHistory(false)}>
                  Abbrechen
                </button>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--error)', color: '#fff' }}
                  onClick={handleClearHistory}
                >
                  Endgültig löschen
                </button>
              </div>
            )}
          </div>

          <div className="sp-dropdown-divider" style={{ margin: '0.75rem 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Komplett zurücksetzen</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Client ID, Login und alle lokalen Daten löschen
              </div>
            </div>
            {!confirmReset ? (
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--error)', fontSize: '0.82rem' }}
                onClick={() => setConfirmReset(true)}
              >
                Zurücksetzen
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(false)}>
                  Abbrechen
                </button>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--error)', color: '#fff' }}
                  onClick={handleReset}
                >
                  Ja, alles löschen
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── Spenden ─────────────────────────────────────── */}
        <section className="settings-card" style={{
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--accent-dim) 100%)',
        }}>
          <p className="section-title"><Heart size={16} /> Unterstützen</p>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.6 }}>
            MusicChef ist kostenlos und Open Source. Wenn dir die App gefällt,
            kannst du das Projekt mit einem kleinen Beitrag unterstützen.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/donate')}
          >
            <Heart size={16} /> Zur Spendenseite
          </button>
        </section>

        {/* ── Session Actions ─────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem', marginBottom: '2rem' }}>
          <button
            className="btn btn-ghost"
            style={{ color: 'var(--error)' }}
            onClick={logout}
          >
            <LogOut size={16} /> Abmelden
          </button>
        </div>
      </div>
    </div>
  )
}
