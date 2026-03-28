import { useRef, useCallback, useState, useEffect } from 'react'
import { useSceneStore } from '@/store/index'
import { SceneSidebar } from '@/components/scene/SceneSidebar'
import { TransportBar } from '@/components/scene/TransportBar'
import { VideoPanel } from '@/components/video/VideoPanel'
import { MusicPanel } from '@/components/music/MusicPanel'
import { SfxPanel } from '@/components/sfx/SfxPanel'
import { VideoPlayer } from '@/components/video/VideoPlayer'
import { YouTubeVideoPlayer } from '@/components/video/YouTubePlayer'
import { YouTubeMusicPlayer } from '@/components/music/YouTubeMusicPlayer'
import { useLocalVideo } from '@/hooks/use-local-video'
import { useLocalAudio } from '@/hooks/use-local-audio'
import { useSpotify } from '@/hooks/use-spotify'

const SPOTIFY_CLIENT_ID = localStorage.getItem('ambiance-spotify-client-id') ?? ''

function App() {
  const scene = useSceneStore((s) => s.activeScene())
  const playing = useSceneStore((s) => s.playing)
  const appRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [uiVisible, setUiVisible] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const videoSource = scene?.video.source ?? null
  const musicSource = scene?.music.source ?? null

  // Local video
  const localVideo = useLocalVideo(
    videoSource?.source === 'local' ? videoSource.shuffle : false
  )

  // Local audio
  const localAudio = useLocalAudio(
    musicSource?.source === 'local' ? musicSource.shuffle : false,
    scene?.music.volume ?? 0.5,
    scene?.music.muted ?? false,
  )

  // Spotify
  const spotify = useSpotify({
    clientId: SPOTIFY_CLIENT_ID,
    volume: scene?.music.volume ?? 0.5,
    muted: scene?.music.muted ?? false,
  })

  // Sync local audio play/pause with global transport
  useEffect(() => {
    if (musicSource?.source !== 'local') return
    if (playing) localAudio.play()
    else localAudio.pause()
  }, [playing, musicSource?.source])

  // Sync spotify play/pause with global transport
  useEffect(() => {
    if (musicSource?.source !== 'spotify') return
    if (playing) spotify.play()
    else spotify.pause()
  }, [playing, musicSource?.source])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!appRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      appRef.current.requestFullscreen()
    }
  }, [])

  // Track fullscreen state
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Auto-hide UI in fullscreen
  useEffect(() => {
    if (!isFullscreen) {
      setUiVisible(true)
      return
    }
    const showUi = () => {
      setUiVisible(true)
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => setUiVisible(false), 3000)
    }
    showUi()
    window.addEventListener('mousemove', showUi)
    return () => {
      window.removeEventListener('mousemove', showUi)
      clearTimeout(hideTimerRef.current)
    }
  }, [isFullscreen])

  const handleVideoEnded = useCallback(() => {
    localVideo.next()
  }, [localVideo])

  return (
    <div ref={appRef} className="relative flex h-screen bg-surface text-text-primary">
      {/* Video background layer */}
      {scene && videoSource && (
        <>
          {videoSource.source === 'local' && localVideo.currentUrl && (
            <VideoPlayer src={localVideo.currentUrl} onEnded={handleVideoEnded} />
          )}
          {videoSource.source === 'youtube' && (
            <YouTubeVideoPlayer source={videoSource} />
          )}
        </>
      )}

      {/* Hidden YouTube music player */}
      {scene && musicSource?.source === 'youtube' && (
        <YouTubeMusicPlayer source={musicSource} />
      )}

      {/* UI layer */}
      <div
        className={`relative z-10 flex w-full h-full transition-opacity duration-500 ${
          isFullscreen && !uiVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <SceneSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {scene ? (
            <>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-4">
                  <VideoPanel localVideo={localVideo} />
                  <MusicPanel localAudio={localAudio} spotify={spotify} />
                  <SfxPanel />
                </div>
              </div>
              <TransportBar onFullscreen={toggleFullscreen} isFullscreen={isFullscreen} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-light text-text-secondary mb-2">Ambiance</p>
                <p className="text-sm text-text-secondary">
                  Create a new scene or select one from the sidebar.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
