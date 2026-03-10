import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../context/LanguageContext'
import { getGenresList, getRegionsList } from '../lib/genres'
import { fetchUserPlaylists, getCachedPlaylists, checkPlaylistAccess } from '../lib/spotify-api'
import Navbar from '../components/Navbar'
import GenreIcon from '../components/GenreIcon'
import {
  Mic, Music, Calendar, Edit3, Circle, Zap, Image, CheckCircle,
  Gamepad2, Shuffle, Settings, ListMusic, Search, AlertTriangle, Loader,
} from '../lib/icons'

/* ── Quick Presets ─────────────────────────────────────────── */
const QUICK_COUNTS = [5, 10, 20, 50]

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  /* ── Source state ─────────────────────────────────────────── */
  const [playlists, setPlaylists] = useState(() => getCachedPlaylists() ?? [])
  const [selectedGenres, setSelectedGenres] = useState([])
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [playlistError, setPlaylistError] = useState(null)
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false)
  const [tab, setTab] = useState('genre')
  const [regionFilter, setRegionFilter] = useState('all')
  const [genreSearch, setGenreSearch] = useState('')
  const [playlistSearch, setPlaylistSearch] = useState('')
  const [startingQuiz, setStartingQuiz] = useState(false)
  const [startError, setStartError] = useState(null)

  /* ── Quiz settings ────────────────────────────────────────── */
  const [count, setCount] = useState(10)
  const [useAllTracks, setUseAllTracks] = useState(false)
  const [guessFields, setGuessFields] = useState(['artist', 'title', 'year'])
  const [inputMode, setInputMode] = useState('choice')
  const [speedBonus, setSpeedBonus] = useState(true)
  const [coverMode, setCoverMode] = useState('blur')
  const [yearEnabled, setYearEnabled] = useState(false)
  const [yearFrom, setYearFrom] = useState(2010)
  const [yearTo, setYearTo] = useState(new Date().getFullYear())

  /* ── Derived lists ────────────────────────────────────────── */
  const regions = useMemo(() => getRegionsList(), [])
  const genres = useMemo(() => {
    const list = getGenresList(regionFilter)
    if (!genreSearch.trim()) return list
    const q = genreSearch.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return list.filter((g) =>
      g.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
    )
  }, [regionFilter, genreSearch])

  const filteredPlaylists = useMemo(() => {
    if (!playlistSearch.trim()) return playlists
    const q = playlistSearch.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return playlists.filter((pl) =>
      pl.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
      || (pl.ownerName && pl.ownerName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q))
    )
  }, [playlists, playlistSearch])


  const loadPlaylists = useCallback(() => {
    setLoadingPlaylists(true)
    setPlaylistError(null)
    fetchUserPlaylists()
      .then((data) => {
        setPlaylists(data)
        setPlaylistsLoaded(true)
      })
      .catch((err) => {
        console.error('[Playlists]', err.message)
        setPlaylistError(err.message)
      })
      .finally(() => setLoadingPlaylists(false))
  }, [])

  /* Playlists erst laden wenn der Playlist-Tab aktiv wird → kein
     Race mit dem /me-Request beim Seitenaufbau */
  useEffect(() => {
    if (tab === 'playlist' && !playlistsLoaded && !loadingPlaylists) {
      loadPlaylists()
    }
  }, [tab, playlistsLoaded, loadingPlaylists, loadPlaylists])

  /* Clear genre selection when switching regions (genre might not be in new list) */
  useEffect(() => {
    if (selectedGenres.length > 0) {
      const validIds = new Set(genres.map((g) => g.id))
      validIds.add('__random__')
      const filtered = selectedGenres.filter((g) => validIds.has(g.id))
      if (filtered.length !== selectedGenres.length) setSelectedGenres(filtered)
    }
  }, [genres, selectedGenres])

  /* ── Replay from History ──────────────────────────────────── */
  useEffect(() => {
    const replay = location.state?.replay
    if (!replay) return
    if (replay.count) setCount(replay.count)
    if (replay.guessFields) setGuessFields(replay.guessFields)
    if (replay.genre && replay.genre !== 'random') {
      const genresList = getGenresList('all')
      const match = genresList.find((g) => g.id === replay.genre)
      if (match) setSelectedGenres([match])
    } else if (replay.genre === 'random' || replay.mode === 'random') {
      setSelectedGenres([{ id: '__random__', name: 'Zufällig' }])
    }
    /* Clear state to prevent re-applying on re-render */
    window.history.replaceState({}, '')
  }, [location.state])

  /* ── Handlers ─────────────────────────────────────────────── */
  const handleGenreSelect = useCallback((genre) => {
    setSelectedGenres((prev) => {
      /* Zufällig ist exklusiv – deselektiert alles andere */
      if (genre.id === '__random__') {
        return prev.some((g) => g.id === '__random__') ? [] : [genre]
      }
      /* Wenn Zufällig gewählt war, entfernen */
      const withoutRandom = prev.filter((g) => g.id !== '__random__')
      const exists = withoutRandom.some((g) => g.id === genre.id)
      return exists
        ? withoutRandom.filter((g) => g.id !== genre.id)
        : [...withoutRandom, genre]
    })
    setSelectedPlaylist(null)
    setStartError(null)
  }, [])

  const handlePlaylistSelect = useCallback((pl) => {
    setSelectedPlaylist((prev) => (prev?.id === pl.id ? null : pl))
    setStartError(null)
    setSelectedGenres([])
    if (pl.tracks && pl.tracks > 0) {
      setCount(Math.min(pl.tracks, 1000))
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
      return Math.min(selectedPlaylist.tracks, 1000)
    }
    return count
  }, [useAllTracks, selectedPlaylist, count])

  const handleStartQuiz = useCallback(async () => {
    if (selectedGenres.length === 0 && !selectedPlaylist) return
    setStartError(null)

    const state = {
      count: effectiveCount,
      guessFields,
      inputMode,
      speedBonus,
      coverMode,
    }

    if (selectedPlaylist) {
      state.mode = 'playlist'
      state.playlist_id = selectedPlaylist.id
      state.genre = null

      setStartingQuiz(true)
      const access = await checkPlaylistAccess(selectedPlaylist.id)
      if (!access.accessible) {
        setStartingQuiz(false)
        if (access.reason === 'private') {
          setStartError(`${t('home.playlistPrivate', { name: selectedPlaylist.name })}`)
        } else if (access.reason === 'auth') {
          setStartError(t('home.sessionExpired'))
        } else {
          setStartError(access.message || t('home.playlistLoadFailed'))
        }
        return
      }
      setStartingQuiz(false)
    } else if (selectedGenres.some((g) => g.id === '__random__')) {
      state.mode = 'random'
      state.genre = null
    } else if (selectedGenres.length === 1) {
      state.mode = 'genre'
      state.genre = selectedGenres[0].id
    } else {
      state.mode = 'multi-genre'
      state.genres = selectedGenres.map((g) => g.id)
    }

    if (yearEnabled && state.mode !== 'playlist') {
      state.yearRange = { from: yearFrom, to: yearTo }
    }

    navigate('/quiz', { state })
  }, [
    selectedGenres, selectedPlaylist, effectiveCount, guessFields,
    inputMode, speedBonus, coverMode, yearEnabled, yearFrom, yearTo, navigate,
  ])

  const canStart = selectedGenres.length > 0 || selectedPlaylist !== null

  const selectionLabel = selectedPlaylist
    ? selectedPlaylist.name
    : selectedGenres.length > 3
      ? `${selectedGenres.slice(0, 3).map((g) => g.id === '__random__' ? t('home.random') : g.name).join(', ')} +${selectedGenres.length - 3}`
      : selectedGenres.length > 0
        ? selectedGenres.map((g) => g.id === '__random__' ? t('home.random') : g.name).join(', ')
        : null

  return (
    <div className="home-page">
      {/* ── Navbar ──────────────────────────────────────────── */}
      <Navbar user={user} onLogout={logout} />

      <div className="container home-container">
        {/* ── Hero ─────────────────────────────────────────── */}
        <div className="home-hero">
          {user?.image ? (
            <img className="user-avatar" src={user.image} alt={user.display_name} />
          ) : (
            <div className="user-avatar-placeholder">
              {user?.display_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="home-greeting">
            <h2>{t('home.hello', { name: user?.display_name || 'Musiker' })}</h2>
            <p>{t('home.chooseMusic')}</p>
          </div>
        </div>

        {/* ── Source Tabs ───────────────────────────────────── */}
        <div className="source-tabs">
          <button
            className={`source-tab ${tab === 'genre' ? 'active' : ''}`}
            onClick={() => setTab('genre')}
          >
            <Music size={16} /> {t('home.genres')}
          </button>
          <button
            className={`source-tab ${tab === 'playlist' ? 'active' : ''}`}
            onClick={() => setTab('playlist')}
          >
            <ListMusic size={16} /> {t('home.playlists')}
            {!loadingPlaylists && playlists.length > 0 && (
              <span className="tab-badge">{playlists.length}</span>
            )}
          </button>
        </div>

        {/* ── Region Filter (only genre tab) ────────────────── */}
        {tab === 'genre' && (
          <>
            <div className="genre-search-wrap">
              <Search size={16} />
              <input
                className="genre-search-input"
                type="text"
                placeholder={t('home.searchGenre')}
                value={genreSearch}
                onChange={(e) => setGenreSearch(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {genreSearch && (
                <button
                  className="genre-search-clear"
                  onClick={() => setGenreSearch('')}
                  aria-label={t('home.clearSearch')}
                >
                  &times;
                </button>
              )}
            </div>
            <div className="region-filter">
            {regions.filter((r) => r.group === 'continent').map((r) => (
              <button
                key={r.id}
                className={`region-chip ${regionFilter === r.id ? 'active' : ''}`}
                onClick={() => setRegionFilter(r.id)}
              >
                <GenreIcon icon={r.icon} size={14} /> {r.name}
              </button>
            ))}
            <span className="region-divider" />
            {regions.filter((r) => r.group === 'country').map((r) => (
              <button
                key={r.id}
                className={`region-chip ${regionFilter === r.id ? 'active' : ''}`}
                onClick={() => setRegionFilter(r.id)}
              >
                <GenreIcon icon={r.icon} size={14} /> {r.name}
              </button>
            ))}
            </div>
          </>
        )}

        {/* ── Genre Grid ────────────────────────────────────── */}
        {tab === 'genre' && (
          <div className="genre-grid">
            <div
              className={`genre-card ${selectedGenres.some((g) => g.id === '__random__') ? 'selected' : ''}`}
              onClick={() => handleGenreSelect({ id: '__random__', name: 'Zufällig' })}
            >
              <span className="genre-icon-wrap"><Shuffle size={20} /></span>
              <span className="genre-name">{t('home.random')}</span>
            </div>
            {genres.map((g) => (
              <div
                key={g.id}
                className={`genre-card ${selectedGenres.some((s) => s.id === g.id) ? 'selected' : ''}`}
                onClick={() => handleGenreSelect(g)}
              >
                <span className="genre-icon-wrap"><GenreIcon icon={g.icon} size={20} /></span>
                <span className="genre-name">{g.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Playlist Grid ─────────────────────────────────── */}
        {tab === 'playlist' && (
          <>
            {!loadingPlaylists && playlists.length > 0 && (
              <div className="genre-search-wrap">
                <Search size={16} />
                <input
                  className="genre-search-input"
                  type="text"
                  placeholder={t('home.searchPlaylist')}
                  value={playlistSearch}
                  onChange={(e) => setPlaylistSearch(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                {playlistSearch && (
                  <button
                    className="genre-search-clear"
                    onClick={() => setPlaylistSearch('')}
                    aria-label={t('home.clearSearch')}
                  >
                    &times;
                  </button>
                )}
              </div>
            )}
          <div className="playlist-grid">
            {loadingPlaylists ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem 0' }}>
                <p className="text-muted" style={{ marginBottom: '1rem' }}>{t('home.playlistsLoading')}</p>
                <div className="progress-bar-wrapper" style={{ maxWidth: '260px', margin: '0 auto' }}>
                  <div className="progress-bar-fill progress-bar-indeterminate" />
                </div>
              </div>
            ) : playlistError ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem 0' }}>
                <p className="text-muted" style={{ marginBottom: '0.75rem' }}>{t('home.playlistsFailed')}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {playlistError}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button className="btn btn-primary btn-sm" onClick={loadPlaylists}>
                    {t('common.retry')}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { logout(); }}>
                    {t('common.relogin')}
                  </button>
                </div>
              </div>
            ) : playlists.length === 0 ? (
              <p className="text-muted" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem 0' }}>
{t('home.noPlaylists')}
              </p>
            ) : filteredPlaylists.length === 0 ? (
              <p className="text-muted" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem 0' }}>
{t('home.noPlaylistsFound')}
              </p>
            ) : (
              filteredPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  className={`playlist-card ${selectedPlaylist?.id === pl.id ? 'selected' : ''}`}
                  onClick={() => handlePlaylistSelect(pl)}
                >
                  {pl.image ? (
                    <img className="playlist-img" src={pl.image} alt={pl.name} />
                  ) : (
                    <div className="playlist-img-placeholder"><Music size={24} /></div>
                  )}
                  <div className="playlist-info">
                    <div className="playlist-name">{pl.name}</div>
                    <div className="playlist-tracks">
                      {pl.tracks > 0 && `${pl.tracks} ${t('common.tracks')}`}
                      {pl.tracks > 0 && pl.ownerName && user?.id && pl.ownerId !== user.id && ' · '}
                      {pl.ownerName && user?.id && pl.ownerId !== user.id && (
                        <span className="playlist-owner">{t('home.by')} {pl.ownerName}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          </>
        )}

        {/* ── Settings Card ─────────────────────────────────── */}
        <div className="settings-card">
          <p className="section-title"><Settings size={16} /> {t('home.quizSettings')}</p>

          {/* ── Question Count ──────────────────────────────────────── */}
          <label className="setting-label">{t('home.questionCount')}</label>

          {selectedPlaylist?.tracks > 0 && (
            <button
              className={`count-option all-btn ${useAllTracks ? 'selected' : ''}`}
              onClick={() => setUseAllTracks((v) => !v)}
              style={{ marginBottom: '0.6rem' }}
            >
              {useAllTracks
                ? <>
                    <CheckCircle size={14} /> {t('home.allTracks', { count: Math.min(selectedPlaylist.tracks, 1000) })}
                  </>
                : t('home.playAllTracks', { count: Math.min(selectedPlaylist.tracks, 1000) })}
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
                  max={1000}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value, 10))}
                />
                <span className="slider-value">{count}</span>
              </div>
            </>
          )}

          {/* ── Guess Fields ────────────────────────────────── */}
          <label className="setting-label" style={{ marginTop: '1.25rem' }}>{t('home.whatToGuess')}</label>
          <div className="field-toggles">
            {[
              { id: 'artist', label: t('home.artist'), Icon: Mic },
              { id: 'title', label: t('home.title'), Icon: Music },
              { id: 'year', label: t('home.year'), Icon: Calendar },
            ].map((f) => (
              <button
                key={f.id}
                className={`field-toggle ${guessFields.includes(f.id) ? 'selected' : ''}`}
                onClick={() => toggleGuessField(f.id)}
              >
                <f.Icon size={14} /> {f.label}
              </button>
            ))}
          </div>

          {/* ── Input Mode ──────────────────────────────────── */}
          <label className="setting-label" style={{ marginTop: '1.25rem' }}>{t('home.inputMode')}</label>
          <div className="field-toggles">
            <button
              className={`field-toggle ${inputMode === 'freetext' ? 'selected' : ''}`}
              onClick={() => setInputMode('freetext')}
            >
              <Edit3 size={14} /> {t('home.freetext')}
            </button>
            <button
              className={`field-toggle ${inputMode === 'choice' ? 'selected' : ''}`}
              onClick={() => setInputMode('choice')}
            >
              <Circle size={14} /> {t('home.choice')}
            </button>
          </div>

          {/* ── Game Modes ──────────────────────────────────── */}
          <label className="setting-label" style={{ marginTop: '1.25rem' }}>{t('home.gameModes')}</label>
          <div className="field-toggles">
            <button
              className={`field-toggle ${speedBonus ? 'selected' : ''}`}
              onClick={() => setSpeedBonus((v) => !v)}
            >
              <Zap size={14} /> {t('home.speedBonus')}
            </button>
          </div>
          {speedBonus && (
            <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.35rem' }}>
              {t('home.speedBonusHint')}
            </p>
          )}

          {/* ── Cover Mode ──────────────────────────────────── */}
          <label className="setting-label" style={{ marginTop: '1.25rem' }}>{t('home.albumCover')}</label>
          <div className="field-toggles">
            <button
              className={`field-toggle ${coverMode === 'none' ? 'selected' : ''}`}
              onClick={() => setCoverMode('none')}
            >
              <Image size={14} /> {t('home.coverVisible')}
            </button>
            <button
              className={`field-toggle ${coverMode === 'blur' ? 'selected' : ''}`}
              onClick={() => setCoverMode('blur')}
            >
              <Image size={14} /> {t('home.coverBlur')}
            </button>
            <button
              className={`field-toggle ${coverMode === 'hidden' ? 'selected' : ''}`}
              onClick={() => setCoverMode('hidden')}
            >
              <Image size={14} /> {t('home.coverHidden')}
            </button>
          </div>
          {coverMode === 'blur' && (
            <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.35rem' }}>
              {t('home.coverBlurHint')}
            </p>
          )}
          {coverMode === 'hidden' && (
            <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.35rem' }}>
              {t('home.coverHiddenHint')}
            </p>
          )}

          {/* ── Year Range ──────────────────────────────────── */}
          <label className="setting-label" style={{ marginTop: '1.25rem' }}>{t('home.timePeriod')}</label>
          <button
            className={`field-toggle ${yearEnabled ? 'selected' : ''}`}
            onClick={() => setYearEnabled((v) => !v)}
            style={{ marginBottom: yearEnabled ? '0.6rem' : 0 }}
          >
            {yearEnabled
              ? <><CheckCircle size={14} /> {t('home.timeFilterActive')}</>
              : <><Calendar size={14} /> {t('home.timeFilter')}</>}
          </button>

          {yearEnabled && (
            <div className="year-range-row">
              <label className="year-label">
                {t('home.from')}
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
                {t('home.to')}
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
              {t('home.timeFilterPlaylist')}
            </p>
          )}
        </div>

        {/* ── Start Button (sticky) ─────────────────────────── */}
        <div className="start-bar">
          {startError && (
            <div className="start-error">
              <AlertTriangle size={14} /> {startError}
            </div>
          )}
          <button
            className="btn btn-primary btn-start"
            disabled={!canStart || startingQuiz}
            onClick={handleStartQuiz}
          >
            {startingQuiz ? (
              <><Loader size={18} className="spin" /> {t('home.checkAccess')}</>
            ) : (
              <>
                <Gamepad2 size={18} />
                {canStart
                  ? ` ${t('home.startQuiz', { selection: selectionLabel, count: effectiveCount })}`
                  : ` ${t('home.chooseGenre')}`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
