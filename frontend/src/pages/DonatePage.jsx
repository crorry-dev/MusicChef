import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../context/LanguageContext'
import Navbar from '../components/Navbar'
import {
  Heart, Coffee, Star, ExternalLink, Zap, Globe, Info,
} from '../lib/icons'

const PRESETS = [
  { amount: 1, labelKey: 'donate.coffee', icon: Coffee, color: '#a0522d' },
  { amount: 3, labelKey: 'donate.snack', icon: Heart, color: 'var(--error)' },
  { amount: 5, labelKey: 'donate.supporter', icon: Star, color: '#ffd93d' },
  { amount: 10, labelKey: 'donate.hero', icon: Zap, color: 'var(--accent)' },
]

export default function DonatePage() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
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
            {t('donate.title')}
          </h1>
          <p className="text-muted" style={{ lineHeight: 1.7, maxWidth: '480px', margin: '0 auto' }}>
            {t('donate.subtitle')}
          </p>
        </div>

        {/* Optional-Hinweis */}
        <div className="settings-card" style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          background: 'var(--surface2)', border: '1px solid var(--border)',
        }}>
          <Info size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '0.1rem' }} />
          <p style={{ fontSize: '0.88rem', lineHeight: 1.7, margin: 0, color: 'var(--text)' }}>
            <strong>{t('donate.optionalNotice')}</strong> {t('donate.optionalDetail')}
          </p>
        </div>

        {/* Warum */}
        <section className="settings-card">
          <p className="section-title" style={{ marginBottom: '0.75rem' }}>{t('donate.whyTitle')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { icon: Globe, text: t('donate.reason1') },
              { icon: Zap, text: t('donate.reason2') },
              { icon: Coffee, text: t('donate.reason3') },
              { icon: Star, text: t('donate.reason4') },
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
            <Heart size={16} /> {t('donate.chooseAmount')}
          </p>
          <div className="donate-options" style={{ marginBottom: '1.25rem' }}>
            {PRESETS.map(({ amount, labelKey, icon: Icon, color }) => (
              <a
                key={amount}
                href={`https://paypal.me/tobcro/${amount}`}
                target="_blank"
                rel="noopener noreferrer"
                className="donate-chip"
              >
                <Icon size={16} style={{ color }} /> {amount} € {t(labelKey)}
              </a>
            ))}
          </div>

          {/* Freier Betrag */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              {t('donate.customLabel')}
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
                  placeholder={t('donate.customPlaceholder')}
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
                {t('donate.paypal')}
              </a>
            </div>
          </div>
        </section>

        {/* Danke + GitHub Star */}
        <section className="settings-card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
            {t('donate.thanks')}
          </p>
          <div style={{
            marginTop: '1.25rem', padding: '1rem', borderRadius: 'var(--radius-sm)',
            background: 'var(--surface2)', border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 0.75rem', color: 'var(--text)' }}>
              <Star size={16} style={{ color: '#ffd93d', verticalAlign: 'text-bottom' }} />{' '}
              <strong>{t('donate.noMoney')}</strong> {t('donate.starDesc')}
            </p>
            <a
              href="https://github.com/crorry-dev/MusicChef"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
            >
              <Star size={14} /> {t('donate.starButton')}
            </a>
          </div>
        </section>

        <div style={{ height: '2rem' }} />
      </div>
    </div>
  )
}
