import React, {
  useState, useEffect, useRef, useCallback, useMemo,
  forwardRef, useImperativeHandle,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../context/LanguageContext'
import { GENRES, getGenresList, getRegionsList } from '../lib/genres'
import {
  fetchDiscoverTracks,
  createPlaylist,
  addTracksToPlaylist,
} from '../lib/spotify-api'
import {
  connectPlayer as initSdk,
  play as sdkPlay,
  pause as sdkPause,
  resume as sdkResume,
  seek as sdkSeek,
  onStateChange as sdkOnStateChange,
  disconnect as sdkDisconnect,
  isMobile,
  mobilePlay as connectPlay,
  mobilePause as connectPause,
  mobileResume as connectResume,
  mobileSeek as connectSeekTo,
  clearMobileDevice,
} from '../lib/spotify-player'
import Navbar from '../components/Navbar'
import GenreIcon from '../components/GenreIcon'
import {
  MusicNote, Heart, X, Check, Play, Pause, Music, Search,
  ChevronDown, Shuffle, ArrowLeft, ExternalLink, CheckCircle,
  Coffee, Zap, Target, Moon, Sun, Compass, Sparkles, Headphones,
} from '../lib/icons'

const BATCH_SIZE = 20
const PREVIEW_DURATION = 30

/* ── Stimmungen / Moods ───────────────────────────────────── */
const MOODS = [
  { id: 'chill', name: 'Chill', icon: Coffee, search: 'chill lounge ambient' },
  { id: 'party', name: 'Party', icon: Sparkles, search: 'party dance club' },
  { id: 'workout', name: 'Workout', icon: Zap, search: 'workout gym energy' },
  { id: 'focus', name: 'Focus', icon: Target, search: 'focus study instrumental' },
  { id: 'romantic', name: 'Romantisch', icon: Heart, search: 'romantic love ballad' },
  { id: 'melancholy', name: 'Melancholisch', icon: Moon, search: 'sad melancholy' },
  { id: 'feelgood', name: 'Feel Good', icon: Sun, search: 'happy feel good upbeat' },
  { id: 'roadtrip', name: 'Road Trip', icon: Compass, search: 'road trip driving' },
]

/* ═══════════════════════════════════════════════════════════
   Swipe Card Player (inline, no fixed bar)
   ═══════════════════════════════════════════════════════════ */
const CardPlayer = forwardRef(function CardPlayer({ trackId, previewUrl, sdkReady, durationMs }, ref) {
  const { t } = useTranslation()
  const audioRef = useRef(null)
  const modeRef = useRef(null)
  const sdkPosRef = useRef({ ms: 0, ts: Date.now(), paused: true })
  const connectRef = useRef({ startTs: 0, offsetMs: 0, durMs: 30000, paused: true })
  const durRef = useRef(PREVIEW_DURATION)
  const animRef = useRef(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(PREVIEW_DURATION)
  const [seeking, setSeeking] = useState(false)
  const [mode, setMode] = useState(null)
  const [noDevice, setNoDevice] = useState(false)

  function updateMode(m) { modeRef.current = m; setMode(m) }

  useImperativeHandle(ref, () => ({
    async stop() {
      cancelAnimationFrame(animRef.current)
      setPlaying(false); setCurrentTime(0)
      if (modeRef.current === 'sdk') await sdkPause()
      if (modeRef.current === 'connect') { await connectPause(); connectRef.current.paused = true }
      const a = audioRef.current
      if (a) { a.pause(); a.currentTime = 0 }
    },
    async toggle() {
      if (modeRef.current === 'sdk') {
        sdkPosRef.current.paused ? await sdkResume() : await sdkPause()
      } else if (modeRef.current === 'connect') {
        const c = connectRef.current
        if (c.paused) {
          await connectResume(); c.startTs = Date.now(); c.paused = false; setPlaying(true)
        } else {
          await connectPause(); c.offsetMs += Date.now() - c.startTs; c.paused = true; setPlaying(false)
        }
      } else if (modeRef.current === 'audio') {
        const a = audioRef.current
        if (!a) return
        if (a.paused) { a.play().catch(() => {}); setPlaying(true) }
        else { a.pause(); setPlaying(false) }
      }
    },
  }))

  useEffect(() => {
    if (!sdkReady) return
    return sdkOnStateChange((state) => {
      if (!state || modeRef.current !== 'sdk') return
      const tr = state.track_window?.current_track
      if (tr) { const d = tr.duration_ms / 1000; durRef.current = d; setDuration(d) }
      sdkPosRef.current = { ms: state.position, ts: Date.now(), paused: state.paused }
      setPlaying(!state.paused)
    })
  }, [sdkReady])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onMeta = () => { if (modeRef.current === 'audio' && a.duration && isFinite(a.duration)) { durRef.current = a.duration; setDuration(a.duration) } }
    const onEnded = () => { if (modeRef.current === 'audio') setPlaying(false) }
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('ended', onEnded)
    return () => { a.removeEventListener('loadedmetadata', onMeta); a.removeEventListener('ended', onEnded) }
  }, [])

  /* Position ticker */
  const syncPos = useCallback(() => {
    if (!seeking) {
      if (modeRef.current === 'sdk') {
        const s = sdkPosRef.current
        const pos = s.paused ? s.ms / 1000 : s.ms / 1000 + (Date.now() - s.ts) / 1000
        setCurrentTime(Math.max(0, pos))
      } else if (modeRef.current === 'connect') {
        const c = connectRef.current
        const elapsed = c.paused ? c.offsetMs : c.offsetMs + (Date.now() - c.startTs)
        const pos = elapsed / 1000
        const dur = c.durMs / 1000
        setCurrentTime(Math.max(0, Math.min(pos, dur)))
        if (!c.paused && pos >= dur) { c.paused = true; setPlaying(false) }
      } else if (modeRef.current === 'audio') {
        const a = audioRef.current
        if (a) setCurrentTime(a.currentTime)
      }
    }
    animRef.current = requestAnimationFrame(syncPos)
  }, [seeking])

  useEffect(() => {
    animRef.current = requestAnimationFrame(syncPos)
    return () => cancelAnimationFrame(animRef.current)
  }, [syncPos])

  /* Track change */
  useEffect(() => {
    const a = audioRef.current
    setPlaying(false); setCurrentTime(0); durRef.current = PREVIEW_DURATION; setDuration(PREVIEW_DURATION)
    connectRef.current = { startTs: 0, offsetMs: 0, durMs: 30000, paused: true }
    setNoDevice(false)
    if (a) { a.pause(); a.removeAttribute('src') }
    updateMode(null)
    if (!trackId && !previewUrl) return
    let cancelled = false
    ;(async () => {
      /* Desktop: SDK */
      if (sdkReady && trackId && !isMobile()) {
        try { await sdkPlay(trackId); if (!cancelled) { updateMode('sdk'); setPlaying(true) }; return } catch { /* fallback */ }
      }

      /* Mobile: Spotify Connect */
      if (isMobile() && trackId) {
        try {
          await connectPlay(trackId)
          if (!cancelled) {
            const dur = (durationMs && durationMs > 0) ? durationMs : 30000
            connectRef.current = { startTs: Date.now(), offsetMs: 0, durMs: dur, paused: false }
            durRef.current = dur / 1000
            setDuration(dur / 1000)
            updateMode('connect')
            setPlaying(true)
          }
          return
        } catch (e) {
          if (e.message === 'NO_DEVICE' && !cancelled) setNoDevice(true)
        }
      }

      /* Fallback: Audio-Preview */
      if (previewUrl && a && !cancelled) {
        updateMode('audio')
        a.src = previewUrl
        a.load()
        if (!isMobile()) {
          a.play().then(() => { if (!cancelled) setPlaying(true) }).catch(() => {})
        }
      }
    })()
    return () => { cancelled = true }
  }, [trackId, previewUrl, sdkReady, durationMs])

  const togglePlay = useCallback(async () => {
    if (modeRef.current === 'sdk') { playing ? await sdkPause() : await sdkResume() }
    else if (modeRef.current === 'connect') {
      const c = connectRef.current
      if (c.paused) {
        await connectResume(); c.startTs = Date.now(); c.paused = false; setPlaying(true)
      } else {
        await connectPause(); c.offsetMs += Date.now() - c.startTs; c.paused = true; setPlaying(false)
      }
    }
    else if (modeRef.current === 'audio') {
      const a = audioRef.current; if (!a) return
      if (playing) { a.pause(); setPlaying(false) }
      else { a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) }
    }
  }, [playing])

  const handleSeekStart = useCallback(() => setSeeking(true), [])
  const handleSeekChange = useCallback((e) => setCurrentTime(parseFloat(e.target.value)), [])
  const handleSeekEnd = useCallback(async (e) => {
    const v = parseFloat(e.target.value)
    if (modeRef.current === 'sdk') { await sdkSeek(v * 1000); sdkPosRef.current = { ...sdkPosRef.current, ms: v * 1000, ts: Date.now() } }
    else if (modeRef.current === 'connect') { await connectSeekTo(v * 1000); connectRef.current.offsetMs = v * 1000; connectRef.current.startTs = Date.now() }
    else if (modeRef.current === 'audio') { const a = audioRef.current; if (a) a.currentTime = v }
    setSeeking(false)
  }, [])

  const fmt = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="td-card-player">
      <audio ref={audioRef} preload="auto" playsInline style={{ display: 'none' }} />
      <button className="td-play-btn" onClick={togglePlay} disabled={!mode && !noDevice} aria-label={playing ? t('quiz.pause') : t('quiz.play')}>
        {playing ? <Pause size={20} /> : <Play size={20} />}
      </button>
      {noDevice ? (
        <div className="td-no-device">
          <span>{t('discover.startSpotify').split('{link}')[0]}<a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{t('quiz.webPlayer')}</a>{t('discover.startSpotify').split('{link}')[1]}</span>
          <button className="td-retry-btn" onClick={() => { setNoDevice(false); clearMobileDevice() }}>
            {t('discover.retry')}
          </button>
        </div>
      ) : (
        <>
          <span className="td-player-time">{fmt(currentTime)}</span>
          <div className="td-seek-wrap">
            <div className="td-seek-track"><div className="td-seek-fill" style={{ width: `${pct}%` }} /></div>
            <input className="td-seek-input" type="range" min={0} max={duration} step={0.1} value={currentTime}
              onPointerDown={handleSeekStart} onInput={handleSeekChange} onChange={handleSeekChange} onPointerUp={handleSeekEnd}
              disabled={!mode} aria-label="Seek" />
          </div>
          <span className="td-player-time">{fmt(duration)}</span>
        </>
      )}
    </div>
  )
})

/* ═══════════════════════════════════════════════════════════
   Filter Setup Panel (Moods + Multi-Genre)
   ═══════════════════════════════════════════════════════════ */
function FilterPanel({
  selectedGenres, onToggleGenre, selectedMoods, onToggleMood,
  yearFrom, yearTo, onYearFromChange, onYearToChange,
  yearEnabled, onYearToggle, regionFilter, onRegionChange,
}) {
  const { t } = useTranslation()
  const [genreSearch, setGenreSearch] = useState('')
  const [showGenres, setShowGenres] = useState(false)
  const regions = useMemo(() => getRegionsList(), [])
  const genres = useMemo(() => {
    const list = getGenresList(regionFilter)
    if (!genreSearch.trim()) return list
    const q = genreSearch.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return list.filter((g) =>
      g.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
    )
  }, [regionFilter, genreSearch])

  return (
    <div className="td-filters">
      {/* Stimmungen */}
      <div className="td-filter-group">
        <label className="td-filter-label">{t('discover.mood')}</label>
        <div className="td-mood-grid">
          {MOODS.map((mood) => {
            const Icon = mood.icon
            const active = selectedMoods.includes(mood.id)
            return (
              <button
                key={mood.id}
                className={`td-mood-chip ${active ? 'active' : ''}`}
                onClick={() => onToggleMood(mood.id)}
              >
                <Icon size={16} />
                <span>{t('discover.' + mood.id)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Genres */}
      <div className="td-filter-group">
        <label className="td-filter-label">
          {t('discover.genres')}
          {selectedGenres.length > 0 && (
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              ({t('discover.genresSelected', { count: selectedGenres.length })})
            </span>
          )}
        </label>
        <button className="td-filter-select" onClick={() => setShowGenres(!showGenres)}>
          {selectedGenres.length > 0 ? (
            <span className="td-filter-genre-picked">
              {selectedGenres.slice(0, 3).map((gId) => (
                <span key={gId} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.5rem' }}>
                  <GenreIcon icon={GENRES[gId]?.icon ?? 'music'} size={14} />
                  {GENRES[gId]?.name ?? gId}
                </span>
              ))}
              {selectedGenres.length > 3 && <span className="text-muted">+{selectedGenres.length - 3}</span>}
            </span>
          ) : (
            <span className="text-muted"><Shuffle size={14} /> {t('discover.noRestriction')}</span>
          )}
          <ChevronDown size={16} className={showGenres ? 'rotated' : ''} />
        </button>

        {showGenres && (
          <div className="td-genre-dropdown">
            <div className="td-genre-regions">
              {regions.filter((r) => r.group === 'continent').map((r) => (
                <button
                  key={r.id}
                  className={`td-region-btn ${regionFilter === r.id ? 'active' : ''}`}
                  onClick={() => onRegionChange(r.id)}
                >
                  {r.name}
                </button>
              ))}
              <span className="region-divider" />
              {regions.filter((r) => r.group === 'country').map((r) => (
                <button
                  key={r.id}
                  className={`td-region-btn ${regionFilter === r.id ? 'active' : ''}`}
                  onClick={() => onRegionChange(r.id)}
                >
                  {r.name}
                </button>
              ))}
            </div>
            <div className="genre-search-wrap" style={{ margin: '0.5rem 0' }}>
              <Search size={14} className="genre-search-icon" />
              <input
                className="genre-search-input"
                placeholder={t('discover.searchGenre')}
                value={genreSearch}
                onChange={(e) => setGenreSearch(e.target.value)}
              />
              {genreSearch && (
                <button className="genre-search-clear" onClick={() => setGenreSearch('')}>
                  <X size={12} />
                </button>
              )}
            </div>
            {selectedGenres.length > 0 && (
              <button
                className="td-genre-option"
                onClick={() => { selectedGenres.forEach((g) => onToggleGenre(g)); setShowGenres(false) }}
                style={{ color: 'var(--error)' }}
              >
                <X size={14} /> {t('discover.clearSelection')}
              </button>
            )}
            {genres.map((g) => (
              <button
                key={g.id}
                className={`td-genre-option ${selectedGenres.includes(g.id) ? 'active' : ''}`}
                onClick={() => onToggleGenre(g.id)}
              >
                <GenreIcon icon={g.icon} size={14} /> {g.name}
                {selectedGenres.includes(g.id) && <CheckCircle size={14} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Jahresbereich */}
      <div className="td-filter-group">
        <label className="td-filter-label">
          <input type="checkbox" checked={yearEnabled} onChange={(e) => onYearToggle(e.target.checked)} />
          {t('discover.yearRange')}
        </label>
        {yearEnabled && (
          <div className="td-year-range">
            <input type="number" min={1950} max={2026} value={yearFrom} onChange={(e) => onYearFromChange(+e.target.value)} className="td-year-input" />
            <span className="text-muted">–</span>
            <input type="number" min={1950} max={2026} value={yearTo} onChange={(e) => onYearToChange(+e.target.value)} className="td-year-input" />
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Swipe Card
   ═══════════════════════════════════════════════════════════ */
function SwipeCard({ track, playerRef, sdkReady, onLike, onSkip, swipeDir }) {
  const cardRef = useRef(null)
  const startX = useRef(0)
  const currentX = useRef(0)
  const dragging = useRef(false)
  const [dragOffset, setDragOffset] = useState(0)

  const onPointerDown = useCallback((e) => {
    if (e.target.closest('.td-card-player') || e.target.closest('a')) return
    dragging.current = true
    startX.current = e.clientX
    currentX.current = e.clientX
    cardRef.current?.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return
    currentX.current = e.clientX
    setDragOffset(currentX.current - startX.current)
  }, [])

  const onPointerUp = useCallback((e) => {
    if (!dragging.current) return
    dragging.current = false
    cardRef.current?.releasePointerCapture(e.pointerId)
    const dx = currentX.current - startX.current
    if (dx > 80) onLike()
    else if (dx < -80) onSkip()
    setDragOffset(0)
  }, [onLike, onSkip])

  const rotation = dragOffset * 0.08
  const opacity = Math.max(0, 1 - Math.abs(dragOffset) / 300)

  let exitClass = ''
  if (swipeDir === 'left') exitClass = 'td-card-exit-left'
  if (swipeDir === 'right') exitClass = 'td-card-exit-right'

  return (
    <div
      ref={cardRef}
      className={`td-card ${exitClass}`}
      style={!exitClass ? { transform: `translateX(${dragOffset}px) rotate(${rotation}deg)`, opacity } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {dragOffset > 40 && <div className="td-card-badge td-badge-like"><Heart size={32} /></div>}
      {dragOffset < -40 && <div className="td-card-badge td-badge-skip"><X size={32} /></div>}

      <div className="td-card-image">
        {track.image ? (
          <img src={track.image} alt="" draggable={false} />
        ) : (
          <div className="td-card-image-placeholder"><Music size={48} /></div>
        )}
      </div>

      <div className="td-card-info">
        <div className="td-card-title">{track.title}</div>
        <div className="td-card-artist">{track.all_artists}</div>
        {track.album && <div className="td-card-album">{track.album}{track.year ? ` · ${track.year}` : ''}</div>}
      </div>

      <CardPlayer
        ref={playerRef}
        trackId={track.id}
        previewUrl={track.preview_url}
        sdkReady={sdkReady}
        durationMs={track.duration_ms}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Result / Done Screen
   ═══════════════════════════════════════════════════════════ */
function DoneScreen({ likedTracks, saving, saved, playlistUrl, onSave, onReset, playlistName, onPlaylistNameChange }) {
  const { t } = useTranslation()
  return (
    <div className="td-done">
      <div className="td-done-icon"><Heart size={48} /></div>
      <h2>{t('discover.songsCollected', { count: likedTracks.length })}</h2>

      {likedTracks.length > 0 && !saved && (
        <div className="td-save-section">
          <label className="td-filter-label">{t('discover.playlistName')}</label>
          <input
            className="input"
            value={playlistName}
            onChange={(e) => onPlaylistNameChange(e.target.value)}
            placeholder={t('discover.playlistPlaceholder')}
            style={{ marginBottom: '0.75rem' }}
          />
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={onSave}
            disabled={saving || !playlistName.trim()}
          >
            {saving ? <><span className="spinner spinner-sm" /> {t('discover.saving')}</> : <><Check size={18} /> {t('discover.createPlaylist')}</>}
          </button>
        </div>
      )}

      {saved && playlistUrl && (
        <div className="td-saved-msg">
          <CheckCircle size={20} />
          <span>{t('discover.playlistCreated')}</span>
          <a href={playlistUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            <ExternalLink size={14} /> {t('discover.openInSpotify')}
          </a>
        </div>
      )}

      {likedTracks.length > 0 && (
        <div className="td-liked-list">
          {likedTracks.map((tr) => (
            <div key={tr.id} className="td-liked-item">
              {tr.image ? <img src={tr.image} alt="" className="td-liked-img" /> : <div className="td-liked-img td-liked-img-placeholder"><Music size={16} /></div>}
              <div className="td-liked-text">
                <span className="td-liked-title">{tr.title}</span>
                <span className="td-liked-artist">{tr.artist}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-secondary" onClick={onReset} style={{ marginTop: '1rem' }}>
        <Shuffle size={16} /> {t('discover.rediscover')}
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Tinder Page
   ═══════════════════════════════════════════════════════════ */
export default function TinderPage() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const playerRef = useRef(null)

  /* Phases: setup → swiping → done */
  const [phase, setPhase] = useState('setup')

  /* Filter state */
  const [selectedGenres, setSelectedGenres] = useState([])
  const [selectedMoods, setSelectedMoods] = useState([])
  const [regionFilter, setRegionFilter] = useState('all')
  const [yearEnabled, setYearEnabled] = useState(false)
  const [yearFrom, setYearFrom] = useState(2010)
  const [yearTo, setYearTo] = useState(new Date().getFullYear())

  /* Swipe state */
  const [tracks, setTracks] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [likedTracks, setLikedTracks] = useState([])
  const [seenIds, setSeenIds] = useState(new Set())
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [swipeDir, setSwipeDir] = useState(null)
  const [error, setError] = useState(null)

  /* Save state */
  const [playlistName, setPlaylistName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [playlistUrl, setPlaylistUrl] = useState(null)

  /* SDK – erst beim Swipen verbinden, nicht beim Setup */
  const [sdkReady, setSdkReady] = useState(false)
  const sdkInitRef = useRef(false)

  const ensureSdk = useCallback(async () => {
    if (sdkInitRef.current) return
    sdkInitRef.current = true
    try {
      await initSdk()
      setSdkReady(true)
    } catch (err) {
      console.warn('[Tinder SDK]', err.message)
    }
  }, [])

  useEffect(() => {
    return () => { sdkDisconnect() }
  }, [])

  const currentTrack = tracks[currentIdx] ?? null
  const yearRange = yearEnabled ? { from: yearFrom, to: yearTo } : null

  const handleToggleGenre = useCallback((genreId) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
    )
  }, [])

  const handleToggleMood = useCallback((moodId) => {
    setSelectedMoods((prev) =>
      prev.includes(moodId) ? prev.filter((m) => m !== moodId) : [...prev, moodId]
    )
  }, [])

  /* Load a batch of tracks – combines genre + mood search queries */
  const loadBatch = useCallback(async (existingSeenIds) => {
    setLoadingTracks(true)
    setError(null)
    try {
      const queries = []
      for (const gId of selectedGenres) {
        const info = GENRES[gId]
        if (info) queries.push(info.search)
      }
      for (const mId of selectedMoods) {
        const mood = MOODS.find((m) => m.id === mId)
        if (mood) queries.push(mood.search)
      }

      let batch
      if (queries.length > 0) {
        /* Fetch from multiple queries in parallel, deduplicate */
        const perQuery = Math.max(Math.ceil(BATCH_SIZE / queries.length), 8)
        const results = await Promise.all(
          queries.map((q) => fetchDiscoverTracks(q, perQuery, yearRange).catch(() => []))
        )
        const seen = new Set()
        const merged = []
        for (const arr of results) {
          for (const tr of arr) {
            if (!seen.has(tr.id) && !existingSeenIds.has(tr.id)) { seen.add(tr.id); merged.push(tr) }
          }
        }
        /* Shuffle to mix genres/moods */
        for (let i = merged.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[merged[i], merged[j]] = [merged[j], merged[i]]
        }
        batch = merged.slice(0, BATCH_SIZE)
      } else {
        batch = await fetchDiscoverTracks(null, BATCH_SIZE, yearRange)
        batch = batch.filter((tr) => !existingSeenIds.has(tr.id))
      }

      if (batch.length === 0) throw new Error(t('discover.noSongsFound'))
      return batch
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoadingTracks(false)
    }
  }, [selectedGenres, selectedMoods, yearRange, t])

  /* Start swiping */
  const handleStart = useCallback(async () => {
    setPhase('swiping')
    setLikedTracks([])
    setSeenIds(new Set())
    setCurrentIdx(0)
    setSaved(false)
    setPlaylistUrl(null)

    const genreNames = selectedGenres.map((gId) => GENRES[gId]?.name).filter(Boolean)
    const moodNames = selectedMoods.map((mId) => t('discover.' + mId)).filter(Boolean)
    const label = [...genreNames, ...moodNames].slice(0, 3).join(', ') || 'Mix'
    setPlaylistName(`${label} ${t('discover.discoveries')}`)

    ensureSdk()

    const newSeen = new Set()
    const batch = await loadBatch(newSeen)
    batch.forEach((tr) => newSeen.add(tr.id))
    setSeenIds(newSeen)
    setTracks(batch)
  }, [genre, loadBatch, ensureSdk, t])

  /* Advance to next track, load more if needed */
  const advance = useCallback(async () => {
    const nextIdx = currentIdx + 1
    if (nextIdx < tracks.length) {
      setCurrentIdx(nextIdx)
    } else {
      /* Try loading more */
      const batch = await loadBatch(seenIds)
      if (batch.length === 0) {
        playerRef.current?.stop()
        setPhase('done')
        return
      }
      const newSeen = new Set(seenIds)
      batch.forEach((tr) => newSeen.add(tr.id))
      setSeenIds(newSeen)
      setTracks(batch)
      setCurrentIdx(0)
    }
  }, [currentIdx, tracks, seenIds, loadBatch])

  const animateAndAdvance = useCallback((dir) => {
    playerRef.current?.stop()
    setSwipeDir(dir)
    setTimeout(() => { setSwipeDir(null); advance() }, 300)
  }, [advance])

  const handleLike = useCallback(() => {
    if (!currentTrack) return
    setLikedTracks((prev) => [...prev, currentTrack])
    animateAndAdvance('right')
  }, [currentTrack, animateAndAdvance])

  const handleSkipTrack = useCallback(() => {
    if (!currentTrack) return
    animateAndAdvance('left')
  }, [currentTrack, animateAndAdvance])

  const handleFinish = useCallback(() => {
    playerRef.current?.stop()
    setPhase('done')
  }, [])

  /* Keyboard */
  useEffect(() => {
    if (phase !== 'swiping') return
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'l') { e.preventDefault(); handleLike() }
      else if (e.key === 'ArrowLeft' || e.key === 'h') { e.preventDefault(); handleSkipTrack() }
      else if (e.key === ' ') { e.preventDefault(); playerRef.current?.toggle?.() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, handleLike, handleSkipTrack])

  /* Save playlist */
  const handleSave = useCallback(async () => {
    if (!user?.id || likedTracks.length === 0 || !playlistName.trim()) return
    setSaving(true)
    try {
      const pl = await createPlaylist(user.id, playlistName.trim(), t('discover.createdWith'))
      const uris = likedTracks.map((tr) => `spotify:track:${tr.id}`)
      await addTracksToPlaylist(pl.id, uris)
      setPlaylistUrl(pl.external_urls?.spotify ?? null)
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }, [user, likedTracks, playlistName, t])

  const handleReset = useCallback(() => {
    setPhase('setup')
    setTracks([])
    setCurrentIdx(0)
    setLikedTracks([])
    setSeenIds(new Set())
    setSaved(false)
    setPlaylistUrl(null)
    setError(null)
    setSelectedGenres([])
    setSelectedMoods([])
  }, [])

  return (
    <div className="td-page">
      <Navbar user={user} onLogout={logout} />

      <div className="container td-container">
        {/* ── SETUP ─────────────────────────────────────── */}
        {phase === 'setup' && (
          <div className="td-setup">
            <div className="td-setup-header">
              <h1 className="gradient-text">{t('discover.title')}</h1>
              <p className="text-muted">{t('discover.subtitle')}</p>
            </div>

            <FilterPanel
              selectedGenres={selectedGenres}
              onToggleGenre={handleToggleGenre}
              selectedMoods={selectedMoods}
              onToggleMood={handleToggleMood}
              regionFilter={regionFilter}
              onRegionChange={setRegionFilter}
              yearFrom={yearFrom}
              yearTo={yearTo}
              onYearFromChange={setYearFrom}
              onYearToChange={setYearTo}
              yearEnabled={yearEnabled}
              onYearToggle={setYearEnabled}
            />

            <button className="btn btn-primary btn-lg btn-block" onClick={handleStart}>
              <Shuffle size={18} /> {selectedGenres.length === 0 && selectedMoods.length === 0 ? t('discover.surpriseMe') : t('discover.letsGo')}
            </button>
          </div>
        )}

        {/* ── SWIPING ───────────────────────────────────── */}
        {phase === 'swiping' && (
          <div className="td-swiping">
            <div className="td-swiping-header">
              <div className="td-liked-count">
                <Heart size={16} /> {likedTracks.length}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleFinish}>
                {t('discover.finished')}
              </button>
            </div>

            {loadingTracks && !currentTrack && (
              <div className="td-loading">
                <span className="spinner" /> {t('discover.loadingTracks')}
              </div>
            )}

            {error && !currentTrack && (
              <div className="td-error">
                <p>{error}</p>
                <button className="btn btn-secondary btn-sm" onClick={handleReset}>{t('common.back')}</button>
              </div>
            )}

            {currentTrack && (
              <>
                <div className="td-card-area">
                  <SwipeCard
                    key={currentTrack.id}
                    track={currentTrack}
                    playerRef={playerRef}
                    sdkReady={sdkReady}
                    onLike={handleLike}
                    onSkip={handleSkipTrack}
                    swipeDir={swipeDir}
                  />
                </div>

                <div className="td-actions">
                  <button className="td-action-btn td-action-skip" onClick={handleSkipTrack} aria-label={t('discover.skip')}>
                    <X size={28} />
                  </button>
                  <button className="td-action-btn td-action-like" onClick={handleLike} aria-label={t('discover.addToPlaylist')}>
                    <Heart size={28} />
                  </button>
                </div>

                <p className="td-hint">
                  {t('discover.hint')}
                </p>
              </>
            )}
          </div>
        )}

        {/* ── DONE ──────────────────────────────────────── */}
        {phase === 'done' && (
          <DoneScreen
            likedTracks={likedTracks}
            saving={saving}
            saved={saved}
            playlistUrl={playlistUrl}
            onSave={handleSave}
            onReset={handleReset}
            playlistName={playlistName}
            onPlaylistNameChange={setPlaylistName}
          />
        )}
      </div>
    </div>
  )
}
