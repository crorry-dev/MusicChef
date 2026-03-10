import React, { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../context/LanguageContext'
import { Settings, Info, AlertTriangle } from '../lib/icons'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const { t } = useTranslation()

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  return (
    <button
      onClick={handleCopy}
      type="button"
      aria-label="Kopieren"
      style={{
        background: copied ? 'var(--accent-dim)' : 'var(--surface3)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        color: copied ? 'var(--accent)' : 'var(--text-muted)',
        fontSize: '0.78rem',
        fontWeight: 600,
        padding: '0.3rem 0.7rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? t('setup.copied') : t('setup.copy')}
    </button>
  )
}

function CodeBlock({ children }) {
  const text = typeof children === 'string' ? children : ''
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '0.4rem',
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '0.5rem 0.75rem',
      }}
    >
      <code
        style={{
          flex: 1,
          fontSize: '0.82rem',
          color: 'var(--accent)',
          wordBreak: 'break-all',
          userSelect: 'all',
        }}
      >
        {children}
      </code>
      <CopyButton text={text} />
    </div>
  )
}

function StepCard({ number, title, children }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.85rem',
        padding: '0.9rem 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'var(--accent-dim)',
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.85rem',
          fontWeight: 700,
        }}
      >
        {number}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            color: 'var(--text-bright)',
            fontSize: '0.92rem',
            marginBottom: '0.35rem',
          }}
        >
          {title}
        </div>
        <div style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.6 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function SetupPage() {
  const { updateClientId } = useAuth()
  const { t } = useTranslation()
  const [clientId, setClientId] = useState('')
  const [error, setError] = useState(null)

  const localCallback = 'http://127.0.0.1:5173/callback'
  const ghPagesCallback = 'https://crorry-dev.github.io/MusicChef/callback'

  const handleSubmit = (e) => {
    e.preventDefault()
    const id = clientId.trim()
    if (!id || id.length < 10) {
      setError(t('setup.error'))
      return
    }
    updateClientId(id)
  }

  return (
    <div className="login-page">
      <div className="login-box" style={{ maxWidth: '560px' }}>
        <div className="login-logo"><Settings size={40} /></div>
        <h1 className="login-title gradient-text">{t('setup.title')}</h1>
        <p className="login-tagline">
          {t('setup.tagline')}
        </p>

        <div style={{ textAlign: 'left', margin: '1.5rem 0 0.5rem' }}>
          <StepCard number="1" title={t('setup.step1title')}>
            <a
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: 600 }}
            >
              developer.spotify.com/dashboard →
            </a>
            <br />
            {t('setup.step1text')}
          </StepCard>

          <StepCard number="2" title={t('setup.step2title')}>
            {t('setup.step2text')}
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
                  App name:
                </span>
                <CodeBlock>MusicChef</CodeBlock>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
                  App description:
                </span>
                <CodeBlock>Musik-Quiz App</CodeBlock>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
                  {t('setup.redirectLabel')}
                </span>
                <CodeBlock>{ghPagesCallback}</CodeBlock>
                <div style={{ marginTop: '0.3rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      display: 'block',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {t('setup.localDevNote')}
                  </span>
                  <CodeBlock>{localCallback}</CodeBlock>
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: '0.65rem',
                padding: '0.5rem 0.75rem',
                background: 'var(--accent-dim)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: 'var(--accent)',
              }}
            >
              <Info size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {t('setup.ghPagesNote')}
            </div>
          </StepCard>

          <StepCard number="3" title={t('setup.step3title')}>
            {t('setup.step3text1')} <strong>&quot;Web API&quot;</strong>.
            <br />
            {t('setup.step3text2')} <strong>&quot;Save&quot;</strong>.
          </StepCard>

          <StepCard number="4" title={t('setup.step4title')}>
            {t('setup.step4text')}
            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: 'var(--warning-dim)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: 'var(--warning)',
              }}
            >
              <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {t('setup.step4warn')}
            </div>
          </StepCard>
        </div>

        {error && (
          <div className="error-box" style={{ marginBottom: '1rem' }}>
                        <AlertTriangle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: '0.75rem' }}>
          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label className="input-label" htmlFor="clientId">
              {t('setup.inputLabel')}
            </label>
            <input
              id="clientId"
              className="input"
              type="text"
              placeholder={t('setup.inputPlaceholder')}
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value)
                setError(null)
              }}
              autoComplete="off"
              spellCheck={false}
              style={{ fontFamily: 'monospace' }}
            />
          </div>
          <button className="spotify-btn" type="submit" style={{ width: '100%' }}>
            {t('setup.submit')}
          </button>
        </form>

        <p
          style={{
            marginTop: '1.5rem',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
          }}
        >
          {t('setup.privacy')}
          <br />
          {t('setup.privacyPkce')}
        </p>
      </div>
    </div>
  )
}
