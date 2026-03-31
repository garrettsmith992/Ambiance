import { useState, useEffect, useRef, useCallback } from 'react'

declare global {
  interface Window {
    Spotify: {
      Player: new (config: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume: number
      }) => SpotifyPlayer
    }
    onSpotifyWebPlaybackSDKReady: (() => void) | undefined
  }
}

interface SpotifyPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  addListener(event: string, callback: (state: Record<string, unknown>) => void): void
  removeListener(event: string): void
  togglePlay(): Promise<void>
  resume(): Promise<void>
  pause(): Promise<void>
  setVolume(volume: number): Promise<void>
  getCurrentState(): Promise<SpotifyPlaybackState | null>
}

interface SpotifyPlaybackState {
  paused: boolean
  track_window: {
    current_track: {
      name: string
      artists: Array<{ name: string }>
      album: { name: string; images: Array<{ url: string }> }
    }
  }
}

interface UseSpotifyOptions {
  clientId: string
  volume: number
  muted: boolean
}

interface UseSpotifyReturn {
  isReady: boolean
  isAuthenticated: boolean
  currentTrack: string | null
  authenticate: () => void
  playUri: (uri: string) => void
  play: () => void
  pause: () => void
  deviceId: string | null
}

const REDIRECT_URI = window.location.origin
const SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state'
const TOKEN_KEY = 'ambiance-spotify-token'
const TOKEN_EXPIRY_KEY = 'ambiance-spotify-token-expiry'

function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

let sdkLoaded = false
let sdkLoading = false
const sdkReadyCallbacks: (() => void)[] = []

function ensureSpotifySDK(): Promise<void> {
  if (sdkLoaded) return Promise.resolve()
  return new Promise((resolve) => {
    sdkReadyCallbacks.push(resolve)
    if (sdkLoading) return
    sdkLoading = true

    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    document.head.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      sdkLoaded = true
      sdkReadyCallbacks.forEach((cb) => cb())
      sdkReadyCallbacks.length = 0
    }
  })
}

export function useSpotify({ clientId, volume, muted }: UseSpotifyOptions): UseSpotifyReturn {
  const [isReady, setIsReady] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const playerRef = useRef<SpotifyPlayer | null>(null)
  const tokenRef = useRef<string | null>(null)

  // Check for existing token or callback
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)

    if (storedToken && expiry && Date.now() < parseInt(expiry)) {
      tokenRef.current = storedToken
      setIsAuthenticated(true)
      return
    }

    // Check for auth callback
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const cid = clientId || localStorage.getItem('ambiance-spotify-client-id')?.trim() || ''
    if (code && cid) {
      const verifier = sessionStorage.getItem('spotify-code-verifier')
      if (verifier) {
        exchangeToken(code, verifier, cid)
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [clientId])

  const exchangeToken = async (code: string, verifier: string, cid: string) => {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cid,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      }),
    })

    const data = await response.json()
    if (data.access_token) {
      tokenRef.current = data.access_token
      localStorage.setItem(TOKEN_KEY, data.access_token)
      localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + data.expires_in * 1000))
      sessionStorage.removeItem('spotify-code-verifier')
      setIsAuthenticated(true)
    }
  }

  // Initialize player when authenticated
  useEffect(() => {
    if (!isAuthenticated || !tokenRef.current) return

    let cancelled = false

    ensureSpotifySDK().then(() => {
      if (cancelled) return

      const player = new window.Spotify.Player({
        name: 'Ambiance',
        getOAuthToken: (cb) => {
          if (tokenRef.current) cb(tokenRef.current)
        },
        volume: muted ? 0 : volume,
      })

      player.addListener('ready', (state) => {
        const id = (state as unknown as { device_id: string }).device_id
        setDeviceId(id)
        setIsReady(true)
      })

      player.addListener('player_state_changed', (state) => {
        if (!state) return
        const typed = state as unknown as SpotifyPlaybackState
        const track = typed.track_window?.current_track
        if (track) {
          setCurrentTrack(`${track.name} — ${track.artists.map((a) => a.name).join(', ')}`)
        }
      })

      player.connect()
      playerRef.current = player
    })

    return () => {
      cancelled = true
      playerRef.current?.disconnect()
      playerRef.current = null
      setIsReady(false)
    }
  }, [isAuthenticated])

  // Sync volume
  useEffect(() => {
    if (!playerRef.current || !isReady) return
    playerRef.current.setVolume(muted ? 0 : volume)
  }, [volume, muted, isReady])

  const authenticate = useCallback(async () => {
    try {
      // Read client ID fresh from localStorage in case the user just saved it
      const cid = clientId || localStorage.getItem('ambiance-spotify-client-id')?.trim() || ''
      if (!cid) return
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)
      sessionStorage.setItem('spotify-code-verifier', verifier)

      const params = new URLSearchParams({
        client_id: cid,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        code_challenge_method: 'S256',
        code_challenge: challenge,
      })

      window.location.href = `https://accounts.spotify.com/authorize?${params}`
    } catch {
      // Auth failed silently
    }
  }, [clientId])

  const playUri = useCallback(async (uri: string) => {
    if (!deviceId || !tokenRef.current) return

    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenRef.current}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        uri.includes('track')
          ? { uris: [uri] }
          : { context_uri: uri }
      ),
    })
  }, [deviceId])

  const play = useCallback(() => {
    playerRef.current?.resume()
  }, [])

  const pause = useCallback(() => {
    playerRef.current?.pause()
  }, [])

  return {
    isReady,
    isAuthenticated,
    currentTrack,
    authenticate,
    playUri,
    play,
    pause,
    deviceId,
  }
}
