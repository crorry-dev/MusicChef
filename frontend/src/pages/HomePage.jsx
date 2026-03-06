import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getGenres, getUserPlaylists } from '../api'

const GENRE_EMOJIS = {
  pop: '🎤',
  rock: '🎸',
  hiphop: '🎧',
  'hip-hop': '🎧',
  jazz: '🎷',
  classical: '🎻',
  electronic: '🎛️',
  rnb: '🎶',
  'r&b': '🎶',
  metal: '🤘',
  country: '🤠',
  latin: '💃',
  reggae: '🌴',
  blues: '🎺',
  soul: '✨',
  punk: '⚡',
  folk: '🪕',
  indie: '🌿',
  dance: '🕺',
  default: '🎵',
}

function getGenreEmoji(name = '') {
  const key = name.toLowerCase().replace(/\s+/g, '')
  for (const [k, v] of Object.entries(GENRE_EMOJIS)) {
    if (key.includes(k)) return v
  }
  return GENRE_EMOJIS.default
}

const QUESTION_COUNTS = [5, 10, 15, 20]

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [genres, setGenres] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [count, setCount] = useState(10)
  const [loadingGenres, setLoadingGenres] = useState(true)
  const [loadingPlaylists, setLoadingPlaylists] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getGenres()
      .then((r) => setGenres(r.data.genres || []))
      .catch(() => setError('Genres konnten nicht geladen werden.'))
      .finally(() => setLoadingGenres(false))

    getUserPlaylists()
      .then((r) => setPlaylists(r.data.playlists || []))
      .catch(() => {})
      .finally(() => setLoadingPlaylists(false))
  }, [])

  const handleGenreSelect = useCallback((genre) => {
    setSelectedGenre((prev) => (prev?.id === genre.id ? null : genre))
    setSelectedPlaylist(null)
  }, [])

  const handlePlaylistSelect = useCallback((pl) => {
    setSelectedPlaylist((prev) => (prev?.id === pl.id ? null : pl))
    setSelectedGenre(null)
  }, [])

  const handleStartQuiz = useCallback(() => {
    if (!selectedGenre && !selectedPlaylist) return

    const state = { count }

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

    navigate('/quiz', { state })
  }, [selectedGenre, selectedPlaylist, count, navigate])

  const canStart = selectedGenre !== null || selectedPlaylist !== null

  return (
    <div className="home-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link to="/home" className="navbar-brand">
            <span>🎵</span>
            <span className="brand-text">MusicChef</span>
          </Link>
          <div className="navbar-actions">
            <Link to="/history" className="btn btn-ghost btn-sm">
              📊 Verlauf
            </Link>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              Abmelden
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        {/* Hero greeting */}
        <div className="home-hero">
          {user?.image ? (
            <img
              className="user-avatar"
              src={user.image}
              alt={user.display_name}
            />
          ) : (
            <div className="user-avatar-placeholder">👤</div>
          )}
          <div className="home-greeting">
            <h2>Hallo, {user?.display_name || 'Musiker'}! 👋</h2>
            <p>Bereit für dein nächstes Quiz?</p>
          </div>
        </div>

        {error && (
          <div className="error-box" style={{ marginBottom: '1rem' }}>
            ⚠️ {error}
          </div>
        )}

        <hr className="divider" />

        {/* Genre selection */}
        <p className="section-title">🎸 Genre wählen</p>

        {loadingGenres ? (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: 130,
                  height: 80,
                  background: 'var(--surface)',
                  borderRadius: 'var(--radius)',
                  opacity: 0.5,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="genre-grid">
            {/* Random option */}
            <div
              className={`genre-card ${selectedGenre?.id === '__random__' ? 'selected' : ''}`}
              onClick={() => handleGenreSelect({ id: '__random__', name: 'Zufällig' })}
            >
              <span className="genre-emoji">🎲</span>
              <span className="genre-name">Zufällig</span>
            </div>

            {genres.map((g) => (
              <div
                key={g.id ?? g.name}
                className={`genre-card ${selectedGenre?.id === (g.id ?? g.name) ? 'selected' : ''}`}
                onClick={() =>
                  handleGenreSelect({ id: g.id ?? g.name, name: g.name })
                }
              >
                <span className="genre-emoji">{getGenreEmoji(g.name)}</span>
                <span className="genre-name">{g.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Playlists */}
        {!loadingPlaylists && playlists.length > 0 && (
          <>
            <p className="section-title">🎼 Meine Playlists</p>
            <div className="playlist-grid">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className={`playlist-card ${selectedPlaylist?.id === pl.id ? 'selected' : ''}`}
                  onClick={() => handlePlaylistSelect(pl)}
                >
                  {pl.image ? (
                    <img
                      className="playlist-img"
                      src={pl.image}
                      alt={pl.name}
                    />
                  ) : (
                    <div className="playlist-img-placeholder">🎵</div>
                  )}
                  <div className="playlist-info">
                    <div className="playlist-name">{pl.name}</div>
                    {typeof pl.tracks === 'number' && (
                      <div className="playlist-tracks">{pl.tracks} Titel</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <hr className="divider" />

        {/* Question count */}
        <p className="section-title">❓ Anzahl Fragen</p>
        <div className="count-selector" style={{ marginBottom: '2rem' }}>
          {QUESTION_COUNTS.map((n) => (
            <button
              key={n}
              className={`count-option ${count === n ? 'selected' : ''}`}
              onClick={() => setCount(n)}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Start button */}
        <div className="start-quiz-row">
          <button
            className="btn btn-primary btn-lg"
            disabled={!canStart}
            onClick={handleStartQuiz}
          >
            🎮 Quiz starten
          </button>
          {!canStart && (
            <span className="text-muted" style={{ fontSize: '0.9rem' }}>
              Bitte wähle ein Genre oder eine Playlist
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
