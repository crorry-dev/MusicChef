import React, {
  useState, useEffect, useRef, useCallback, useMemo,
  forwardRef, useImperativeHandle,
} from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { createQuiz, submitQuizAnswer, GUESS_FIELDS, getSpeedTier } from '../lib/quiz-engine'
import {
  connectPlayer as initSdk,
  play as sdkPlay,
  pause as sdkPause,
  resume as sdkResume,
  seek as sdkSeek,
  onStateChange as sdkOnStateChange,
  disconnect as sdkDisconnect,
} from '../lib/spotify-player'
import Navbar from '../components/Navbar'
import GenreIcon from '../components/GenreIcon'
import {
  MusicNote, Music, Mic, Calendar, Timer, Star, Lock, Check, XCircle,
  CheckCircle, Trophy, AlertTriangle, Play, Pause, SkipForward, X,
} from '../lib/icons'

const PREVIEW_DURATION = 30

/* ── Loading messages ─────────────────────────────────────── */
const LOADING_MSGS = [
  'Mische die Tracks…',
  'Suche Interpreten…',
  'Lade Vorschauen…',
  'Stelle Fragen zusammen…',
  'Fast fertig…',
  'Bereite Auswahlmöglichkeiten vor…',
  'Verbinde Spotify Player…',
  'Gleich gehts los…',
]

/* ═══════════════════════════════════════════════════════════
   Quiz Loading Screen
   ═══════════════════════════════════════════════════════════ */
function QuizLoadingScreen() {
  const [msgIndex, setMsgIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MSGS.length)
    }, 2200)
    const progTimer = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12 + 3, 92))
    }, 500)
    return () => { clearInterval(msgTimer); clearInterval(progTimer) }
  }, [])

  return (
    <div className="quiz-loading-screen">
      <div className="quiz-loading-icon"><MusicNote size={40} /></div>
      <h2 className="quiz-loading-title">Quiz wird erstellt</h2>
      <div className="quiz-loading-bar-wrap">
        <div className="quiz-loading-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="quiz-loading-msg">{LOADING_MSGS[msgIndex]}</p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Bottom Player Bar – Spotify SDK + Audio Preview Fallback
   ═══════════════════════════════════════════════════════════ */
const PlayerBar = forwardRef(function PlayerBar(
  { trackId, previewUrl, sdkReady, sdkError, onSkip, canSkip, onTrackEnd },
  ref,
) {
  const audioRef = useRef(null)
  const animRef = useRef(null)
  const pbModeRef = useRef(null)
  const autoPlayedRef = useRef(false)
  const sdkPosRef = useRef({ ms: 0, ts: Date.now(), paused: true })
  const durRef = useRef(PREVIEW_DURATION)
  const trackStartedRef = useRef(false)
  const onTrackEndRef = useRef(onTrackEnd)
  onTrackEndRef.current = onTrackEnd

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(PREVIEW_DURATION)
  const [seeking, setSeeking] = useState(false)
  const [pbMode, setPbMode] = useState(null)

  function setMode(m) { pbModeRef.current = m; setPbMode(m) }

  useImperativeHandle(ref, () => ({
    async stop() {
      cancelAnimationFrame(animRef.current)
      setPlaying(false)
      setCurrentTime(0)
      if (pbModeRef.current === 'sdk') await sdkPause()
      const a = audioRef.current
      if (a) { a.pause(); a.currentTime = 0 }
    },
    async toggle() {
      if (pbModeRef.current === 'sdk') {
        const s = sdkPosRef.current
        s.paused ? await sdkResume() : await sdkPause()
      } else if (pbModeRef.current === 'audio') {
        const a = audioRef.current
        if (!a) return
        if (a.paused) { a.play().catch(() => {}); setPlaying(true) }
        else { a.pause(); setPlaying(false) }
      }
    },
    getProgress() {
      if (pbModeRef.current === 'sdk') {
        const s = sdkPosRef.current
        const pos = s.paused ? s.ms / 1000 : s.ms / 1000 + (Date.now() - s.ts) / 1000
        return durRef.current > 0 ? Math.min(pos / durRef.current, 1) : 0
      }
      if (pbModeRef.current === 'audio') {
        const a = audioRef.current
        if (a) {
          const d = (a.duration && isFinite(a.duration)) ? a.duration : durRef.current
          return d > 0 ? Math.min(a.currentTime / d, 1) : 0
        }
      }
      return 0
    },
  }))

  /* SDK state listener */
  useEffect(() => {
    if (!sdkReady) return
    return sdkOnStateChange((state) => {
      if (!state || pbModeRef.current !== 'sdk') return
      const t = state.track_window?.current_track
      if (t) { const d = t.duration_ms / 1000; durRef.current = d; setDuration(d) }
      if (state.position > 0) trackStartedRef.current = true
      sdkPosRef.current = { ms: state.position, ts: Date.now(), paused: state.paused }
      setPlaying(!state.paused)
      /* Track ended: nur auslösen wenn Track tatsächlich gespielt hat */
      if (trackStartedRef.current && state.paused && t && state.position === 0 && !state.loading) {
        trackStartedRef.current = false
        onTrackEndRef.current?.()
      }
    })
  }, [sdkReady])

  /* Audio element events */
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onMeta = () => { if (pbModeRef.current === 'audio' && a.duration && isFinite(a.duration)) { durRef.current = a.duration; setDuration(a.duration) } }
    const onCanPlay = () => {
      if (pbModeRef.current === 'audio' && !autoPlayedRef.current) {
        autoPlayedRef.current = true
        a.play().then(() => setPlaying(true)).catch(() => {})
      }
    }
    const onEnded = () => { if (pbModeRef.current === 'audio') { setPlaying(false); onTrackEndRef.current?.() } }
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('canplay', onCanPlay)
    a.addEventListener('ended', onEnded)
    return () => { a.removeEventListener('loadedmetadata', onMeta); a.removeEventListener('canplay', onCanPlay); a.removeEventListener('ended', onEnded) }
  }, [])

  /* Position RAF */
  const syncPos = useCallback(() => {
    if (!seeking) {
      if (pbModeRef.current === 'sdk') {
        const s = sdkPosRef.current
        const pos = s.paused
          ? s.ms / 1000
          : s.ms / 1000 + (Date.now() - s.ts) / 1000
        setCurrentTime(Math.max(0, pos))
      } else if (pbModeRef.current === 'audio') {
        const a = audioRef.current
        if (a) setCurrentTime(a.currentTime)
      }
    }
    animRef.current = requestAnimationFrame(syncPos)
  }, [seeking])

  useEffect(() => { animRef.current = requestAnimationFrame(syncPos); return () => cancelAnimationFrame(animRef.current) }, [syncPos])

  /* Track change → start playback */
  useEffect(() => {
    const a = audioRef.current
    setPlaying(false); setCurrentTime(0); durRef.current = PREVIEW_DURATION; setDuration(PREVIEW_DURATION); autoPlayedRef.current = false; trackStartedRef.current = false
    if (a) { a.pause(); a.removeAttribute('src') }
    setMode(null)
    if (!trackId && !previewUrl) return
    let cancelled = false
    ;(async () => {
      if (sdkReady && trackId) {
        try { await sdkPlay(trackId); if (!cancelled) { setMode('sdk'); setPlaying(true) } return } catch (e) { console.warn('[PlayerBar] SDK:', e.message) }
      }
      if (previewUrl && a && !cancelled) { setMode('audio'); a.src = previewUrl; a.load() }
    })()
    return () => { cancelled = true }
  }, [trackId, previewUrl, sdkReady])

  const togglePlay = useCallback(async () => {
    if (pbModeRef.current === 'sdk') { playing ? await sdkPause() : await sdkResume() }
    else if (pbModeRef.current === 'audio') {
      const a = audioRef.current; if (!a) return
      if (playing) { a.pause(); setPlaying(false) } else { a.play().catch(() => {}); setPlaying(true) }
    }
  }, [playing])

  const handleSeekStart = useCallback(() => setSeeking(true), [])
  const handleSeekChange = useCallback((e) => setCurrentTime(parseFloat(e.target.value)), [])
  const handleSeekEnd = useCallback(async (e) => {
    const v = parseFloat(e.target.value)
    if (pbModeRef.current === 'sdk') { await sdkSeek(v * 1000); sdkPosRef.current = { ...sdkPosRef.current, ms: v * 1000, ts: Date.now() } }
    else if (pbModeRef.current === 'audio') { const a = audioRef.current; if (a) a.currentTime = v }
    setSeeking(false)
  }, [])

  const fmt = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="player-bar">
      <audio ref={audioRef} preload="auto" style={{ display: 'none' }} />
      <button className="pb-btn pb-play" onClick={togglePlay} disabled={!pbMode} aria-label={playing ? 'Pause' : 'Abspielen'}>
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <span className="pb-time">{fmt(currentTime)}</span>
      <div className="pb-seek-wrap">
        <div className="pb-seek-track"><div className="pb-seek-fill" style={{ width: `${pct}%` }} /></div>
        <input className="pb-seek-input" type="range" min={0} max={duration} step={0.1} value={currentTime}
          onPointerDown={handleSeekStart} onInput={handleSeekChange} onChange={handleSeekChange} onPointerUp={handleSeekEnd}
          disabled={!pbMode} aria-label="Seek" />
      </div>
      <span className="pb-time">{fmt(duration)}</span>
      {canSkip && <button className="pb-btn pb-skip" onClick={onSkip} aria-label="Überspringen"><SkipForward size={18} /></button>}
      {!pbMode && !sdkReady && !sdkError && trackId && (
        <span className="pb-connecting"><span className="spinner spinner-sm" /> Verbinde…</span>
      )}
      {!pbMode && sdkError && !previewUrl && (
        <span className="pb-no-preview">Premium nötig für Wiedergabe</span>
      )}
      {!pbMode && !sdkError && sdkReady && !previewUrl && (
        <span className="pb-no-preview">Keine Vorschau verfügbar</span>
      )}
    </div>
  )
})

/* ═══════════════════════════════════════════════════════════
   Feedback Banner
   ═══════════════════════════════════════════════════════════ */
function FeedbackBanner({ result, guessFields }) {
  const fr = result.fieldResults ?? {}
  const allCorrect = Object.values(fr).every((f) => f.correct)
  const someCorrect = Object.values(fr).some((f) => f.correct)

  let type = 'wrong', title = 'Leider falsch!'
  if (allCorrect) { type = 'correct'; title = 'Perfekt!' }
  else if (someCorrect) { type = 'partial'; title = 'Fast richtig!' }
  const fbIcon = type === 'correct' ? <CheckCircle size={24} /> : type === 'partial' ? <AlertTriangle size={24} /> : <XCircle size={24} />

  const ppf = Math.round(100 / (guessFields?.length || 2))
  const correctParts = []
  if (result.correct_artist) correctParts.push(result.correct_artist)
  if (result.correct_title) correctParts.push(result.correct_title)
  if (result.correct_year) correctParts.push(`(${result.correct_year})`)

  return (
    <div className={`feedback-banner ${type}`}>
      <span className="feedback-icon">{fbIcon}</span>
      <div className="feedback-content">
        <div className="feedback-title">{title}</div>
        {result.speedLabel && (
          <span className="speed-label">{result.speedLabel} ({result.speedMultiplier}×)</span>
        )}
        <div className="feedback-correct-answer"><strong>{correctParts.join(' – ')}</strong></div>
        <div className="points-earned" style={{ marginTop: '0.5rem' }}>
          {(guessFields ?? []).map((field) => {
            const info = GUESS_FIELDS[field]
            const correct = fr[field]?.correct ?? false
            return (
              <span key={field} className={`point-chip ${correct ? 'earned' : 'missed'}`}>
                {correct ? `+${ppf}` : '+0'} {info?.label ?? field}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Multiple Choice Panel
   ═══════════════════════════════════════════════════════════ */
function ChoiceField({ field, options, selectedValue, onSelect, correctValue, answered, fieldResult, showKeys }) {
  const cfgMap = {
    artist: { label: 'Interpret', Icon: Mic },
    title: { label: 'Titel', Icon: Music },
    year: { label: 'Jahr', Icon: Calendar },
  }
  const cfg = cfgMap[field] ?? { label: field, Icon: Music }

  return (
    <div className="choice-field">
      <div className="input-label"><cfg.Icon size={14} /> {cfg.label}</div>
      <div className="choice-options">
        {options.map((opt, idx) => {
          const isSelected = selectedValue === opt
          let cls = 'choice-card'
          if (answered && fieldResult) {
            const isCorrect = (field === 'year')
              ? String(opt) === String(correctValue)
              : opt === correctValue
            if (isCorrect) cls += ' correct'
            else if (isSelected && !fieldResult.correct) cls += ' wrong'
          } else if (isSelected) {
            cls += ' selected'
          }
          return (
            <button
              key={opt}
              className={cls}
              onClick={() => !answered && onSelect(field, opt)}
              disabled={answered}
            >
              {showKeys && !answered && (
                <span className="choice-key-badge">{idx + 1}</span>
              )}
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Quiz Page
   ═══════════════════════════════════════════════════════════ */
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
  const [fieldInputs, setFieldInputs] = useState({})
  const [revealed, setRevealed] = useState(false)
  const [songPct, setSongPct] = useState(0)

  /* Timer for speed bonus */
  const questionStartRef = useRef(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  const firstInputRef = useRef(null)
  const configRef = useRef(quizConfig)
  const navigateRef = useRef(navigate)
  const quizRef = useRef(null)
  const playerRef = useRef(null)

  /* Spotify SDK */
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkError, setSdkError] = useState(null)

  useEffect(() => {
    let cancelled = false
    initSdk()
      .then(() => { if (!cancelled) setSdkReady(true) })
      .catch((err) => {
        console.warn('[Quiz] SDK:', err.message)
        if (!cancelled) setSdkError(err.message)
      })
    return () => { cancelled = true; sdkDisconnect() }
  }, [])

  /* Timer tick */
  useEffect(() => {
    if (loading || answered || !currentQuestion) return
    questionStartRef.current = Date.now()
    setElapsed(0)
    setSongPct(0)
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - questionStartRef.current) / 1000))
      setSongPct(playerRef.current?.getProgress?.() ?? 0)
    }, 250)
    return () => clearInterval(timerRef.current)
  }, [currentQuestion, loading, answered])

  /* Create quiz */
  useEffect(() => {
    const cfg = configRef.current
    const nav = navigateRef.current
    if (!cfg) { nav('/home', { replace: true }); return }

    createQuiz({
      mode: cfg.mode,
      genre: cfg.genre,
      count: cfg.count,
      playlistId: cfg.playlist_id,
      guessFields: cfg.guessFields,
      yearRange: cfg.yearRange ?? null,
      inputMode: cfg.inputMode ?? 'freetext',
      speedBonus: cfg.speedBonus ?? false,
      revealCover: cfg.revealCover ?? false,
    })
      .then((quiz) => {
        quizRef.current = quiz
        setQuizId(quiz.id)
        setTotalQuestions(quiz.totalQuestions)
        const first = quiz.tracks[0]
        const q = {
          index: 0,
          trackId: first.id,
          preview_url: first.preview_url,
          image: first.image,
          question_number: 1,
        }
        if (quiz.allChoices) q.choices = quiz.allChoices[0]
        setCurrentQuestion(q)
      })
      .catch((e) => setError(e.message || 'Quiz konnte nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  /* ── Config shortcuts ───────────────────────────────────── */
  const inputMode = quizRef.current?.inputMode ?? 'freetext'
  const hasSpeedBonus = quizRef.current?.speedBonus ?? false
  const hasRevealCover = quizRef.current?.revealCover ?? false
  const choices = currentQuestion?.choices ?? null

  /* ── Progressive blur ───────────────────────────────────── */
  const blurValue = useMemo(() => {
    if (!hasRevealCover) return revealed ? 0 : 20
    if (revealed) return 0
    const maxBlur = 20
    return maxBlur * (1 - songPct)
  }, [hasRevealCover, revealed, songPct])

  /* ── Submit ─────────────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    if (answered || submitting || !currentQuestion || !quizRef.current) return
    const hasInput = Object.values(fieldInputs).some((v) => v?.trim())
    if (!hasInput) return

    clearInterval(timerRef.current)
    setSubmitting(true)
    try {
      const elapsedSec = (Date.now() - questionStartRef.current) / 1000
      const { quiz: updatedQuiz, response: result } = submitQuizAnswer(
        quizRef.current, fieldInputs, elapsedSec,
      )
      quizRef.current = updatedQuiz
      setFeedbackResult(result)
      setScore((s) => s + (result.points ?? 0))
      setAnswered(true)
      setRevealed(true)
    } catch (e) {
      setError(e.message || 'Fehler beim Absenden.')
    } finally {
      setSubmitting(false)
    }
  }, [answered, submitting, currentQuestion, fieldInputs])

  /* ── Next ───────────────────────────────────────────────── */
  const handleNext = useCallback(() => {
    if (!feedbackResult) return
    if (feedbackResult.finished && feedbackResult.results) {
      navigate(`/results/${quizId}`, { state: { results: feedbackResult.results } })
      return
    }
    const next = feedbackResult.next_question
    if (next) setCurrentQuestion(next)
    setAnswered(false)
    setFeedbackResult(null)
    setFieldInputs({})
    setRevealed(false)
    setSongPct(0)
    setTimeout(() => firstInputRef.current?.focus(), 100)
  }, [feedbackResult, quizId, navigate])

  /* ── Skip ───────────────────────────────────────────────── */
  const handleSkip = useCallback(() => {
    if (answered || submitting || !quizRef.current) return
    clearInterval(timerRef.current)
    playerRef.current?.stop()
    const emptyAnswers = {}
    for (const f of quizRef.current.guessFields ?? ['artist', 'title']) emptyAnswers[f] = ''
    const { quiz: updatedQuiz, response: result } = submitQuizAnswer(quizRef.current, emptyAnswers, 999)
    quizRef.current = updatedQuiz
    setFeedbackResult(result)
    setAnswered(true)
    setRevealed(true)
  }, [answered, submitting])

  /* ── Choice select ──────────────────────────────────────── */
  const handleChoiceSelect = useCallback((field, value) => {
    setFieldInputs((prev) => ({ ...prev, [field]: value }))
  }, [])

  /* ── Track ended → auto-submit ──────────────────────────── */
  const handleTrackEnd = useCallback(() => {
    if (answered || submitting) return
    /* Not yet answered → auto-submit current answers (or skip if empty) */
    if (!quizRef.current) return
    const hasInput = Object.values(fieldInputs).some((v) => v?.trim())
    if (hasInput) {
      handleSubmit()
    } else {
      handleSkip()
    }
  }, [answered, submitting, fieldInputs, handleSubmit, handleSkip])

  /* Song weiterspielen nach Antwort – erst bei Track-Ende auto-advance (handleTrackEnd) */

  /* ── Keyboard ───────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA'

      /* Space → Play / Pause (prevent page scroll) */
      if (e.key === ' ' && !isTyping) {
        e.preventDefault()
        playerRef.current?.toggle?.()
        return
      }

      /* Enter → Submit or Next */
      if (e.key === 'Enter') {
        if (answered) handleNext()
        else if (isTyping) handleSubmit()
        return
      }

      /* 1-4 → Choice selection (only in choice mode, not while typing) */
      if (!isTyping && !answered && inputMode === 'choice' && choices) {
        const num = parseInt(e.key, 10)
        if (num >= 1 && num <= 4) {
          e.preventDefault()
          const fields = quizRef.current?.guessFields ?? []
          const activeField = fields.find((f) => !fieldInputs[f]?.trim())
          if (activeField && choices[activeField]) {
            const opt = choices[activeField][num - 1]
            if (opt !== undefined) handleChoiceSelect(activeField, String(opt))
          }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [answered, handleNext, handleSubmit, inputMode, choices, fieldInputs, handleChoiceSelect])

  /* ── Auto-submit for choice mode when all fields selected ── */
  useEffect(() => {
    if (inputMode !== 'choice' || answered || submitting || !quizRef.current) return
    const fields = quizRef.current.guessFields ?? []
    const allSelected = fields.every((f) => fieldInputs[f]?.trim())
    if (allSelected) handleSubmit()
  }, [fieldInputs, inputMode, answered, submitting, handleSubmit])

  useEffect(() => {
    if (!loading && !error && !answered && currentQuestion && inputMode === 'freetext') {
      setTimeout(() => firstInputRef.current?.focus(), 150)
    }
  }, [currentQuestion, loading, error, answered, inputMode])

  /* ── Render gates ───────────────────────────────────────── */
  if (!quizConfig) return null

  if (loading) return <QuizLoadingScreen />

  if (error) {
    return (
      <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>
        <div className="error-box" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}><AlertTriangle size={16} /> {error}</div>
        <Link to="/home" className="btn btn-secondary">Zurück</Link>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>
        <p className="text-muted">Keine Fragen verfügbar.</p>
        <Link to="/home" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Zurück</Link>
      </div>
    )
  }

  const questionNumber = currentQuestion.question_number ?? (currentQuestion.index + 1)
  const progressPct = ((questionNumber - 1) / totalQuestions) * 100
  const trackId = currentQuestion.trackId ?? null
  const previewUrl = currentQuestion.preview_url
  const albumImage = currentQuestion.image

  const guessFieldsList = quizRef.current?.guessFields ?? ['artist', 'title']

  const getInputClass = (field) => {
    if (!feedbackResult?.fieldResults?.[field]) return 'input'
    return feedbackResult.fieldResults[field].correct ? 'input input-correct' : 'input input-wrong'
  }

  const fieldConfig = {
    artist: { label: 'Interpret', placeholder: 'z.B. Taylor Swift', type: 'text', Icon: Mic },
    title: { label: 'Titel', placeholder: 'z.B. Shake It Off', type: 'text', Icon: Music },
    year: { label: 'Jahr', placeholder: 'z.B. 2014', type: 'text', inputMode: 'numeric', Icon: Calendar },
  }

  const currentTrack = quizRef.current?.tracks?.[currentQuestion.index]

  return (
    <div className="quiz-page">
      <nav className="sp-navbar">
        <div className="sp-navbar-inner">
          <Link to="/home" className="sp-nav-brand">
            <div className="sp-nav-logo"><MusicNote size={20} /></div>
            <span className="sp-nav-title">MusicChef</span>
          </Link>
          <div className="sp-navbar-right">
            {hasSpeedBonus && !answered && (
              <div className={`speed-timer ${elapsed <= 5 ? 'fast' : elapsed <= 10 ? 'medium' : 'slow'}`}>
                <Timer size={14} /> {elapsed}s
              </div>
            )}
            <Link to="/home" className="btn btn-ghost btn-sm"><X size={16} /> Beenden</Link>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="quiz-header">
          <div className="quiz-progress-info">
            <div className="quiz-progress-label">Frage {questionNumber} von {totalQuestions}</div>
            <div className="progress-bar-wrapper">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="quiz-score-badge"><Star size={16} /> {score} Pkt.</div>
        </div>

        <div className="quiz-layout">
          {/* ── Album Art ──────────────────────────────────── */}
          <div className="album-art-panel">
            <div className="album-art-wrapper">
              {albumImage ? (
                <img
                  className="album-art-img"
                  src={albumImage}
                  alt="Album Cover"
                  style={{
                    filter: `blur(${blurValue}px) brightness(${revealed ? 1 : 0.6})`,
                    transition: revealed ? 'filter 0.5s ease' : 'filter 2s linear',
                  }}
                />
              ) : (
                <div className="album-art-placeholder"><Music size={40} /></div>
              )}
              {!revealed && blurValue > 10 && (
                <div className="album-art-overlay"><Lock size={32} /></div>
              )}
            </div>
          </div>

          {/* ── Answer Panel ──────────────────────────────── */}
          <div className="answer-panel">
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '1.5rem',
            }}>
              <h3 style={{
                marginBottom: '1.25rem', color: 'var(--text-muted)',
                fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {inputMode === 'choice' ? 'Wähle die richtige Antwort' : 'Wer singt diesen Song?'}
              </h3>

              {/* ── Choice Mode ────────────────────────────── */}
              {inputMode === 'choice' && choices ? (
                <div className="choice-fields">
                  {guessFieldsList.map((field) => {
                    const opts = choices[field]
                    if (!opts) return null
                    const firstEmpty = guessFieldsList.find((f) => !fieldInputs[f]?.trim())
                    return (
                      <ChoiceField
                        key={field}
                        field={field}
                        options={opts}
                        selectedValue={fieldInputs[field]}
                        onSelect={handleChoiceSelect}
                        showKeys={field === firstEmpty}
                        correctValue={
                          field === 'artist' ? currentTrack?.artist
                            : field === 'title' ? currentTrack?.title
                              : String(currentTrack?.year ?? '')
                        }
                        answered={answered}
                        fieldResult={feedbackResult?.fieldResults?.[field]}
                      />
                    )
                  })}
                </div>
              ) : (
                /* ── Freetext Mode ──────────────────────────── */
                <div className="answer-inputs">
                  {guessFieldsList.map((field, idx) => {
                    const cfg = fieldConfig[field]
                    if (!cfg) return null
                    return (
                      <div className="input-group" key={field}>
                        <label className="input-label"><cfg.Icon size={14} /> {cfg.label}</label>
                        <input
                          ref={idx === 0 ? firstInputRef : undefined}
                          className={getInputClass(field)}
                          type={cfg.type}
                          inputMode={cfg.inputMode}
                          placeholder={cfg.placeholder}
                          value={fieldInputs[field] ?? ''}
                          onChange={(e) => setFieldInputs((prev) => ({ ...prev, [field]: e.target.value }))}
                          disabled={answered || submitting}
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </div>
                    )
                  })}

                  {!answered && (
                    <button
                      className="btn btn-primary"
                      onClick={handleSubmit}
                      disabled={submitting || !Object.values(fieldInputs).some((v) => v?.trim())}
                      style={{ marginTop: '0.25rem' }}
                    >
                      {submitting ? <><span className="spinner spinner-sm" /> Wird überprüft…</> : <><Check size={16} /> Antwort abschicken</>}
                    </button>
                  )}
                </div>
              )}
            </div>

            {feedbackResult && <FeedbackBanner result={feedbackResult} guessFields={guessFieldsList} />}

            {answered && (
              <button className="btn btn-primary btn-lg" onClick={handleNext} style={{ width: '100%' }}>
                {feedbackResult?.finished ? <><Trophy size={18} /> Ergebnis anzeigen</> : 'Weiter →'}
              </button>
            )}

            {!answered && inputMode === 'freetext' && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Enter = Absenden  ·  Leertaste = Play/Pause
              </p>
            )}
            {!answered && inputMode === 'choice' && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                1-4 = Auswahl  ·  Leertaste = Play/Pause
              </p>
            )}
            {answered && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Enter = Nächste Frage  ·  Leertaste = Play/Pause
              </p>
            )}
          </div>
        </div>
      </div>

      <PlayerBar
        ref={playerRef}
        trackId={trackId}
        previewUrl={previewUrl}
        sdkReady={sdkReady}
        sdkError={sdkError}
        onSkip={handleSkip}
        canSkip={!answered && !submitting}
        onTrackEnd={handleTrackEnd}
      />
    </div>
  )
}
