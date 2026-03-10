import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../context/LanguageContext'
import {
  MusicNote,
  Guitar,
  Trophy,
  BarChart,
  Headphones,
  SpotifyLogo,
  Zap,
  Target,
  Star,
  Shuffle,
  Timer,
  Image,
  ChefHat,
} from '../lib/icons'

export default function LoginPage() {
  const { login, resetSetup } = useAuth()
  const { t, lang, setLanguage } = useTranslation()

  return (
    <div className="landing-page">
      {/* ── Ambient background ─────────────────────────────── */}
      <div className="landing-bg">
        <div className="landing-glow landing-glow-1" />
        <div className="landing-glow landing-glow-2" />
        <div className="landing-glow landing-glow-3" />
      </div>

      {/* ── Top bar ────────────────────────────────────────── */}
      <header className="landing-header">
        <div className="landing-brand">
          <div className="landing-brand-icon"><MusicNote size={22} /></div>
          <span className="landing-brand-text">MusicChef</span>
        </div>
        <div className="sp-theme-switcher" style={{ gap: '0.25rem' }}>
          <button className={`sp-theme-btn ${lang === 'de' ? 'active' : ''}`} onClick={() => setLanguage('de')} style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}><span>DE</span></button>
          <button className={`sp-theme-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')} style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}><span>EN</span></button>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-badge">
            <Zap size={14} /> {t('login.badge')}
          </div>
          <h1 className="landing-hero-title">
            {t('login.title1')}<br />
            <span className="gradient-text">{t('login.title2')}</span>
          </h1>
          <p className="landing-hero-sub">
            {t('login.subtitle')}
          </p>

          <button className="landing-cta" onClick={login}>
            <SpotifyLogo size={22} />
            <span>{t('login.cta')}</span>
          </button>

          <p className="landing-hint">
            {t('login.hint')}
          </p>
        </section>

        {/* ── Features ─────────────────────────────────────── */}
        <section className="landing-features">
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><Guitar size={24} /></div>
            <h3>{t('login.feat.genres')}</h3>
            <p>{t('login.feat.genresDesc')}</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><Target size={24} /></div>
            <h3>{t('login.feat.choice')}</h3>
            <p>{t('login.feat.choiceDesc')}</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><Zap size={24} /></div>
            <h3>{t('login.feat.speed')}</h3>
            <p>{t('login.feat.speedDesc')}</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><Image size={24} /></div>
            <h3>{t('login.feat.cover')}</h3>
            <p>{t('login.feat.coverDesc')}</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><Headphones size={24} /></div>
            <h3>{t('login.feat.playback')}</h3>
            <p>{t('login.feat.playbackDesc')}</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><Trophy size={24} /></div>
            <h3>{t('login.feat.stats')}</h3>
            <p>{t('login.feat.statsDesc')}</p>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────── */}
        <section className="landing-steps">
          <h2 className="landing-section-title">{t('login.howTitle')}</h2>
          <div className="landing-steps-grid">
            <div className="landing-step">
              <div className="landing-step-num">1</div>
              <h4>{t('login.step1title')}</h4>
              <p>{t('login.step1desc')}</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">2</div>
              <h4>{t('login.step2title')}</h4>
              <p>{t('login.step2desc')}</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">3</div>
              <h4>{t('login.step3title')}</h4>
              <p>{t('login.step3desc')}</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">4</div>
              <h4>{t('login.step4title')}</h4>
              <p>{t('login.step4desc')}</p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="landing-footer">
        <button
          onClick={resetSetup}
          className="landing-footer-link"
        >
          {t('login.changeClientId')}
        </button>
        <span className="landing-footer-sep">·</span>
        <a
          href="https://github.com/crorry-dev/MusicChef"
          target="_blank"
          rel="noopener noreferrer"
          className="landing-footer-link"
        >
          GitHub
        </a>
      </footer>
    </div>
  )
}

