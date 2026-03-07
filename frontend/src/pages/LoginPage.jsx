import React from 'react'
import { useAuth } from '../context/AuthContext'
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
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-badge">
            <Zap size={14} /> Musik-Quiz
          </div>
          <h1 className="landing-hero-title">
            Wie gut kennst du<br />
            <span className="gradient-text">deine Musik?</span>
          </h1>
          <p className="landing-hero-sub">
            Teste dein Wissen mit Songs direkt aus Spotify.
            Erkenne Interpret, Titel und Erscheinungsjahr – gegen die Uhr.
          </p>

          <button className="landing-cta" onClick={login}>
            <SpotifyLogo size={22} />
            <span>Mit Spotify starten</span>
          </button>

          <p className="landing-hint">
            Kostenlos mit deinem Spotify-Account. Keine Daten werden gespeichert.
          </p>
        </section>

        {/* ── Features ─────────────────────────────────────── */}
        <section className="landing-features">
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><Guitar size={24} /></div>
            <h3>120+ Genres</h3>
            <p>Von Afrobeats bis Synthpop – wähle aus über 120 Genres oder deinen eigenen Playlists.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><Target size={24} /></div>
            <h3>Multiple Choice</h3>
            <p>Wähle zwischen Freitext und Multiple-Choice mit 2–6 Antwortmöglichkeiten.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><Zap size={24} /></div>
            <h3>Speed Bonus</h3>
            <p>Antworte schneller für Bonus-Punkte. Blitzschnell gibt's den doppelten Score.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><Image size={24} /></div>
            <h3>Cover Reveal</h3>
            <p>Das Album-Cover wird Stück für Stück enthüllt – ein visueller Hinweis extra.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><Headphones size={24} /></div>
            <h3>Spotify Playback</h3>
            <p>Songs werden direkt über die Spotify Web Playback SDK abgespielt.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon"><Trophy size={24} /></div>
            <h3>Statistiken</h3>
            <p>Verfolge deinen Fortschritt, vergleiche Quizzes und verbessere dich.</p>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────── */}
        <section className="landing-steps">
          <h2 className="landing-section-title">So funktioniert's</h2>
          <div className="landing-steps-grid">
            <div className="landing-step">
              <div className="landing-step-num">1</div>
              <h4>Genre wählen</h4>
              <p>Wähle ein oder mehrere Genres oder eine Spotify-Playlist als Quelle.</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">2</div>
              <h4>Quiz konfigurieren</h4>
              <p>Anzahl Fragen, Ratefelder, Eingabemodus und Spielmodi einstellen.</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">3</div>
              <h4>Hören & Raten</h4>
              <p>Der Song spielt – erkenne den Interpreten, Titel oder das Erscheinungsjahr.</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">4</div>
              <h4>Ergebnisse</h4>
              <p>Sieh deine Ergebnisse, lerne aus den Fehlern und werde besser.</p>
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
          Client ID ändern
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

