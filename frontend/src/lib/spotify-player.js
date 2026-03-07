/**
 * Spotify Web Playback SDK – Singleton Wrapper.
 *
 * Ermöglicht vollständige Track-Wiedergabe im Browser (erfordert Spotify Premium).
 * Wenn Premium nicht verfügbar ist, schlagen connectPlayer() oder play() fehl,
 * und der Aufrufer kann auf preview_url-Audio-Fallback zurückfallen.
 */
import { getValidToken } from './spotify-pkce'

let player = null
let deviceId = null
let initPromise = null
const stateListeners = new Set()

/* ── SDK Script laden ──────────────────────────────────────── */
function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.Spotify) { resolve(); return }
    const timeout = setTimeout(() => reject(new Error('SDK Ladezeit überschritten')), 8000)
    window.onSpotifyWebPlaybackSDKReady = () => { clearTimeout(timeout); resolve() }
    const el = document.createElement('script')
    el.src = 'https://sdk.scdn.co/spotify-player.js'
    el.async = true
    el.onerror = () => { clearTimeout(timeout); reject(new Error('SDK Script fehlgeschlagen')) }
    document.head.appendChild(el)
  })
}

/* ── Player verbinden (Singleton) ─────────────────────────── */
export async function connectPlayer() {
  if (deviceId) return deviceId
  if (initPromise) return initPromise

  initPromise = (async () => {
    const token = await getValidToken()
    if (!token) throw new Error('Nicht authentifiziert')

    await loadScript()

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Player Verbindung Timeout')), 10000)

      player = new window.Spotify.Player({
        name: 'MusicChef Quiz',
        getOAuthToken: async (cb) => cb(await getValidToken()),
        volume: 0.8,
      })

      player.addListener('ready', ({ device_id }) => {
        clearTimeout(timeout)
        deviceId = device_id
        resolve(device_id)
      })

      player.addListener('not_ready', () => { deviceId = null })

      player.addListener('initialization_error', ({ message }) => {
        clearTimeout(timeout)
        reject(new Error(message))
      })

      player.addListener('authentication_error', ({ message }) => {
        clearTimeout(timeout)
        reject(new Error(message))
      })

      player.addListener('account_error', ({ message }) => {
        clearTimeout(timeout)
        reject(new Error(message || 'Spotify Premium erforderlich'))
      })

      player.addListener('player_state_changed', (state) => {
        for (const fn of stateListeners) fn(state)
      })

      player.connect()
    })
  })()

  try {
    return await initPromise
  } catch (e) {
    initPromise = null
    throw e
  }
}

/* ── Track abspielen ───────────────────────────────────────── */
export async function play(trackId) {
  if (!deviceId) throw new Error('Player nicht verbunden')
  const token = await getValidToken()

  const res = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
    },
  )

  if (res.status === 403) throw new Error('Spotify Premium erforderlich')
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error?.message || `Wiedergabe fehlgeschlagen (${res.status})`)
  }
}

/* ── Steuerung ─────────────────────────────────────────────── */
export async function pause() {
  try { await player?.pause() } catch { /* silent */ }
}

export async function resume() {
  try { await player?.resume() } catch { /* silent */ }
}

export async function seek(positionMs) {
  try { await player?.seek(Math.round(positionMs)) } catch { /* silent */ }
}

/* ── State Listener ────────────────────────────────────────── */
export function onStateChange(fn) {
  stateListeners.add(fn)
  return () => stateListeners.delete(fn)
}

/* ── Aufräumen ─────────────────────────────────────────────── */
export async function disconnect() {
  try { player?.disconnect() } catch { /* silent */ }
  player = null
  deviceId = null
  initPromise = null
  stateListeners.clear()
}

export function isConnected() {
  return !!deviceId
}
