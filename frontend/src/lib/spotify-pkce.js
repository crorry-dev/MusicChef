const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'streaming',
  'user-modify-playback-state',
  'user-read-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
].join(' ')

function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const array = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(array, (byte) => possible[byte % possible.length]).join('')
}

async function sha256(plain) {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return crypto.subtle.digest('SHA-256', data)
}

function base64urlencode(buffer) {
  const bytes = new Uint8Array(buffer)
  let str = ''
  bytes.forEach((b) => (str += String.fromCharCode(b)))
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Build the redirect URI for Spotify OAuth.
 * Spotify requires 127.0.0.1 instead of localhost for loopback addresses (since Nov 2025).
 * HTTPS is required for all non-loopback redirect URIs.
 */
function buildRedirectUri() {
  const origin = window.location.origin.replace('://localhost', '://127.0.0.1')
  return `${origin}${import.meta.env.BASE_URL}callback`
}

// --- Client ID Management ---

export function getClientId() {
  return localStorage.getItem('spotify_client_id')
}

export function setClientId(id) {
  localStorage.setItem('spotify_client_id', id.trim())
}

export function clearClientId() {
  localStorage.removeItem('spotify_client_id')
}

// --- Token Management ---

export function getStoredToken() {
  const raw = localStorage.getItem('spotify_token')
  if (!raw) return null
  try {
    const token = JSON.parse(raw)
    if (token.expires_at && Date.now() > token.expires_at) {
      return { ...token, expired: true }
    }
    return token
  } catch {
    return null
  }
}

export function storeToken(tokenData) {
  const expiresAt = Date.now() + (tokenData.expires_in ?? 3600) * 1000
  const data = { ...tokenData, expires_at: expiresAt }
  localStorage.setItem('spotify_token', JSON.stringify(data))
  return data
}

export function clearToken() {
  localStorage.removeItem('spotify_token')
  localStorage.removeItem('spotify_code_verifier')
}

// --- PKCE Login Flow ---

export async function startPKCELogin() {
  const clientId = getClientId()
  if (!clientId) throw new Error('No Client ID configured')

  const codeVerifier = generateRandomString(128)
  localStorage.setItem('spotify_code_verifier', codeVerifier)

  const challengeBuffer = await sha256(codeVerifier)
  const codeChallenge = base64urlencode(challengeBuffer)

  const redirectUri = buildRedirectUri()

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    scope: SCOPES,
    show_dialog: 'true',
  })

  window.location.href = `${SPOTIFY_AUTH_URL}?${params}`
}

// --- Token Exchange ---

export async function exchangeCode(code) {
  const clientId = getClientId()
  const codeVerifier = localStorage.getItem('spotify_code_verifier')
  const redirectUri = buildRedirectUri()

  if (!clientId || !codeVerifier) {
    throw new Error('Missing Client ID or Code Verifier')
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error_description || error.error || 'Token exchange failed')
  }

  const tokenData = await response.json()
  localStorage.removeItem('spotify_code_verifier')
  return storeToken(tokenData)
}

// --- Token Refresh ---

export async function refreshAccessToken() {
  const clientId = getClientId()
  const token = getStoredToken()

  if (!clientId || !token?.refresh_token) {
    throw new Error('Cannot refresh: missing Client ID or refresh token')
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
    }),
  })

  if (!response.ok) {
    throw new Error('Token refresh failed')
  }

  const tokenData = await response.json()
  if (!tokenData.refresh_token) {
    tokenData.refresh_token = token.refresh_token
  }
  return storeToken(tokenData)
}

// --- Get Valid Token (auto-refresh) ---

export async function getValidToken() {
  let token = getStoredToken()
  if (!token) return null

  if (token.expired && token.refresh_token) {
    try {
      token = await refreshAccessToken()
    } catch {
      clearToken()
      return null
    }
  }

  return token?.access_token ?? null
}
