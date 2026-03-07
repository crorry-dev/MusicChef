import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getGenresList, getRegionsList } from '../lib/genres'
import { fetchUserPlaylists } from '../lib/spotify-api'

/* ── Quick Presets ─────────────────────────────────────────── */
const QUICK_COUNTS = [5, 10, 15, 20]

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  /* ── Source state ─────────────────────────────────────────── */
  const [playlists, setPlaylists] = useState([])
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [loadingPlaylists, setLoadingPlaylists] = useState(true)
  const [tab, setTab] = useState('genre')
  const [regionFilter, setRegionFilter] = useState('all')

  /* ── Quiz settings ────────────────────────────────────────── */
  const [count, setCount] = useState(10)
  const [useAllTracks, setUseAllTracks] = useState(false)
  const [guessFields, setGuessFields] = useState(['artist', 'title', 'year'])
  const [inputMode, setInputMode] = useState('freetext')
  const [speedBonus, setSpeedBonus] = useState(false)
  const [revealCover, setRevealCover] = useState(true)
  const [yearEnabled, setYearEnabled] = useState(false)
  const [yearFrom, setYearFrom] = useState(2010)
  const [yearTo, setYearTo] = useState(new Date().getFullYear())

  /* ── Derived lists ────────────────────────────────────────── */
  const regions = useMemo(() => getRegionsList(), [])
  const genres = useMemo(() => getGenresList(regionFilter), [regionFilter])

  useEffect(() => {
    fetchUserPlaylists()
      .then(setPlaylists)
      .catch(() => {})
      .finally(() => setLoadingPlaylists(false))
  }, [])

  /* Clear genre selection when switching regions (genre might not be in new list) */
  useEffect(() => {
    if (selectedGenre && selectedGenre.id !== '__random__') {
      const stillExists = genres.some((g) => g.id === selectedGenre.id)
      if (!stillExists) setSelectedGenre(null)
    }
  }, [genres, selectedGenre])

  /* ── Handlers ─────────────────────────────────────────────── */
  const handleGenreSelect = useCallback((genre) => {
    setSelectedGenre((prev) => (prev?.id === genre.id ? null : genre))
    setSelectedPlaylist(null)
  }, [])

  const handlePlaylistSelect = useCallback((pl) => {
    setSelectedPlaylist((prev) => (prev?.id === pl.id ? null : pl))
    setSelectedGenre(null)
    if (pl.tracks && pl.tracks > 0) {
      setCount(Math.min(pl.tracks, 50))
    }
  }, [])

  const toggleGuessField = useCallback((field) => {
    setGuessFields((prev) => {
      if (prev.includes(field)) {
        return prev.length <= 1 ? prev : prev.filter((f) => f !== field)
      }
      return [...prev, field]
    })
  }, [])

  const effectiveCount = useMemo(() => {
    if (useAllTracks && selectedPlaylist?.tracks > 0) {
      return Math.min(selectedPlaylist.tracks, 50)
    }
    return count
  }, [useAllTracks, selectedPlaylist, count])

  const handleStartQuiz = useCallback(() => {
    if (!selectedGenre && !selectedPlaylist) return

    const state = {
      count: effectiveCount,
      guessFields,
      inputMode,
      speedBonus,
      revealCover,
    }

    if (selectedPlaylist) {
      state.mode = 'playlist'
      state.playlist_id = selectedPlaylist.id
      state.genre = null
    } else if (selectedGenre?.id === '__random__') {
      state.mode = 'random'
      state.genre = null
    } else {
      state.mode = 'genre'
      state.genre = selectedGenre.id
    }

    if (yearEnabled && state.mode !== 'playlist') {
      state.yearRange = { from: yearFrom, to: yearTo }
    }

    navigate('/quiz', { state })
  }, [
    selectedGenre, selectedPlaylist, effectiveCount, guessFields,
    inputMode, speedBonus, revealCover, yearEnabled, yearFrom, yearTo, navigate,
  ])

  const canStart = selectedGenre !== null || selectedPlaylist !== null

  const selectionLabel = selectedPlaylist
    ? selectedPlaylist.name
    : selectedGenre
      ? selectedGenre.name
      : null

  return (
    <div className="home-page">
      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link to="/home" className="navbar-brand">
            <span>🎵</span>
            <span className="brand-text">MusicChef</span>
          </Link>
          <div className="navbar-actions">
            <Link to="/history" className="btn btn-ghost btn-sm">📊</Link>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Abmelden</button>
          </div>
        </div>
      </nav>

      <div className="container home-container">
        {/* ── Hero ─────────────────────────────────────────── */}
        <div className="home-hero">
          {user?.image ? (
            <img className="user-avatar" src={user.image} alt={user.display_name} />
          ) : (
            <div className="user-avatar-placeholder">👤</div>
          )}
          <div className="home-greeting">
            <h2>Hallo, {user?.display_name || 'Musiker'}!</h2>
            <p>Wähle deine Musik und starte das Quiz.</p>
          </div>
        </div>

        {/* ── Source Tabs ───────────────────────────────────── */}
        <div className="source-tabs">
          <button
            className={`source-tab ${tab === 'genre' ? 'active' : ''}`}
            onClick={() => setTab('genre')}
          >
            🎸 Genres
          </button>
          <button
            className={`source-tab ${tab === 'playlist' ? 'active' : ''}`}
            onClick={() => setTab('playlist')}
          >
            🎼 Playlists
            {!loadingPlaylists && playlists.length > 0 && (
              <span className="tab-badge">{playlists.length}</span>
            )}
          </button>
        </div>

        {/* ── Region Filter (only genre tab) ────────────────── */}
        {tab === 'genre' && (
          <div className="region-filter">
            {regions.map((r) => (
              <button
                key={r.id}
                className={`region-chip ${regionFilter === r.id ? 'active' : ''}`}
                onClick={() => setRegionFilter(r.id)}
              >
                {r.emoji} {r.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Genre Grid ────────────────────────────────────── */}
        {tab === 'genre' && (
          <div className="genre-grid">
            <div
              className={`genre-card ${selectedGenre?.id === '__random__' ? 'selected' : ''}`}
              onClick={() => handleGenreSelect({ id: '__random__', name: 'Zufällig' })}
            >
              <span className="genre-emoji">🎲</span>
              <span className="genre-name">Zufällig</span>
            </div>
            {genres.map((g) => (
              <div
                key={g.id}
                className={`genre-card ${selectedGenre?.id === g.id ? 'selected' : ''}`}
                onClick={() => handleGenreSelect(g)}
              >
                <span className="genre-emoji">{g.emoji}</span>
                <span className="genre-name">{g.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Playlist Grid ─────────────────────────────────── */}
        {tab === 'playlist' && (
          <div className="playlist-grid">
            {loadingPlaylists ? (
              <p className="text-muted" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem 0' }}>
                Playlists werden geladen…
              </p>
            ) : playlists.length === 0 ? (
              <p className="text-muted" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem 0' }}>
                Keine Playlists gefunden.
              </p>
            ) : (
              playlists.map((pl) => (
                <div
                  key={pl.id}
                  className={`playlist-card ${selectedPlaylist?.id === pl.id ? 'selected' : ''}`}
                  onClick={() => handlePlaylistSelect(pl)}
                >
                  {pl.image ? (
                    <img className="playlist-img" src={pl.image} alt={pl.name} />
                  ) : (
                    <div className="playlist-img-placeholder">🎵</div>
                  )}
                  <div className="playlist-info">
                    <div className="playlist-name">{pl.name}</div>
                    {pl.tracks > 0 && (
                      <div className="playlist-tracks">{pl.tracks} Titel</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Settings Card ─────────────────────────────────── */}
        <div className="settings-card">
          <p className="section-title">⚙️ Quiz-Einstellungen</p>

          {/* ── Question Count ──────────────────────────────── */}
          <label className="setting-label">Anzahl Fragen</label>

          {selectedPlaylist?.tracks > 0 && (
            <button
              className={`count-option all-btn ${useAllTracks ? 'selected' : ''}`}
              onClick={() => setUseAllTracks((v) => !v)}
              style={{ marginBottom: '0.6rem' }}
            >
              {useAllTracks
                ? `✅ Alle ${Math.min(selectedPlaylist.tracks, 50)} Tracks`
                : `Alle Tracks spielen (${Math.min(selectedPlaylist.tracks, 50)})`}
            </button>
          )}

          {!useAllTracks && (
            <>
              <div className="count-presets">
                {QUICK_COUNTS.map((n) => (
                  <button
                    key={n}
                    className={`count-chip ${count === n ? 'selected' : ''}`}
                    onClick={() => setCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="slider-row">
                <input
                  className="count-slider"
                  type="range"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value, 10))}
                />
                <span className="slider-value">{count}</span>
              </div>
            </>
          )}

          {/* ── Guess Fields ────────────────────────────────── */}
          <label className="setting-label" style={{ marginTop: '1.25rem' }}>Was erraten?</label>
          <div className="field-toggles">
            {[
              { id: 'artist', label: '🎤 Interpret' },
              { id: 'title', label: '🎵 Titel' },
              { id: 'year', label: '📅 Jahr' },
            ].map((f) => (
              <button
                key={f.id}
                className={`field-toggle ${guessFields.includes(f.id) ? 'selected' : ''}`}
                onClick={() => toggleGuessField(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Input Mode ──────────────────────────────────── */}
          <label className="setting-label" style={{ marginTop: '1.25rem' }}>Eingabemodus</label>
          <div className="field-toggles">
            <button
              className={`field-toggle ${inputMode === 'freetext' ? 'selected' : ''}`}
              onClick={() => setInputMode('freetext')}
            >
              ✏️ Freitext
            </button>
            <button
              className={`field-toggle ${inputMode === 'choice' ? 'selected' : ''}`}
              onClick={() => setInputMode('choice')}
            >
              🔘 4 Auswahlmöglichkeiten
            </button>
          </div>

          {/* ── Game Modes ──────────────────────────────────── */}
          <label className="setting-label" style={{ marginTop: '1.25rem' }}>Spielmodi</label>
          <div className="field-toggles">
            <button
              className={`field-toggle ${speedBonus ? 'selected' : ''}`}
              onClick={() => setSpeedBonus((v) => !v)}
            >
              ⚡ Speed-Bonus
            </button>
            <button
              className={`field-toggle ${revealCover ? 'selected' : ''}`}
              onClick={() => setRevealCover((v) => !v)}
            >
              🖼️ Cover aufdecken
            </button>
          </div>
          {speedBonus && (
            <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.35rem' }}>
              Schnellere Antworten = mehr Punkte (bis zu 2× Bonus)
            </p>
          )}
          {revealCover && (
            <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.35rem' }}>
              Cover wird langsam von verpixelt zu scharf – bei richtiger Antwort sofort enthüllt
            </p>
          )}

          {/* ── Year Range ──────────────────────────────────── */}
          <label className="setting-label" style={{ marginTop: '1.25rem' }}>Zeitraum</label>
          <button
            className={`field-toggle ${yearEnabled ? 'selected' : ''}`}
            onClick={() => setYearEnabled((v) => !v)}
            style={{ marginBottom: yearEnabled ? '0.6rem' : 0 }}
          >
            {yearEnabled ? '✅ Zeitfilter aktiv' : '📅 Zeitfilter'}
          </button>

          {yearEnabled && (
            <div className="year-range-row">
              <label className="year-label">
                Von
                <input
                  type="number"
                  className="year-input"
                  min={1950}
                  max={yearTo}
                  value={yearFrom}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    if (!Number.isNaN(v)) setYearFrom(v)
                  }}
                />
              </label>
              <span className="year-dash">–</span>
              <label className="year-label">
                Bis
                <input
                  type="number"
                  className="year-input"
                  min={yearFrom}
                  max={new Date().getFullYear()}
                  value={yearTo}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    if (!Number.isNaN(v)) setYearTo(v)
                  }}
                />
              </label>
            </div>
          )}

          {yearEnabled && selectedPlaylist && (
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
              ℹ️ Zeitfilter wirkt nur bei Genre- und Zufalls-Modus.
            </p>
          )}
        </div>

        {/* ── Start Button (sticky) ─────────────────────────── */}
        <div className="start-bar">
          <button
            className="btn btn-primary btn-start"
            disabled={!canStart}
            onClick={handleStartQuiz}
          >
            {canStart
              ? `🎮 Quiz starten – ${selectionLabel} (${effectiveCount} Fragen)`
              : '🎮 Wähle ein Genre oder eine Playlist'}
          </button>
        </div>
      </div>
    </div>
  )
}
