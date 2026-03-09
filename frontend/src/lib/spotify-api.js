import { getValidToken, refreshAccessToken } from './spotify-pkce'

const SPOTIFY_API = 'https://api.spotify.com/v1'

/* ── Request Throttle + globaler 429-Cooldown ─────────────────
   Spotify rate-limits Development-Mode-Apps auf ~3 req/s.
   Wir garantieren min. 350 ms zwischen aufeinanderfolgenden Requests.
   Bei einem 429 wird ein globaler Cooldown gesetzt, der ALLE
   Requests blockiert, bis die Retry-After-Zeit abgelaufen ist.
   ──────────────────────────────────────────────────────────── */
let lastRequestTime = 0
const MIN_GAP_MS = 350
let globalCooldownUntil = 0

async function throttle() {
  const cooldownWait = globalCooldownUntil - Date.now()
  if (cooldownWait > 0) {
    await new Promise((r) => setTimeout(r, cooldownWait))
  }
  const now = Date.now()
  const wait = MIN_GAP_MS - (now - lastRequestTime)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastRequestTime = Date.now()
}

/* ── Core Fetch mit Retry + exponentiellem Backoff ───────── */
const MAX_RETRIES = 3

function isAuthError(err) {
  const m = err?.message ?? ''
  return m.includes('einloggen') || m.includes('abgelaufen') || m.includes('Sitzung') || m.includes('authentifiziert')
}

async function spotifyFetch(path, options = {}, retries = MAX_RETRIES) {
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
    const attempt = MAX_RETRIES - retries
    const backoffMs = Math.max(retryAfter, 3) * 1000 * Math.pow(2, attempt)
    globalCooldownUntil = Date.now() + backoffMs
    console.warn(`[Spotify] 429 – warte ${backoffMs / 1000}s (${retries} Versuche übrig)`, path)
    await new Promise((r) => setTimeout(r, backoffMs))
    return spotifyFetch(path, options, retries - 1)
  }

  if (res.status === 401 && retries > 0) {
    try {
      await refreshAccessToken()
      return spotifyFetch(path, options, retries - 1)
    } catch {
      throw new Error('Sitzung abgelaufen – bitte melde dich neu an')
    }
  }

  if (res.status === 401) {
    throw new Error('Sitzung abgelaufen – bitte melde dich neu an')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body.error?.message || `Spotify API Fehler (${res.status})`
    if (res.status === 403) {
      console.warn(`[Spotify] ${res.status} – ${msg} – "${path}"`)
    } else {
      console.error(`[Spotify] ${res.status} – ${msg} – "${path}"`, body)
    }
    throw new Error(msg)
  }

  return res.json()
}

/* ── Current User ────────────────────────────────────────────
   Läuft über spotifyFetch → Throttle + Retry greifen.
   ──────────────────────────────────────────────────────────── */
let cachedUserId = null

export async function fetchCurrentUser() {
  const user = await spotifyFetch('/me')
  cachedUserId = user.id
  return user
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
    duration_ms: track.duration_ms ?? 30000,
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
      if (isAuthError(err)) throw err
    }
  }

  if (allTracks.length === 0 && lastError) {
    throw new Error(`Spotify-Suche fehlgeschlagen: ${lastError.message}`)
  }

  return prioritizeWithPreview(shuffleArray(deduplicateTracks(allTracks))).slice(0, count)
}

/* ── Playlist Tracks ──────────────────────────────────────────
   Strategie: Haupt-Endpoint /playlists/{id} liefert Metadaten +
   bis zu 100 Tracks und ist in Spotify Development Mode deutlich
   robuster als der Sub-Endpoint /playlists/{id}/tracks.
   Nur wenn > 100 Tracks benötigt werden, wird der Sub-Endpoint
   als Fallback genutzt.
   ──────────────────────────────────────────────────────────── */
export async function fetchTracksForPlaylist(playlistId, count = 20) {
  const tracks = []

  /* Schritt 1: Haupt-Endpoint mit market=from_token (hilft manchmal bei Dev-Mode) */
  let playlistData
  try {
    playlistData = await spotifyFetch(`/playlists/${playlistId}?market=from_token`)
  } catch (err) {
    if (isAuthError(err)) throw err
    if (err.message.includes('Forbidden') || err.message.includes('403')) {
      throw new Error(
        'Kein Zugriff auf diese Playlist – sie ist möglicherweise privat. Bitte wähle eine andere Playlist.'
      )
    }
    throw new Error(`Playlist konnte nicht geladen werden: ${err.message}`)
  }

  const initialItems = playlistData.tracks?.items ?? []

  for (const item of initialItems) {
    const t = extractTrack(item.track)
    if (t) tracks.push(t)
  }

  /* Schritt 2: Sub-Endpoint versuchen wenn nötig */
  const needMore = tracks.length < count && (playlistData.tracks?.next || tracks.length === 0)
  let subEndpointForbidden = false
  if (needMore) {
    let offset = initialItems.length

    /* Versuch A: Sub-Endpoint ohne zusätzliche Parameter */
    while (tracks.length < count && offset < 500) {
      try {
        const result = await spotifyFetch(
          `/playlists/${playlistId}/tracks?limit=50&offset=${offset}`
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
        if (isAuthError(err)) throw err
        if (err.message.includes('Forbidden') || err.message.includes('403')) {
          subEndpointForbidden = true
        }
        break
      }
    }

    /* Versuch B: Wenn 403, nochmal mit market=from_token probieren */
    if (subEndpointForbidden && tracks.length === 0) {
      subEndpointForbidden = false
      try {
        const result = await spotifyFetch(
          `/playlists/${playlistId}/tracks?limit=50&offset=0&market=from_token`
        )
        for (const item of result.items ?? []) {
          const t = extractTrack(item.track)
          if (t) tracks.push(t)
        }
      } catch (err) {
        if (isAuthError(err)) throw err
        if (err.message.includes('Forbidden') || err.message.includes('403')) {
          subEndpointForbidden = true
        }
      }
    }
  }

  if (tracks.length === 0) {
    if (subEndpointForbidden) {
      const ownerId = playlistData.owner?.id
      const ownerName = playlistData.owner?.display_name ?? ownerId
      const isOwn = cachedUserId && ownerId === cachedUserId

      if (!isOwn && ownerId) {
        throw new Error(
          `Diese Playlist gehört „${ownerName}" – du folgst ihr nur. ` +
          'Im Spotify Development Mode ist der Zugriff auf Tracks fremder Playlists eingeschränkt. ' +
          'Nutze eine Playlist die du selbst erstellt hast, oder wechsle zum Genre-Modus.'
        )
      }

      throw new Error(
        'Spotify verweigert den Zugriff auf die Tracks dieser Playlist (403). ' +
        'Prüfe in deinem Spotify Developer Dashboard unter der App-Konfiguration, ' +
        'ob die nötigen Zugriffsrechte für die Web API aktiviert sind. ' +
        'Alternativ funktioniert der Genre-Modus.'
      )
    }
    throw new Error('Playlist enthält keine abspielbaren Tracks.')
  }

  return prioritizeWithPreview(shuffleArray(deduplicateTracks(tracks))).slice(0, count)
}

/* ── Playlist Access Check ──────────────────────────────────
   Leichtgewichtiger Check (1 Track), ob eine Playlist
   über die API zugänglich ist. Nutzbar vor dem Quiz-Start.
   ──────────────────────────────────────────────────────────── */
export async function checkPlaylistAccess(playlistId) {
  try {
    /* Metadata-Endpunkt ist robuster als /tracks – weniger 403-Probleme */
    await spotifyFetch(`/playlists/${playlistId}?fields=id,public,tracks.total`)
    return { accessible: true }
  } catch (err) {
    if (err.message.includes('Forbidden') || err.message.includes('403')) {
      return { accessible: false, reason: 'private' }
    }
    if (isAuthError(err)) {
      return { accessible: false, reason: 'auth' }
    }
    return { accessible: false, reason: 'unknown', message: err.message }
  }
}

/* ── Track Year (für SDK-Stream-Modus) ────────────────────────
   Holt das Release-Jahr eines einzelnen Tracks via /tracks/{id}.
   Dieser Endpoint funktioniert auch im Development Mode.
   ──────────────────────────────────────────────────────────── */
export async function fetchTrackYear(trackId) {
  try {
    const data = await spotifyFetch(`/tracks/${trackId}`)
    const rd = data.album?.release_date ?? ''
    const year = rd ? parseInt(rd.split('-')[0], 10) : NaN
    return Number.isNaN(year) ? null : year
  } catch {
    return null
  }
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
      if (isAuthError(err)) throw err
    }
  }

  if (tracks.length === 0 && lastError) {
    throw new Error(`Zufällige Tracks konnten nicht geladen werden: ${lastError.message}`)
  }

  return prioritizeWithPreview(shuffleArray(deduplicateTracks(tracks))).slice(0, count)
}

/* ── User Playlists ─────────────────────────────────────────
   Lädt Playlists mit localStorage-Persistenz als Fallback.
   In-Memory-Cache (5 Min) verhindert unnötige API-Calls.
   In-Flight-Dedup verhindert Race Conditions.
   ──────────────────────────────────────────────────────────── */
let playlistCache = { data: null, ts: 0 }
let playlistInflight = null
const PLAYLIST_CACHE_MS = 5 * 60_000
const PLAYLIST_LS_KEY = 'spotify_playlists_cache'

function readPlaylistsFromStorage() {
  try {
    const raw = localStorage.getItem(PLAYLIST_LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.data) && parsed.data.length > 0) return parsed.data
  } catch { /* corrupt storage */ }
  return null
}

function writePlaylistsToStorage(data) {
  try {
    localStorage.setItem(PLAYLIST_LS_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch { /* quota exceeded */ }
}

export async function fetchUserPlaylists() {
  if (playlistCache.data && Date.now() - playlistCache.ts < PLAYLIST_CACHE_MS) {
    return playlistCache.data
  }

  if (playlistInflight) return playlistInflight

  playlistInflight = (async () => {
    try {
      const all = []
      let offset = 0
      const limit = 50
      const maxPages = 10

      for (let page = 0; page < maxPages; page++) {
        const result = await spotifyFetch(`/me/playlists?limit=${limit}&offset=${offset}`)
        const items = result.items ?? []
        for (const pl of items) {
          all.push({
            id: pl.id,
            name: pl.name,
            tracks: typeof pl.tracks?.total === 'number' ? pl.tracks.total : null,
            image: pl.images?.[0]?.url ?? null,
            ownerId: pl.owner?.id ?? null,
            ownerName: pl.owner?.display_name ?? null,
          })
        }
        if (!result.next || items.length < limit) break
        offset += limit
      }

      playlistCache = { data: all, ts: Date.now() }
      writePlaylistsToStorage(all)
      return all
    } finally {
      playlistInflight = null
    }
  })()

  return playlistInflight
}

export function getCachedPlaylists() {
  if (playlistCache.data && Date.now() - playlistCache.ts < PLAYLIST_CACHE_MS) {
    return playlistCache.data
  }
  return readPlaylistsFromStorage()
}

/* ── Discover Tracks (Tinder) ───────────────────────────────
   Wie fetchTracksForGenre, aber mit zufälligem Startoffset
   für Abwechslung bei wiederholten Aufrufen.
   ──────────────────────────────────────────────────────────── */
export async function fetchDiscoverTracks(searchQuery = null, count = 20, yearRange = null) {
  if (!searchQuery) return fetchRandomTracks(count, yearRange)

  const tracks = []
  const marketParam = buildMarketParam()
  const yearFilter = buildYearFilter(yearRange)
  const q = encodeURIComponent(`${searchQuery}${yearFilter}`)
  const baseOffset = Math.floor(Math.random() * 50)

  for (let i = 0; i < 3; i++) {
    if (tracks.length >= count) break
    const offset = baseOffset + i * 10
    if (offset > 950) break
    try {
      const result = await spotifyFetch(
        `/search?q=${q}&type=track&limit=10&offset=${offset}${marketParam}`
      )
      for (const track of result.tracks?.items ?? []) {
        const t = extractTrack(track)
        if (t) tracks.push(t)
      }
      if ((result.tracks?.items?.length ?? 0) < 10) break
    } catch (err) {
      if (isAuthError(err)) throw err
    }
  }

  return prioritizeWithPreview(shuffleArray(deduplicateTracks(tracks))).slice(0, count)
}

/* ── Playlist erstellen ──────────────────────────────────── */
export async function createPlaylist(userId, name, description = '') {
  return spotifyFetch(`/users/${encodeURIComponent(userId)}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, public: false }),
  })
}

/* ── Tracks zu Playlist hinzufügen ───────────────────────── */
export async function addTracksToPlaylist(playlistId, trackUris) {
  for (let i = 0; i < trackUris.length; i += 100) {
    const chunk = trackUris.slice(i, i + 100)
    await spotifyFetch(`/playlists/${encodeURIComponent(playlistId)}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: chunk }),
    })
  }
}
