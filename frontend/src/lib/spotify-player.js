/**
 * Spotify Web Playback SDK – Singleton Wrapper.
 *
 * Ermöglicht vollständige Track-Wiedergabe im Browser (erfordert Spotify Premium).
 * Wenn Premium nicht verfügbar ist, schlagen connectPlayer() oder play() fehl,
 * und der Aufrufer kann auf preview_url-Audio-Fallback zurückfallen.
 *
 * Auf mobilen Browsern ist das SDK nicht verfügbar – connectPlayer() gibt
 * sofort einen Fehler, damit der Aufrufer direkt den Audio-Fallback nutzt.
 */
import { getValidToken } from './spotify-pkce'

let player = null
let deviceId = null
let initPromise = null
const stateListeners = new Set()
const connectionListeners = new Set()

/* ── Mobile Detection ─────────────────────────────────────── */
function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent))
}

export function isMobile() {
  return isMobileBrowser()
}

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
  if (isMobileBrowser()) {
    throw new Error('Spotify SDK nicht verfügbar auf mobilen Browsern')
  }

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
        for (const fn of connectionListeners) fn(true)
        resolve(device_id)
      })

      player.addListener('not_ready', () => {
        deviceId = null
        for (const fn of connectionListeners) fn(false)
      })

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

  /* Gerät zuerst aktivieren – wie bei playContext() */
  const activated = await activateDevice()
  if (!activated) {
    throw new Error('Kein aktives Spotify-Gerät – bitte Seite neu laden')
  }

  const token = await getValidToken()
  const doPlay = async () => {
    const res = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
      },
    )
    return res
  }

  let res = await doPlay()

  /* Retry bei 404 (Gerät noch nicht bereit) */
  if (res.status === 404) {
    await new Promise((r) => setTimeout(r, 2000))
    res = await doPlay()
  }

  if (res.status === 403) throw new Error('Spotify Premium erforderlich')
  if (res.status === 404) throw new Error('Kein aktives Spotify-Gerät – bitte Seite neu laden')
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

export async function setVolume(value) {
  try { await player?.setVolume(Math.max(0, Math.min(1, value))) } catch { /* silent */ }
}

export function getVolume() {
  return player?.getVolume?.() ?? Promise.resolve(0.8)
}

/* ── State Listener ────────────────────────────────────────── */
export function onStateChange(fn) {
  stateListeners.add(fn)
  return () => stateListeners.delete(fn)
}

/* ── Connection Listener ───────────────────────────────────── */
export function onConnectionChange(fn) {
  connectionListeners.add(fn)
  return () => connectionListeners.delete(fn)
}

/* ── Reconnect ─────────────────────────────────────────────── */
export async function reconnect() {
  if (deviceId) return deviceId
  if (player) {
    try { player.disconnect() } catch { /* silent */ }
  }
  player = null
  deviceId = null
  initPromise = null
  return connectPlayer()
}

/* ── Gerät aktivieren (Transfer Playback) ──────────────────── */
async function activateDevice() {
  if (!deviceId) return false
  const token = await getValidToken()

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_ids: [deviceId], play: false }),
    })
    if (res.ok || res.status === 204) return true
    if (res.status === 404) {
      /* Gerät noch nicht bei Spotify registriert – warten */
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
      continue
    }
    console.warn(`[Player] Geräte-Transfer fehlgeschlagen (${res.status})`)
    return false
  }
  console.warn('[Player] Geräte-Transfer nach 3 Versuchen fehlgeschlagen')
  return false
}

/* ── Playlist / Context abspielen ──────────────────────────── */
export async function playContext(contextUri, shuffle = true) {
  if (!deviceId) throw new Error('Player nicht verbunden')

  /* Gerät zuerst aktivieren – MUSS erfolgreich sein bevor API-Calls kommen */
  const activated = await activateDevice()
  if (!activated) {
    throw new Error('Kein aktives Spotify-Gerät gefunden – bitte Seite neu laden')
  }

  const token = await getValidToken()

  if (shuffle) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const shuffleRes = await fetch(
        `https://api.spotify.com/v1/me/player/shuffle?state=true&device_id=${deviceId}`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}` } },
      )
      if (shuffleRes.ok || shuffleRes.status === 204) break
      if (shuffleRes.status === 404 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 1500))
        continue
      }
      console.warn(`[Player] Shuffle konnte nicht gesetzt werden (${shuffleRes.status})`)
      break
    }
  }

  /* Play mit Retry bei 404 */
  let playRes = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ context_uri: contextUri }),
    },
  )

  if (playRes.status === 404) {
    await new Promise((r) => setTimeout(r, 2000))
    playRes = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_uri: contextUri }),
      },
    )
  }

  if (playRes.status === 403) throw new Error('Spotify Premium erforderlich')
  if (playRes.status === 404) throw new Error('Kein aktives Spotify-Gerät gefunden – bitte Seite neu laden')
  if (!playRes.ok && playRes.status !== 204) {
    const body = await playRes.json().catch(() => ({}))
    throw new Error(body.error?.message || `Playlist-Wiedergabe fehlgeschlagen (${playRes.status})`)
  }
}

/* ── Nächster Track (Context-Playback) ─────────────────────── */
export async function skipToNext() {
  if (!player) throw new Error('Player nicht verbunden')
  await player.nextTrack()
}

/* ── Player-State lesen ────────────────────────────────────── */
export async function getPlayerState() {
  if (!player) return null
  return player.getCurrentState()
}

/* ── Aufräumen ─────────────────────────────────────────────── */
export async function disconnect() {
  try { await player?.pause() } catch { /* silent */ }
  try { player?.disconnect() } catch { /* silent */ }
  player = null
  deviceId = null
  initPromise = null
  stateListeners.clear()
  connectionListeners.clear()
  /* Mobile Connect ebenfalls pausieren */
  if (mobileDevice) {
    mobilePause().catch(() => {})
  }
}

export function isConnected() {
  return !!deviceId
}

/* ── Mobile Spotify Connect (kein SDK nötig) ──────────────── */
let mobileDevice = null

async function findDevice() {
  const token = await getValidToken()
  const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const { devices } = await res.json()

  /* Auf dem Handy: bevorzuge Smartphone-Gerät (Mac könnte sonst als
     "active" gewählt werden, wenn Spotify Desktop dort offen ist) */
  if (isMobileBrowser()) {
    return (
      devices.find((d) => d.type === 'Smartphone' && d.is_active)
      || devices.find((d) => d.type === 'Smartphone')
      || devices.find((d) => d.is_active)
      || devices[0]
      || null
    )
  }

  return (
    devices.find((d) => d.is_active)
    || devices.find((d) => d.type === 'Smartphone')
    || devices[0]
    || null
  )
}

export async function mobilePlay(trackId) {
  const token = await getValidToken()
  if (!mobileDevice) mobileDevice = await findDevice()
  if (!mobileDevice) throw new Error('NO_DEVICE')

  const res = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${mobileDevice.id}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
    },
  )

  if (res.status === 404) {
    mobileDevice = await findDevice()
    if (!mobileDevice) throw new Error('NO_DEVICE')
    const r2 = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${mobileDevice.id}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
      },
    )
    if (!r2.ok && r2.status !== 204) throw new Error('Wiedergabe fehlgeschlagen')
    return
  }

  if (res.status === 403) throw new Error('Spotify Premium erforderlich')
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error?.message || 'Wiedergabe fehlgeschlagen')
  }
}

export async function mobilePause() {
  const token = await getValidToken()
  await fetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {})
}

export async function mobileResume() {
  const token = await getValidToken()
  await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {})
}

export async function mobileSeek(positionMs) {
  const token = await getValidToken()
  await fetch(
    `https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(positionMs)}`,
    { method: 'PUT', headers: { Authorization: `Bearer ${token}` } },
  ).catch(() => {})
}

export function clearMobileDevice() {
  mobileDevice = null
}
