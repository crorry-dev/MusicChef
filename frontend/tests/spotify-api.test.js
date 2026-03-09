import { describe, it, expect, vi, beforeEach } from 'vitest'

/* ── Mocks ───────────────────────────────────────────────── */
vi.mock('../src/lib/spotify-pkce', () => ({
  getValidToken: vi.fn(() => Promise.resolve('fake-token')),
}))

/* localStorage-Mock (Node 22+ hat ein experimentelles localStorage ohne clear()) */
const store = {}
const localStorageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = String(val) }),
  removeItem: vi.fn((key) => { delete store[key] }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k] }),
}
vi.stubGlobal('localStorage', localStorageMock)

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

/* Importiere nach Mocking */
const {
  fetchTracksForPlaylist,
  checkPlaylistAccess,
  fetchUserPlaylists,
} = await import('../src/lib/spotify-api.js')

/* ── Helpers ─────────────────────────────────────────────── */
function jsonResponse(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  })
}

function spotifyTrack(id, name = 'Test Track', artist = 'Test Artist') {
  return {
    id,
    name,
    artists: [{ name: artist }],
    album: {
      name: 'Test Album',
      images: [{ url: 'https://example.com/img.jpg' }],
      release_date: '2023-01-01',
    },
    preview_url: `https://p.scdn.co/preview/${id}`,
    external_urls: { spotify: `https://open.spotify.com/track/${id}` },
  }
}

function playlistTracksResponse(tracks) {
  return {
    items: tracks.map((t) => ({ track: t })),
    total: tracks.length,
    next: null,
  }
}

beforeEach(() => {
  mockFetch.mockReset()
  localStorageMock.clear()
})

/* ═══════════════════════════════════════════════════════════
   fetchTracksForPlaylist
   ═══════════════════════════════════════════════════════════ */
describe('fetchTracksForPlaylist', () => {
  it('gibt Tracks zurück für zugängliche Playlist', async () => {
    const tracks = [spotifyTrack('t1'), spotifyTrack('t2'), spotifyTrack('t3')]
    mockFetch.mockReturnValue(jsonResponse(200, playlistTracksResponse(tracks)))

    const result = await fetchTracksForPlaylist('abc123', 3)

    expect(result.length).toBe(3)
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('title')
    expect(result[0]).toHaveProperty('artist')
    expect(result[0]).toHaveProperty('preview_url')
  })

  it('wirft spezifischen Fehler bei 403 Forbidden', async () => {
    mockFetch.mockReturnValue(
      jsonResponse(403, { error: { status: 403, message: 'Forbidden' } })
    )

    await expect(fetchTracksForPlaylist('private-pl', 5)).rejects.toThrow(
      'Kein Zugriff auf diese Playlist'
    )
  })

  it('wirft Auth-Fehler bei 401', async () => {
    mockFetch.mockReturnValue(
      jsonResponse(401, { error: { status: 401, message: 'Token abgelaufen' } })
    )

    await expect(fetchTracksForPlaylist('abc', 5)).rejects.toThrow('einloggen')
  })

  it('gibt leere Ergebnisse zurück wenn Playlist leer ist', async () => {
    mockFetch.mockReturnValue(jsonResponse(200, { items: [], total: 0, next: null }))

    const result = await fetchTracksForPlaylist('empty-pl', 5)
    expect(result).toEqual([])
  })

  it('akzeptiert maximal count Tracks', async () => {
    const tracks = Array.from({ length: 20 }, (_, i) => spotifyTrack(`t${i}`))
    mockFetch.mockReturnValue(jsonResponse(200, playlistTracksResponse(tracks)))

    const result = await fetchTracksForPlaylist('abc', 5)
    expect(result.length).toBe(5)
  })
})

/* ═══════════════════════════════════════════════════════════
   checkPlaylistAccess
   ═══════════════════════════════════════════════════════════ */
describe('checkPlaylistAccess', () => {
  it('gibt accessible: true für zugängliche Playlist', async () => {
    mockFetch.mockReturnValue(
      jsonResponse(200, { items: [{ track: spotifyTrack('t1') }], total: 1, next: null })
    )

    const result = await checkPlaylistAccess('good-pl')
    expect(result).toEqual({ accessible: true })
  })

  it('gibt accessible: false + reason: private bei 403', async () => {
    mockFetch.mockReturnValue(
      jsonResponse(403, { error: { status: 403, message: 'Forbidden' } })
    )

    const result = await checkPlaylistAccess('private-pl')
    expect(result).toEqual({ accessible: false, reason: 'private' })
  })

  it('gibt accessible: false + reason: auth bei 401', async () => {
    mockFetch.mockReturnValue(
      jsonResponse(401, { error: { status: 401, message: 'Unauthorized' } })
    )

    const result = await checkPlaylistAccess('auth-fail-pl')
    expect(result).toEqual({ accessible: false, reason: 'auth' })
  })
})

/* ═══════════════════════════════════════════════════════════
   fetchUserPlaylists
   ═══════════════════════════════════════════════════════════ */
describe('fetchUserPlaylists', () => {
  it('gibt Playlists mit ownerName zurück', async () => {
    mockFetch.mockReturnValue(
      jsonResponse(200, {
        items: [
          {
            id: 'pl1',
            name: 'Meine Playlist',
            tracks: { total: 42 },
            images: [{ url: 'https://img.example.com/pl1.jpg' }],
            owner: { id: 'user1', display_name: 'Max Mustermann' },
          },
          {
            id: 'pl2',
            name: 'Fremde Playlist',
            tracks: { total: 100 },
            images: [],
            owner: { id: 'user2', display_name: 'Erika Musterfrau' },
          },
        ],
        next: null,
        total: 2,
      })
    )

    const result = await fetchUserPlaylists()

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      id: 'pl1',
      name: 'Meine Playlist',
      tracks: 42,
      ownerName: 'Max Mustermann',
      ownerId: 'user1',
    })
    expect(result[1]).toMatchObject({
      id: 'pl2',
      name: 'Fremde Playlist',
      ownerName: 'Erika Musterfrau',
      ownerId: 'user2',
    })
  })
})
