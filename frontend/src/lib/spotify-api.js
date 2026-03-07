import { getValidToken } from './spotify-pkce'

const SPOTIFY_API = 'https://api.spotify.com/v1'

/* ── Request Throttle ─────────────────────────────────────────
   Spotify rate-limits Development-Mode-Apps auf ~3 req/s.
   Wir garantieren min. 350 ms zwischen aufeinanderfolgenden Requests.
   ──────────────────────────────────────────────────────────── */
let lastRequestTime = 0
const MIN_GAP_MS = 350

async function throttle() {
  const now = Date.now()
  const wait = MIN_GAP_MS - (now - lastRequestTime)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastRequestTime = Date.now()
}

/* ── Core Fetch mit Retry + Backoff ──────────────────────── */
async function spotifyFetch(path, options = {}, retries = 3) {
  await throttle()

  const token = await getValidToken()
  if (!token) throw new Error('Nicht authentifiziert – bitte neu einloggen')

  const res = await fetch(`${SPOTIFY_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (res.status === 429 && retries > 0) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '4', 10)
    const backoffMs = Math.max(retryAfter, 3) * 1000
    console.warn(`[Spotify] 429 – warte ${backoffMs / 1000}s (${retries} Versuche übrig)`, path)
    await new Promise((r) => setTimeout(r, backoffMs))
    return spotifyFetch(path, options, retries - 1)
  }

  if (res.status === 401) {
    throw new Error('Token abgelaufen – bitte neu einloggen')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body.error?.message || `Spotify API Fehler (${res.status})`
    console.error('[Spotify]', res.status, msg, path)
    throw new Error(msg)
  }

  return res.json()
}

/* ── Market (Country) ────────────────────────────────────────
   Wird einmalig von AuthContext in localStorage gespeichert.
   Kein zusätzlicher /me-Request nötig.
   ──────────────────────────────────────────────────────────── */
const MARKET_KEY = 'spotify_market'

function getMarket() {
  return localStorage.getItem(MARKET_KEY) || null
}

export function setMarket(country) {
  if (country) localStorage.setItem(MARKET_KEY, country)
}

/* ── Track Extraction ──────────────────────────────────────── */
function extractTrack(track) {
  if (!track || !track.id) return null
  const releaseDate = track.album?.release_date ?? ''
  const yearNum = releaseDate ? parseInt(releaseDate.split('-')[0], 10) : NaN

  return {
    id: track.id,
    title: track.name,
    artist: track.artists[0]?.name ?? 'Unbekannt',
    all_artists: track.artists.map((a) => a.name).join(', '),
    album: track.album?.name ?? '',
    preview_url: track.preview_url,
    image: track.album?.images?.[0]?.url ?? null,
    spotify_url: track.external_urls?.spotify ?? '',
    year: Number.isNaN(yearNum) ? null : yearNum,
  }
}

/* ── Helpers ────────────────────────────────────────────────── */
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function deduplicateTracks(tracks) {
  const seen = new Set()
  return tracks.filter((t) => {
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })
}

function prioritizeWithPreview(tracks) {
  const withPreview = []
  const withoutPreview = []
  for (const t of tracks) {
    if (t.preview_url) withPreview.push(t)
    else withoutPreview.push(t)
  }
  return [...withPreview, ...withoutPreview]
}

function buildYearFilter(yearRange) {
  if (!yearRange) return ''
  const { from, to } = yearRange
  if (from && to) return ` year:${from}-${to}`
  if (from) return ` year:${from}-${new Date().getFullYear()}`
  if (to) return ` year:1950-${to}`
  return ''
}

function buildMarketParam() {
  const m = getMarket()
  return m ? `&market=${m}` : ''
}

/* ── Search Tracks by Genre ─────────────────────────────────
   Spotify Search: limit 1-50, offset+limit <= 1000.
   Wir nutzen limit=10 in sequenziellen Requests (throttled).
   ──────────────────────────────────────────────────────────── */
export async function fetchTracksForGenre(searchQuery, count = 30, yearRange = null) {
  const allTracks = []
  let lastError = null
  const marketParam = buildMarketParam()
  const yearFilter = buildYearFilter(yearRange)
  const q = encodeURIComponent(`${searchQuery}${yearFilter}`)

  for (let offset = 0; offset <= 40; offset += 10) {
    if (allTracks.length >= count) break
    try {
      const result = await spotifyFetch(
        `/search?q=${q}&type=track&limit=10&offset=${offset}${marketParam}`
      )
      const items = result.tracks?.items ?? []
      for (const track of items) {
        const t = extractTrack(track)
        if (t) allTracks.push(t)
      }
      if (items.length < 10) break
    } catch (err) {
      console.warn('[fetchTracksForGenre]', offset, err.message)
      lastError = err
      if (err.message.includes('einloggen')) throw err
    }
  }

  if (allTracks.length === 0 && lastError) {
    throw new Error(`Spotify-Suche fehlgeschlagen: ${lastError.message}`)
  }

  return prioritizeWithPreview(shuffleArray(deduplicateTracks(allTracks))).slice(0, count)
}

/* ── Playlist Tracks ──────────────────────────────────────── */
export async function fetchTracksForPlaylist(playlistId, count = 20) {
  const tracks = []
  let offset = 0
  let lastError = null
  const marketParam = buildMarketParam()

  while (tracks.length < count && offset < 200) {
    try {
      const result = await spotifyFetch(
        `/playlists/${playlistId}/tracks?limit=50&offset=${offset}${marketParam}&additional_types=track`
      )
      const items = result.items ?? []
      if (items.length === 0) break

      for (const item of items) {
        const t = extractTrack(item.track)
        if (t) tracks.push(t)
      }

      offset += 50
      if (items.length < 50) break
    } catch (err) {
      console.warn('[fetchTracksForPlaylist]', offset, err.message)
      lastError = err
      if (err.message.includes('einloggen')) throw err
      if (err.message.includes('Forbidden') || err.message.includes('403')) {
        throw new Error(
          'Kein Zugriff auf diese Playlist. Bitte wähle eine eigene Playlist oder ein Genre.'
        )
      }
      break
    }
  }

  if (tracks.length === 0 && lastError) {
    throw new Error(`Playlist konnte nicht geladen werden: ${lastError.message}`)
  }

  return prioritizeWithPreview(shuffleArray(deduplicateTracks(tracks))).slice(0, count)
}

/* ── Random Tracks ──────────────────────────────────────────
   3 Suchbegriffe × 10 Ergebnisse = bis zu 30 Tracks.
   ──────────────────────────────────────────────────────────── */
export async function fetchRandomTracks(count = 20, yearRange = null) {
  const tracks = []
  const queries = ['a', 'e', 'love', 'night', 'the', 'baby', 'dance', 'heart', 'fire', 'time']
  const selected = shuffleArray(queries).slice(0, 3)
  let lastError = null
  const marketParam = buildMarketParam()
  const yearFilter = buildYearFilter(yearRange)

  for (const q of selected) {
    if (tracks.length >= count) break
    const offset = Math.floor(Math.random() * 20)
    try {
      const result = await spotifyFetch(
        `/search?q=${encodeURIComponent(`${q}${yearFilter}`)}&type=track&limit=10&offset=${offset}${marketParam}`
      )
      for (const track of result.tracks?.items ?? []) {
        const t = extractTrack(track)
        if (t) tracks.push(t)
      }
    } catch (err) {
      console.warn('[fetchRandomTracks]', q, err.message)
      lastError = err
      if (err.message.includes('einloggen')) throw err
    }
  }

  if (tracks.length === 0 && lastError) {
    throw new Error(`Zufällige Tracks konnten nicht geladen werden: ${lastError.message}`)
  }

  return prioritizeWithPreview(shuffleArray(deduplicateTracks(tracks))).slice(0, count)
}

/* ── User Playlists ─────────────────────────────────────────
   1 einziger Request an /me/playlists. Kein Nachladen einzelner
   Playlist-Details → verhindert Rate Limiting.
   ──────────────────────────────────────────────────────────── */
export async function fetchUserPlaylists() {
  const result = await spotifyFetch('/me/playlists?limit=50')
  const items = result.items ?? []

  return items.map((pl) => ({
    id: pl.id,
    name: pl.name,
    tracks: typeof pl.tracks?.total === 'number' ? pl.tracks.total : null,
    image: pl.images?.[0]?.url ?? null,
  }))
}
