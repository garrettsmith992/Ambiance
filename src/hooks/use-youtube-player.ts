import { useEffect, useRef, useCallback, useState } from 'react'

declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady: (() => void) | undefined
  }
}

interface UseYouTubePlayerOptions {
  containerId: string
  volume: number
  muted: boolean
  onEnded?: () => void
}

interface UseYouTubePlayerReturn {
  loadVideo: (videoId: string) => void
  loadPlaylist: (playlistId: string) => void
  play: () => void
  pause: () => void
  isReady: boolean
}

let apiLoaded = false
let apiLoading = false
const apiReadyCallbacks: (() => void)[] = []

function ensureYouTubeAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve()
  return new Promise((resolve) => {
    apiReadyCallbacks.push(resolve)
    if (apiLoading) return
    apiLoading = true

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)

    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true
      apiReadyCallbacks.forEach((cb) => cb())
      apiReadyCallbacks.length = 0
    }
  })
}

export function useYouTubePlayer({ containerId, volume, muted, onEnded }: UseYouTubePlayerOptions): UseYouTubePlayerReturn {
  const playerRef = useRef<YT.Player | null>(null)
  const [isReady, setIsReady] = useState(false)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  useEffect(() => {
    let cancelled = false

    ensureYouTubeAPI().then(() => {
      if (cancelled) return
      const container = document.getElementById(containerId)
      if (!container) return

      playerRef.current = new YT.Player(containerId, {
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 0,
          iv_load_policy: 3,
          disablekb: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            if (!cancelled) setIsReady(true)
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (event.data === YT.PlayerState.ENDED) {
              onEndedRef.current?.()
            }
          },
        },
      })
    })

    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
      setIsReady(false)
    }
  }, [containerId])

  // Sync volume
  useEffect(() => {
    if (!playerRef.current || !isReady) return
    playerRef.current.setVolume(volume * 100)
  }, [volume, isReady])

  // Sync mute
  useEffect(() => {
    if (!playerRef.current || !isReady) return
    if (muted) {
      playerRef.current.mute()
    } else {
      playerRef.current.unMute()
    }
  }, [muted, isReady])

  const loadVideo = useCallback((videoId: string) => {
    if (!playerRef.current || !isReady) return
    playerRef.current.loadVideoById(videoId)
  }, [isReady])

  const loadPlaylist = useCallback((playlistId: string) => {
    if (!playerRef.current || !isReady) return
    playerRef.current.loadPlaylist({ list: playlistId, listType: 'playlist' })
  }, [isReady])

  const play = useCallback(() => {
    playerRef.current?.playVideo()
  }, [])

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo()
  }, [])

  return { loadVideo, loadPlaylist, play, pause, isReady }
}
