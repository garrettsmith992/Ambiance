import { useRef, useCallback, useState, useEffect } from 'react'
import { useSceneStore } from '@/store/index'
import type { Scene, VideoSourceYouTube, MusicSourceYouTube } from '@/types/index'
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
import { useSfx } from '@/hooks/use-sfx'
import { exportAmb, importAmb, downloadBlob, getLocalSourceWarnings } from '@/lib/amb-format'

const SPOTIFY_CLIENT_ID = localStorage.getItem('ambiance-spotify-client-id') ?? ''

function App() {
  const scene = useSceneStore((s) => s.activeScene())
  const playing = useSceneStore((s) => s.playing)
  const appRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [uiVisible, setUiVisible] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Derive active sources from the playlist arrays
  const hasLocalVideo = scene?.video.sources.some((s) => s.type === 'local') ?? false
  const hasLocalMusic = scene?.music.sources.some((s) => s.type === 'local') ?? false
  const firstYouTubeVideo = scene?.video.sources.find((s) => s.type === 'youtube') as VideoSourceYouTube | undefined
  const firstYouTubeMusic = scene?.music.sources.find((s) => s.type === 'youtube') as MusicSourceYouTube | undefined

  // Local video
  const localVideo = useLocalVideo(scene?.video.shuffle ?? true)

  // Local audio
  const localAudio = useLocalAudio(
    scene?.music.shuffle ?? true,
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
    if (!hasLocalMusic) return
    if (playing) localAudio.play()
    else localAudio.pause()
  }, [playing, hasLocalMusic])

  // Sync spotify play/pause with global transport
  const hasSpotify = scene?.music.sources.some((s) => s.type === 'spotify') ?? false
  useEffect(() => {
    if (!hasSpotify) return
    if (playing) spotify.play()
    else spotify.pause()
  }, [playing, hasSpotify])

  // SFX layer
  const sfx = useSfx(scene?.sfx.slots ?? [], playing)

  // .amb export
  const importScene = useSceneStore((s) => s.importScene)

  const handleExport = useCallback(async (sceneToExport: Scene) => {
    const warnings = getLocalSourceWarnings(sceneToExport)
    if (warnings.length > 0) {
      const proceed = window.confirm(
        `Warning:\n\n${warnings.join('\n')}\n\nThese local sources won't be accessible on another machine. Export anyway?`
      )
      if (!proceed) return
    }
    const blob = await exportAmb(sceneToExport, sfx.getFileHandle)
    const safeName = sceneToExport.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    downloadBlob(blob, `${safeName}.amb`)
  }, [sfx.getFileHandle])

  // .amb import
  const handleImport = useCallback(async (file: File) => {
    try {
      const { scene: imported, sfxBlobs } = await importAmb(file)
      importScene(imported)
      const updated = useSceneStore.getState().activeScene()
      if (updated) {
        for (const slot of updated.sfx.slots) {
          const entry = sfxBlobs.get(slot.id)
          if (entry) sfx.loadSlotBlob(slot.id, entry.blob)
        }
      }
    } catch {
      window.alert('Failed to import .amb file. The file may be corrupt or invalid.')
    }
  }, [importScene, sfx])

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
      {scene && (
        <>
          {hasLocalVideo && localVideo.currentUrl && (
            <VideoPlayer src={localVideo.currentUrl} onEnded={handleVideoEnded} />
          )}
          {firstYouTubeVideo && (
            <YouTubeVideoPlayer source={firstYouTubeVideo} />
          )}
        </>
      )}

      {/* Hidden YouTube music player */}
      {scene && firstYouTubeMusic && (
        <YouTubeMusicPlayer source={firstYouTubeMusic} />
      )}

      {/* UI layer */}
      <div
        className={`relative z-10 flex w-full h-full transition-opacity duration-500 ${
          isFullscreen && !uiVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <SceneSidebar onExport={handleExport} onImport={handleImport} />

        <div className="flex-1 flex flex-col min-w-0">
          {scene ? (
            <>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-4">
                  <VideoPanel localVideo={localVideo} />
                  <MusicPanel localAudio={localAudio} spotify={spotify} />
                  <SfxPanel sfx={sfx} />
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
