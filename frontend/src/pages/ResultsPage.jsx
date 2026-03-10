import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../context/LanguageContext'
import Navbar from '../components/Navbar'
import {
  MusicNote, Music, Trophy, Star, BookOpen, RefreshCw, BarChart,
  Check, X as XIcon, Coffee, Heart, ExternalLink,
} from '../lib/icons'

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

function getRating(pct, t) {
  if (pct >= 80) return { icon: <Trophy size={32} />, label: t('results.excellent') }
  if (pct >= 60) return { icon: <Star size={32} />, label: t('results.wellDone') }
  if (pct >= 40) return { icon: <BookOpen size={32} />, label: t('results.keepPracticing') }
  return { icon: <Music size={32} />, label: t('results.dontGiveUp') }
}

export default function ResultsPage() {
  const { quizId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { t } = useTranslation()

  // Backend sends: {quiz_id, genre, mode, score, total_questions, max_score, answers: [{track, user_artist, user_title, artist_correct, title_correct, points}]}
  const results = location.state?.results

  const [showConfetti, setShowConfetti] = useState(false)
  const [ringPct, setRingPct] = useState(0)

  const finalScore = results?.score ?? 0
  const maxScore = results?.max_score ?? 0
  const totalQuestions = results?.total_questions ?? 0
  const answers = results?.answers ?? []
  const percentage = maxScore > 0 ? (finalScore / maxScore) * 100 : 0
  const rating = getRating(percentage, t)

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
          {t('results.noResults')}
        </p>
        <Link to="/home" className="btn btn-primary">
          {t('results.toHome')}
        </Link>
      </div>
    )
  }

  return (
    <div className="results-page">
      <Confetti show={showConfetti} />
      <Navbar user={user} onLogout={logout} />

      <div className="container">
        <div className="results-header">
          <div className="results-trophy">{rating.icon}</div>
          <h1>{rating.label}</h1>

          <ScoreRing percentage={ringPct} />

          <div className="results-score-display">
            <span className="results-score-big">{finalScore}</span>
            <span className="results-score-max"> / {maxScore} {t('quiz.pts')}</span>
          </div>
          <div>
            <span className="results-percentage">{Math.round(percentage)}%</span>
          </div>
          <p className="text-muted" style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
            {t('results.questions', { count: totalQuestions, id: quizId })}
          </p>
        </div>

        <div className="results-actions">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/home')}>
            <RefreshCw size={16} /> {t('results.playAgain')}
          </button>
          <Link to="/history" className="btn btn-secondary btn-lg">
            <BarChart size={16} /> {t('results.viewHistory')}
          </Link>
        </div>

        <hr className="divider" />

        {answers.length > 0 && (
          <>
            <p className="section-title" style={{ marginBottom: '1rem' }}>
              {t('results.yourAnswers')}
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
                      <div className="result-thumb-placeholder"><Music size={20} /></div>
                    )}

                    <div className="result-track-info">
                      <div className="result-track-title">
                        {track.title ?? '—'}
                        {track.year ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({track.year})</span> : null}
                      </div>
                      <div className="result-track-artist">{track.all_artists ?? track.artist ?? '—'}</div>
                      <div className="result-guess-row">
                        {ans.fieldResults ? (
                          Object.entries(ans.fieldResults).map(([field, fr]) => {
                            const labels = { artist: t('results.artist'), title: t('results.title'), year: t('results.year') }
                            return (
                              <div className="result-guess-item" key={field}>
                                <span className="result-guess-label">{labels[field] ?? field}:</span>
                                <span className={`result-guess-val ${fr.correct ? 'correct' : 'wrong'}`}>
                                  {fr.correct ? <Check size={12} /> : <XIcon size={12} />} {fr.userValue || '—'}
                                </span>
                              </div>
                            )
                          })
                        ) : (
                          <>
                            <div className="result-guess-item">
                              <span className="result-guess-label">{t('results.artist')}</span>
                              <span className={`result-guess-val ${artistCorrect ? 'correct' : 'wrong'}`}>
                                {artistCorrect ? <Check size={12} /> : <XIcon size={12} />} {ans.user_artist || '—'}
                              </span>
                            </div>
                            <div className="result-guess-item">
                              <span className="result-guess-label">{t('results.title')}</span>
                              <span className={`result-guess-val ${titleCorrect ? 'correct' : 'wrong'}`}>
                                {titleCorrect ? <Check size={12} /> : <XIcon size={12} />} {ans.user_title || '—'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="result-points-col">
                      <div className={`result-points-val ${pts === 0 ? 'zero' : ''}`}>+{pts}</div>
                      <div className="result-points-sub">{t('quiz.pts')}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div style={{ height: '2rem' }} />

        {/* ── Dezenter Spenden-Hinweis ───────────────────── */}
        <div className="donate-card">
          <div className="donate-header">
            <Coffee size={18} />
            <span>{t('results.supportTitle')}</span>
          </div>
          <p className="donate-text">
            {t('results.supportText')}
          </p>
          <div className="donate-options">
            <a href="https://paypal.me/tobcro/1" target="_blank" rel="noopener noreferrer" className="donate-chip">
              <Coffee size={14} /> {t('results.coffee')}
            </a>
            <a href="https://paypal.me/tobcro/3" target="_blank" rel="noopener noreferrer" className="donate-chip">
              <Heart size={14} /> {t('results.snack')}
            </a>
            <a href="https://paypal.me/tobcro/5" target="_blank" rel="noopener noreferrer" className="donate-chip">
              <Star size={14} /> {t('results.supporter')}
            </a>
            <a href="https://paypal.me/tobcro" target="_blank" rel="noopener noreferrer" className="donate-chip donate-chip-free">
              {t('results.freeAmount')} <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <div style={{ height: '2rem' }} />
      </div>
    </div>
  )
}
