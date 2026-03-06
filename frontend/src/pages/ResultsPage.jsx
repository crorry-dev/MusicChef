import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'

const CONFETTI_COLORS = ['#1DB954', '#5af791', '#ff6b9d', '#ffd93d', '#6bceff', '#ffffff']

const CONFETTI_PIECES = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  delay: `${Math.random() * 2}s`,
  size: `${6 + Math.random() * 8}px`,
  shape: Math.random() > 0.5 ? '50%' : '0%',
}))

function Confetti({ show }) {
  if (!show) return null
  return (
    <div className="confetti-wrapper">
      {CONFETTI_PIECES.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  )
}

function ScoreRing({ percentage }) {
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="score-ring-wrapper">
      <div className="score-ring">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--surface2)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={radius}
            fill="none" stroke="var(--accent)" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="score-ring-text">{Math.round(percentage)}%</div>
      </div>
    </div>
  )
}

function getRating(pct) {
  if (pct >= 80) return { emoji: '🏆', label: 'Ausgezeichnet!' }
  if (pct >= 60) return { emoji: '⭐', label: 'Gut gemacht!' }
  if (pct >= 40) return { emoji: '📚', label: 'Weiter üben!' }
  return { emoji: '🎵', label: 'Nicht aufgeben!' }
}

export default function ResultsPage() {
  const { quizId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Backend sends: {quiz_id, genre, mode, score, total_questions, max_score, answers: [{track, user_artist, user_title, artist_correct, title_correct, points}]}
  const results = location.state?.results

  const [showConfetti, setShowConfetti] = useState(false)
  const [ringPct, setRingPct] = useState(0)

  const finalScore = results?.score ?? 0
  const maxScore = results?.max_score ?? 0
  const totalQuestions = results?.total_questions ?? 0
  const answers = results?.answers ?? []
  const percentage = maxScore > 0 ? (finalScore / maxScore) * 100 : 0
  const rating = getRating(percentage)

  useEffect(() => {
    if (percentage >= 60) {
      setShowConfetti(true)
      const t = setTimeout(() => setShowConfetti(false), 3500)
      return () => clearTimeout(t)
    }
  }, [percentage])

  useEffect(() => {
    const t = setTimeout(() => setRingPct(percentage), 200)
    return () => clearTimeout(t)
  }, [percentage])

  if (!results) {
    return (
      <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>
        <p className="text-muted" style={{ marginBottom: '1rem' }}>
          Keine Ergebnisse verfügbar.
        </p>
        <Link to="/home" className="btn btn-primary">
          Zur Startseite
        </Link>
      </div>
    )
  }

  return (
    <div className="results-page">
      <Confetti show={showConfetti} />

      <nav className="navbar">
        <div className="container navbar-inner">
          <Link to="/home" className="navbar-brand">
            <span>🎵</span>
            <span className="brand-text">MusicChef</span>
          </Link>
        </div>
      </nav>

      <div className="container">
        <div className="results-header">
          <div className="results-trophy">{rating.emoji}</div>
          <h1>{rating.label}</h1>

          <ScoreRing percentage={ringPct} />

          <div className="results-score-display">
            <span className="results-score-big">{finalScore}</span>
            <span className="results-score-max"> / {maxScore} Pkt.</span>
          </div>
          <div>
            <span className="results-percentage">{Math.round(percentage)}%</span>
          </div>
          <p className="text-muted" style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
            {totalQuestions} Fragen · Quiz-ID: {quizId}
          </p>
        </div>

        <div className="results-actions">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/home')}>
            🔄 Nochmal spielen
          </button>
          <Link to="/history" className="btn btn-secondary btn-lg">
            📊 Verlauf ansehen
          </Link>
        </div>

        <hr className="divider" />

        {answers.length > 0 && (
          <>
            <p className="section-title" style={{ marginBottom: '1rem' }}>
              Deine Antworten
            </p>
            <div className="results-list">
              {answers.map((ans, idx) => {
                const track = ans.track ?? {}
                const pts = ans.points ?? 0
                const artistCorrect = ans.artist_correct ?? false
                const titleCorrect = ans.title_correct ?? false

                return (
                  <div className="result-card" key={idx}>
                    {track.image ? (
                      <img className="result-thumb" src={track.image} alt="Cover" />
                    ) : (
                      <div className="result-thumb-placeholder">🎵</div>
                    )}

                    <div className="result-track-info">
                      <div className="result-track-title">{track.title ?? '—'}</div>
                      <div className="result-track-artist">{track.all_artists ?? track.artist ?? '—'}</div>
                      <div className="result-guess-row">
                        <div className="result-guess-item">
                          <span className="result-guess-label">Interpret:</span>
                          <span className={`result-guess-val ${artistCorrect ? 'correct' : 'wrong'}`}>
                            {artistCorrect ? '✓' : '✗'} {ans.user_artist || '—'}
                          </span>
                        </div>
                        <div className="result-guess-item">
                          <span className="result-guess-label">Titel:</span>
                          <span className={`result-guess-val ${titleCorrect ? 'correct' : 'wrong'}`}>
                            {titleCorrect ? '✓' : '✗'} {ans.user_title || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="result-points-col">
                      <div className={`result-points-val ${pts === 0 ? 'zero' : ''}`}>+{pts}</div>
                      <div className="result-points-sub">Punkte</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div style={{ height: '2rem' }} />
      </div>
    </div>
  )
}
