import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getHistory, clearHistory } from '../api'

const GENRE_EMOJIS = {
  pop: '🎤', rock: '🎸', hiphop: '🎧', 'hip-hop': '🎧',
  jazz: '🎷', classical: '🎻', electronic: '🎛️',
  rnb: '🎶', 'r&b': '🎶', metal: '🤘', country: '🤠',
  latin: '💃', reggae: '🌴', blues: '🎺', soul: '✨',
  punk: '⚡', folk: '🪕', indie: '🌿', dance: '🕺',
  random: '🎲', playlist: '🎼', default: '🎵',
}

function getGenreEmoji(name = '') {
  const key = name.toLowerCase().replace(/\s+/g, '')
  for (const [k, v] of Object.entries(GENRE_EMOJIS)) {
    if (key.includes(k)) return v
  }
  return GENRE_EMOJIS.default
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function HistoryCard({ quiz }) {
  const [expanded, setExpanded] = useState(false)

  const score = quiz.score ?? 0
  const maxScore = quiz.max_score ?? (quiz.question_count ?? 0) * 200
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const genre = quiz.genre || quiz.mode || 'Unbekannt'
  const answers = quiz.answers ?? []

  return (
    <div className="history-card">
      <div
        className="history-card-header"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="history-card-icon">{getGenreEmoji(genre)}</div>
        <div className="history-card-meta">
          <div className="history-card-genre">
            {genre.charAt(0).toUpperCase() + genre.slice(1)}
          </div>
          <div className="history-card-date">{formatDate(quiz.played_at ?? quiz.created_at)}</div>
        </div>
        <div className="history-card-right">
          <div className="history-score-text">{score} / {maxScore}</div>
          <div className="history-pct-bar-wrapper">
            <div
              className="history-pct-bar-fill"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {percentage}%
          </div>
        </div>
        <div className={`history-expand-icon ${expanded ? 'open' : ''}`}>▼</div>
      </div>

      {expanded && (
        <div className="history-card-body">
          {answers.length === 0 ? (
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              Keine Detailinformationen verfügbar.
            </p>
          ) : (
            answers.map((ans, idx) => {
              const pts = ans.points ?? 0
              const correct = ans.artist_correct && ans.title_correct
              return (
                <div className="history-answer-row" key={idx}>
                  <div className="history-answer-num">{idx + 1}</div>
                  <div className="history-answer-info">
                    <div className="history-answer-track">
                      {correct ? '✅ ' : '❌ '}{ans.track?.title ?? ans.title ?? '—'}
                    </div>
                    <div className="history-answer-artist">
                      {ans.track?.artist ?? ans.artist ?? '—'}
                    </div>
                  </div>
                  <div className={`history-answer-pts ${pts === 0 ? 'zero' : ''}`}>
                    +{pts}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [clearing, setClearing] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)

  const clearConfirmTimerRef = React.useRef(null)

  const fetchHistory = useCallback(() => {
    setLoading(true)
    setError(null)
    getHistory()
      .then((r) => {
        const data = r.data
        // Backend returns {history: [...]} already reversed (most recent first)
        const list = Array.isArray(data) ? data : (data.history ?? [])
        setHistory(list)
      })
      .catch(() => setError('Verlauf konnte nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchHistory()
    return () => clearTimeout(clearConfirmTimerRef.current)
  }, [fetchHistory])

  const handleClear = useCallback(async () => {
    if (!clearConfirm) {
      setClearConfirm(true)
      clearConfirmTimerRef.current = setTimeout(() => setClearConfirm(false), 4000)
      return
    }
    clearTimeout(clearConfirmTimerRef.current)
    setClearing(true)
    try {
      await clearHistory()
      setHistory([])
      setClearConfirm(false)
    } catch {
      setError('Löschen fehlgeschlagen.')
    } finally {
      setClearing(false)
    }
  }, [clearConfirm])

  return (
    <div className="history-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link to="/home" className="navbar-brand">
            <span>🎵</span>
            <span className="brand-text">MusicChef</span>
          </Link>
        </div>
      </nav>

      <div className="container">
        <div className="history-header">
          <div>
            <h2>📊 Spielverlauf</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}>
              {loading ? '' : `${history.length} Quiz${history.length !== 1 ? 'zes' : ''} gespielt`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/home')}
            >
              ← Zurück
            </button>
            {history.length > 0 && (
              <button
                className={`btn btn-sm ${clearConfirm ? 'btn-danger' : 'btn-ghost'}`}
                onClick={handleClear}
                disabled={clearing}
              >
                {clearing
                  ? 'Wird gelöscht…'
                  : clearConfirm
                  ? '⚠️ Wirklich löschen?'
                  : '🗑️ Verlauf löschen'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="error-box" style={{ marginBottom: '1.5rem' }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : history.length === 0 ? (
          <div className="history-empty">
            <div className="history-empty-icon">🎵</div>
            <h3>Noch keine Quizzes gespielt</h3>
            <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              Starte dein erstes Quiz und entdecke neue Musik!
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/home')}
            >
              🎮 Jetzt spielen
            </button>
          </div>
        ) : (
          <div className="history-list">
            {history.map((quiz, idx) => (
              <HistoryCard key={quiz.id ?? quiz.quiz_id ?? idx} quiz={quiz} />
            ))}
          </div>
        )}

        <div style={{ height: '2rem' }} />
      </div>
    </div>
  )
}
