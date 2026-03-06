import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { startQuiz, submitAnswer } from '../api'

const PREVIEW_DURATION = 30

function AudioPlayer({ previewUrl }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current)
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  useEffect(() => {
    if (!previewUrl) return
    setPlaying(false)
    setElapsed(0)
    clearInterval(intervalRef.current)

    const audio = audioRef.current
    if (!audio) return

    audio.src = previewUrl
    audio.load()

    const tryPlay = () => {
      audio.play().then(() => {
        setPlaying(true)
        intervalRef.current = setInterval(() => {
          setElapsed((e) => {
            const next = e + 0.3
            return next >= PREVIEW_DURATION ? PREVIEW_DURATION : next
          })
        }, 300)
      }).catch(() => {})
    }

    audio.addEventListener('canplay', tryPlay, { once: true })

    const handleEnded = () => {
      setPlaying(false)
      clearInterval(intervalRef.current)
      setElapsed(PREVIEW_DURATION)
    }
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('ended', handleEnded)
      clearInterval(intervalRef.current)
    }
  }, [previewUrl])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      clearInterval(intervalRef.current)
    } else {
      audio.play().catch(() => {})
      setPlaying(true)
      intervalRef.current = setInterval(() => {
        setElapsed((e) => {
          const next = e + 0.3
          return next >= PREVIEW_DURATION ? PREVIEW_DURATION : next
        })
      }, 300)
    }
  }, [playing])

  const pct = Math.min((elapsed / PREVIEW_DURATION) * 100, 100)
  const remaining = Math.max(0, PREVIEW_DURATION - Math.floor(elapsed))

  return (
    <div className="audio-player">
      <audio ref={audioRef} preload="auto" style={{ display: 'none' }} />
      <button
        className="play-pause-btn"
        onClick={togglePlay}
        disabled={!previewUrl}
        title={playing ? 'Pause' : 'Abspielen'}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <div className="audio-progress">
        <div className="audio-progress-bar">
          <div className="audio-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="audio-timer">
          {playing ? `⏱ ${remaining}s verbleibend` : elapsed > 0 ? 'Pausiert' : 'Vorschau'}
        </span>
      </div>
    </div>
  )
}

function FeedbackBanner({ result }) {
  const artistCorrect = result.artist_correct
  const titleCorrect = result.title_correct
  const points = result.points ?? 0

  let type = 'wrong'
  let icon = '❌'
  let title = 'Leider falsch!'

  if (artistCorrect && titleCorrect) {
    type = 'correct'; icon = '✅'; title = 'Perfekt!'
  } else if (artistCorrect || titleCorrect) {
    type = 'partial'; icon = '🟡'; title = 'Fast richtig!'
  }

  return (
    <div className={`feedback-banner ${type}`}>
      <span className="feedback-icon">{icon}</span>
      <div className="feedback-content">
        <div className="feedback-title">{title}</div>
        <div className="feedback-correct-answer">
          <strong>{result.correct_artist}</strong>
          {' – '}
          <strong>{result.correct_title}</strong>
        </div>
        <div className="points-earned" style={{ marginTop: '0.5rem' }}>
          <span className={`point-chip ${artistCorrect ? 'earned' : 'missed'}`}>
            {artistCorrect ? '+50' : '+0'} Interpret
          </span>
          <span className={`point-chip ${titleCorrect ? 'earned' : 'missed'}`}>
            {titleCorrect ? '+50' : '+0'} Titel
          </span>
        </div>
      </div>
    </div>
  )
}

export default function QuizPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const quizConfig = location.state

  const [quizId, setQuizId] = useState(null)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [score, setScore] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [answered, setAnswered] = useState(false)
  const [feedbackResult, setFeedbackResult] = useState(null)
  const [artistInput, setArtistInput] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const [revealed, setRevealed] = useState(false)

  const artistRef = useRef(null)
  const titleRef = useRef(null)
  const configRef = useRef(quizConfig)
  const navigateRef = useRef(navigate)

  useEffect(() => {
    const cfg = configRef.current
    const nav = navigateRef.current

    if (!cfg) {
      nav('/home', { replace: true })
      return
    }

    const params = {}
    if (cfg.mode) params.mode = cfg.mode
    if (cfg.genre) params.genre = cfg.genre
    if (cfg.count) params.count = cfg.count
    if (cfg.playlist_id) params.playlist_id = cfg.playlist_id

    startQuiz(params)
      .then((r) => {
        const data = r.data
        setQuizId(data.quiz_id)
        setTotalQuestions(data.total_questions)
        setCurrentQuestion(data.question)
      })
      .catch((e) => {
        const msg = e.response?.data?.error || 'Quiz konnte nicht geladen werden.'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (answered || submitting || !currentQuestion) return
    const artist = artistInput.trim()
    const title = titleInput.trim()
    if (!artist && !title) return

    setSubmitting(true)
    try {
      const res = await submitAnswer({ quiz_id: quizId, artist, title })
      const result = res.data
      setFeedbackResult(result)
      setScore((s) => s + (result.points ?? 0))
      setAnswered(true)
      setRevealed(true)
    } catch (e) {
      const msg = e.response?.data?.error || 'Fehler beim Absenden.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }, [answered, submitting, currentQuestion, artistInput, titleInput, quizId])

  const handleNext = useCallback(() => {
    if (!feedbackResult) return

    if (feedbackResult.finished && feedbackResult.results) {
      navigate(`/results/${quizId}`, {
        state: { results: feedbackResult.results },
      })
      return
    }

    const next = feedbackResult.next_question
    if (next) {
      setCurrentQuestion(next)
    }
    setAnswered(false)
    setFeedbackResult(null)
    setArtistInput('')
    setTitleInput('')
    setRevealed(false)
    setTimeout(() => artistRef.current?.focus(), 100)
  }, [feedbackResult, quizId, navigate])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter') {
        if (answered) {
          handleNext()
        } else {
          const active = document.activeElement
          if (active === artistRef.current || active === titleRef.current) {
            handleSubmit()
          }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [answered, handleNext, handleSubmit])

  useEffect(() => {
    if (!loading && !error && !answered && currentQuestion) {
      setTimeout(() => artistRef.current?.focus(), 150)
    }
  }, [currentQuestion, loading, error, answered])

  if (!quizConfig) return null

  if (loading) {
    return (
      <div className="spinner-fullpage">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p className="text-muted">Quiz wird geladen…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>
        <div className="error-box" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
        <Link to="/home" className="btn btn-secondary">
          ← Zurück
        </Link>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>
        <p className="text-muted">Keine Fragen verfügbar.</p>
        <Link to="/home" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          ← Zurück
        </Link>
      </div>
    )
  }

  const questionNumber = currentQuestion.question_number ?? (currentQuestion.index + 1)
  const progressPct = ((questionNumber - 1) / totalQuestions) * 100
  const previewUrl = currentQuestion.preview_url
  const albumImage = currentQuestion.image

  const artistInputClass = feedbackResult
    ? feedbackResult.artist_correct ? 'input input-correct' : 'input input-wrong'
    : 'input'

  const titleInputClass = feedbackResult
    ? feedbackResult.title_correct ? 'input input-correct' : 'input input-wrong'
    : 'input'

  return (
    <div className="quiz-page">
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link to="/home" className="navbar-brand">
            <span>🎵</span>
            <span className="brand-text">MusicChef</span>
          </Link>
          <Link to="/home" className="btn btn-ghost btn-sm">✕ Beenden</Link>
        </div>
      </nav>

      <div className="container">
        <div className="quiz-header">
          <div className="quiz-progress-info">
            <div className="quiz-progress-label">
              Frage {questionNumber} von {totalQuestions}
            </div>
            <div className="progress-bar-wrapper">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="quiz-score-badge">
            ⭐ {score} Pkt.
          </div>
        </div>

        <div className="quiz-layout">
          <div className="album-art-panel">
            <div className="album-art-wrapper">
              {albumImage ? (
                <img
                  className={`album-art-img ${revealed ? 'revealed' : 'blurred'}`}
                  src={albumImage}
                  alt="Album Cover"
                />
              ) : (
                <div className="album-art-placeholder">🎵</div>
              )}
              {!revealed && (
                <div className="album-art-overlay">🔒</div>
              )}
            </div>

            {previewUrl ? (
              <AudioPlayer previewUrl={previewUrl} />
            ) : (
              <div className="no-preview-msg">
                ⚠️ Keine Vorschau verfügbar – rate trotzdem!
              </div>
            )}
          </div>

          <div className="answer-panel">
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1.5rem',
              }}
            >
              <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Wer singt diesen Song?
              </h3>

              <div className="answer-inputs">
                <div className="input-group">
                  <label className="input-label">🎤 Interpret</label>
                  <input
                    ref={artistRef}
                    className={artistInputClass}
                    type="text"
                    placeholder="z.B. Taylor Swift"
                    value={artistInput}
                    onChange={(e) => setArtistInput(e.target.value)}
                    disabled={answered || submitting}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">🎵 Titel</label>
                  <input
                    ref={titleRef}
                    className={titleInputClass}
                    type="text"
                    placeholder="z.B. Shake It Off"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    disabled={answered || submitting}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                {!answered && (
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={submitting || (!artistInput.trim() && !titleInput.trim())}
                    style={{ marginTop: '0.25rem' }}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner spinner-sm" />
                        Wird überprüft…
                      </>
                    ) : (
                      '✔ Antwort abschicken'
                    )}
                  </button>
                )}
              </div>
            </div>

            {feedbackResult && (
              <FeedbackBanner result={feedbackResult} />
            )}

            {answered && (
              <button
                className="btn btn-primary btn-lg"
                onClick={handleNext}
                style={{ width: '100%' }}
              >
                {feedbackResult?.finished
                  ? '🏆 Ergebnis anzeigen'
                  : 'Weiter →'}
              </button>
            )}

            {!answered && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Drücke Enter zum Absenden
              </p>
            )}
            {answered && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Drücke Enter für die nächste Frage
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
