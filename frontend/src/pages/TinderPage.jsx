import React, {
  useState, useEffect, useRef, useCallback, useMemo,
  forwardRef, useImperativeHandle,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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
} from '../lib/spotify-player'
import Navbar from '../components/Navbar'
import GenreIcon from '../components/GenreIcon'
import {
  MusicNote, Heart, X, Check, Play, Pause, Music, Search,
  ChevronDown, Shuffle, ArrowLeft, ExternalLink, CheckCircle,
} from '../lib/icons'

const BATCH_SIZE = 20
const PREVIEW_DURATION = 30

/* ═══════════════════════════════════════════════════════════
   Swipe Card Player (inline, no fixed bar)
   ═══════════════════════════════════════════════════════════ */
const CardPlayer = forwardRef(function CardPlayer({ trackId, previewUrl, sdkReady }, ref) {
  const audioRef = useRef(null)
  const modeRef = useRef(null)
  const sdkPosRef = useRef({ ms: 0, ts: Date.now(), paused: true })
  const durRef = useRef(PREVIEW_DURATION)
  const animRef = useRef(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(PREVIEW_DURATION)
  const [seeking, setSeeking] = useState(false)
  const [mode, setMode] = useState(null)

  function updateMode(m) { modeRef.current = m; setMode(m) }

  useImperativeHandle(ref, () => ({
    async stop() {
      cancelAnimationFrame(animRef.current)
      setPlaying(false); setCurrentTime(0)
      if (modeRef.current === 'sdk') await sdkPause()
      const a = audioRef.current
      if (a) { a.pause(); a.currentTime = 0 }
    },
    async toggle() {
      if (modeRef.current === 'sdk') {
        sdkPosRef.current.paused ? await sdkResume() : await sdkPause()
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
      const t = state.track_window?.current_track
      if (t) { const d = t.duration_ms / 1000; durRef.current = d; setDuration(d) }
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
    if (a) { a.pause(); a.removeAttribute('src') }
    updateMode(null)
    if (!trackId && !previewUrl) return
    let cancelled = false
    ;(async () => {
      if (sdkReady && trackId && !isMobile()) {
        try { await sdkPlay(trackId); if (!cancelled) { updateMode('sdk'); setPlaying(true) }; return } catch { /* fallback */ }
      }
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
  }, [trackId, previewUrl, sdkReady])

  const togglePlay = useCallback(async () => {
    if (modeRef.current === 'sdk') { playing ? await sdkPause() : await sdkResume() }
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
    else if (modeRef.current === 'audio') { const a = audioRef.current; if (a) a.currentTime = v }
    setSeeking(false)
  }, [])

  const fmt = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="td-card-player">
      <audio ref={audioRef} preload="auto" playsInline style={{ display: 'none' }} />
      <button className="td-play-btn" onClick={togglePlay} disabled={!mode} aria-label={playing ? 'Pause' : 'Abspielen'}>
        {playing ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <span className="td-player-time">{fmt(currentTime)}</span>
      <div className="td-seek-wrap">
        <div className="td-seek-track"><div className="td-seek-fill" style={{ width: `${pct}%` }} /></div>
        <input className="td-seek-input" type="range" min={0} max={duration} step={0.1} value={currentTime}
          onPointerDown={handleSeekStart} onInput={handleSeekChange} onChange={handleSeekChange} onPointerUp={handleSeekEnd}
          disabled={!mode} aria-label="Seek" />
      </div>
      <span className="td-player-time">{fmt(duration)}</span>
    </div>
  )
})

/* ═══════════════════════════════════════════════════════════
   Filter Setup Panel
   ═══════════════════════════════════════════════════════════ */
function FilterPanel({ genre, onGenreChange, yearFrom, yearTo, onYearFromChange, onYearToChange, yearEnabled, onYearToggle, regionFilter, onRegionChange }) {
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
      <div className="td-filter-group">
        <label className="td-filter-label">Genre</label>
        <button className="td-filter-select" onClick={() => setShowGenres(!showGenres)}>
          {genre ? (
            <span className="td-filter-genre-picked">
              <GenreIcon icon={GENRES[genre]?.icon ?? 'music'} size={16} />
              {GENRES[genre]?.name ?? genre}
            </span>
          ) : (
            <span className="text-muted"><Shuffle size={14} /> Zufällig (alle Genres)</span>
          )}
          <ChevronDown size={16} className={showGenres ? 'rotated' : ''} />
        </button>

        {showGenres && (
          <div className="td-genre-dropdown">
            <div className="td-genre-regions">
              {regions.map((r) => (
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
                placeholder="Genre suchen…"
                value={genreSearch}
                onChange={(e) => setGenreSearch(e.target.value)}
              />
              {genreSearch && (
                <button className="genre-search-clear" onClick={() => setGenreSearch('')}>
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              className={`td-genre-option ${!genre ? 'active' : ''}`}
              onClick={() => { onGenreChange(null); setShowGenres(false) }}
            >
              <Shuffle size={14} /> Zufällig
            </button>
            {genres.map((g) => (
              <button
                key={g.id}
                className={`td-genre-option ${genre === g.id ? 'active' : ''}`}
                onClick={() => { onGenreChange(g.id); setShowGenres(false) }}
              >
                <GenreIcon icon={g.icon} size={14} /> {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="td-filter-group">
        <label className="td-filter-label">
          <input type="checkbox" checked={yearEnabled} onChange={(e) => onYearToggle(e.target.checked)} />
          Jahresbereich
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
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Result / Done Screen
   ═══════════════════════════════════════════════════════════ */
function DoneScreen({ likedTracks, saving, saved, playlistUrl, onSave, onReset, playlistName, onPlaylistNameChange }) {
  return (
    <div className="td-done">
      <div className="td-done-icon"><Heart size={48} /></div>
      <h2>{likedTracks.length} Songs gesammelt</h2>

      {likedTracks.length > 0 && !saved && (
        <div className="td-save-section">
          <label className="td-filter-label">Playlist-Name</label>
          <input
            className="input"
            value={playlistName}
            onChange={(e) => onPlaylistNameChange(e.target.value)}
            placeholder="z.B. Meine Entdeckungen"
            style={{ marginBottom: '0.75rem' }}
          />
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={onSave}
            disabled={saving || !playlistName.trim()}
          >
            {saving ? <><span className="spinner spinner-sm" /> Speichere…</> : <><Check size={18} /> Playlist erstellen</>}
          </button>
        </div>
      )}

      {saved && playlistUrl && (
        <div className="td-saved-msg">
          <CheckCircle size={20} />
          <span>Playlist erstellt!</span>
          <a href={playlistUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            <ExternalLink size={14} /> In Spotify öffnen
          </a>
        </div>
      )}

      {likedTracks.length > 0 && (
        <div className="td-liked-list">
          {likedTracks.map((t) => (
            <div key={t.id} className="td-liked-item">
              {t.image ? <img src={t.image} alt="" className="td-liked-img" /> : <div className="td-liked-img td-liked-img-placeholder"><Music size={16} /></div>}
              <div className="td-liked-text">
                <span className="td-liked-title">{t.title}</span>
                <span className="td-liked-artist">{t.artist}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-secondary" onClick={onReset} style={{ marginTop: '1rem' }}>
        <Shuffle size={16} /> Nochmal entdecken
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Tinder Page
   ═══════════════════════════════════════════════════════════ */
export default function TinderPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const playerRef = useRef(null)

  /* Phases: setup → swiping → done */
  const [phase, setPhase] = useState('setup')

  /* Filter state */
  const [genre, setGenre] = useState(null)
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

  /* Load a batch of tracks */
  const loadBatch = useCallback(async (existingSeenIds) => {
    setLoadingTracks(true)
    setError(null)
    try {
      const searchQuery = genre ? GENRES[genre]?.search ?? null : null
      const batch = await fetchDiscoverTracks(searchQuery, BATCH_SIZE, yearRange)
      const fresh = batch.filter((t) => !existingSeenIds.has(t.id))
      if (fresh.length === 0) throw new Error('Keine neuen Songs gefunden. Versuch ein anderes Genre.')
      return fresh
    } catch (err) {
      setError(err.message)
      return []
    } finally {
      setLoadingTracks(false)
    }
  }, [genre, yearRange])

  /* Start swiping */
  const handleStart = useCallback(async () => {
    setPhase('swiping')
    setLikedTracks([])
    setSeenIds(new Set())
    setCurrentIdx(0)
    setSaved(false)
    setPlaylistUrl(null)
    setPlaylistName(genre ? `${GENRES[genre]?.name ?? 'Mix'} Entdeckungen` : 'Meine Entdeckungen')

    ensureSdk()

    const newSeen = new Set()
    const batch = await loadBatch(newSeen)
    batch.forEach((t) => newSeen.add(t.id))
    setSeenIds(newSeen)
    setTracks(batch)
  }, [genre, loadBatch, ensureSdk])

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
      batch.forEach((t) => newSeen.add(t.id))
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
      const pl = await createPlaylist(user.id, playlistName.trim(), 'Erstellt mit MusicChef Entdecken')
      const uris = likedTracks.map((t) => `spotify:track:${t.id}`)
      await addTracksToPlaylist(pl.id, uris)
      setPlaylistUrl(pl.external_urls?.spotify ?? null)
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }, [user, likedTracks, playlistName])

  const handleReset = useCallback(() => {
    setPhase('setup')
    setTracks([])
    setCurrentIdx(0)
    setLikedTracks([])
    setSeenIds(new Set())
    setSaved(false)
    setPlaylistUrl(null)
    setError(null)
  }, [])

  return (
    <div className="td-page">
      <Navbar user={user} onLogout={logout} />

      <div className="container td-container">
        {/* ── SETUP ─────────────────────────────────────── */}
        {phase === 'setup' && (
          <div className="td-setup">
            <div className="td-setup-header">
              <h1 className="gradient-text">Songs entdecken</h1>
              <p className="text-muted">Swipe durch Songs und erstelle deine Playlist</p>
            </div>

            <FilterPanel
              genre={genre}
              onGenreChange={setGenre}
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
              <Shuffle size={18} /> Los geht's
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
                Fertig
              </button>
            </div>

            {loadingTracks && !currentTrack && (
              <div className="td-loading">
                <span className="spinner" /> Songs werden geladen…
              </div>
            )}

            {error && !currentTrack && (
              <div className="td-error">
                <p>{error}</p>
                <button className="btn btn-secondary btn-sm" onClick={handleReset}>Zurück</button>
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
                  <button className="td-action-btn td-action-skip" onClick={handleSkipTrack} aria-label="Überspringen">
                    <X size={28} />
                  </button>
                  <button className="td-action-btn td-action-like" onClick={handleLike} aria-label="Zur Playlist hinzufügen">
                    <Heart size={28} />
                  </button>
                </div>

                <p className="td-hint">
                  ← Skippen · Hinzufügen → · Leertaste = Play/Pause
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
