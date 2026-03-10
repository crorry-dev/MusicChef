import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import {
  Heart, Coffee, Star, ExternalLink, Zap, Globe,
} from '../lib/icons'

const PRESETS = [
  { amount: 1, label: 'Kaffee', icon: Coffee, color: '#a0522d' },
  { amount: 3, label: 'Snack', icon: Heart, color: 'var(--error)' },
  { amount: 5, label: 'Supporter', icon: Star, color: '#ffd93d' },
  { amount: 10, label: 'Held', icon: Zap, color: 'var(--accent)' },
]

export default function DonatePage() {
  const { user, logout } = useAuth()
  const [customAmount, setCustomAmount] = useState('')

  const customLink = customAmount.trim()
    ? `https://paypal.me/tobcro/${encodeURIComponent(customAmount.trim())}`
    : 'https://paypal.me/tobcro'

  return (
    <div className="home-page">
      <Navbar user={user} onLogout={logout} />

      <div className="container home-container" style={{ maxWidth: '640px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-dim), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <Heart size={32} style={{ color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            MusicChef unterstützen
          </h1>
          <p className="text-muted" style={{ lineHeight: 1.7, maxWidth: '480px', margin: '0 auto' }}>
            MusicChef ist kostenlos, Open Source und werbefrei.
            Aber der Betrieb kostet Geld – Hosting, API-Zugriff und Entwicklungszeit.
          </p>
        </div>

        {/* Warum */}
        <section className="settings-card">
          <p className="section-title" style={{ marginBottom: '0.75rem' }}>Warum spenden?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { icon: Globe, text: 'Hosting & Domain für die Live-App' },
              { icon: Zap, text: 'Spotify API-Zugriff und Infrastruktur' },
              { icon: Coffee, text: 'Hunderte Stunden Entwicklungsarbeit' },
              { icon: Star, text: 'Neue Features, Bugfixes & Wartung' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                fontSize: '0.9rem', color: 'var(--text)',
              }}>
                <Icon size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Presets */}
        <section className="settings-card" style={{
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--accent-dim) 100%)',
        }}>
          <p className="section-title" style={{ marginBottom: '1rem' }}>
            <Heart size={16} /> Betrag wählen
          </p>
          <div className="donate-options" style={{ marginBottom: '1.25rem' }}>
            {PRESETS.map(({ amount, label, icon: Icon, color }) => (
              <a
                key={amount}
                href={`https://paypal.me/tobcro/${amount}`}
                target="_blank"
                rel="noopener noreferrer"
                className="donate-chip"
              >
                <Icon size={16} style={{ color }} /> {amount} € {label}
              </a>
            ))}
          </div>

          {/* Freier Betrag */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Oder freien Betrag eingeben
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="z.B. 7"
                  style={{ paddingRight: '2rem', fontSize: '0.92rem' }}
                />
                <span style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', fontSize: '0.9rem', pointerEvents: 'none',
                }}>€</span>
              </div>
              <a
                href={customLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                Via PayPal spenden
              </a>
            </div>
          </div>
        </section>

        {/* Danke */}
        <section className="settings-card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
            Jeder Beitrag – egal wie klein – hilft enorm und motiviert,
            MusicChef weiterzuentwickeln. Danke!
          </p>
          <div style={{ marginTop: '1rem' }}>
            <a
              href="https://github.com/crorry-dev/MusicChef"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.82rem' }}
            >
              <ExternalLink size={14} /> Projekt auf GitHub
            </a>
          </div>
        </section>

        <div style={{ height: '2rem' }} />
      </div>
    </div>
  )
}
