import { useRef, useCallback, useState, useEffect } from 'react'
import { useSceneStore } from '@/store/index'
import { SceneSidebar } from '@/components/scene/SceneSidebar'
import { TransportBar } from '@/components/scene/TransportBar'
import { VideoPanel } from '@/components/video/VideoPanel'
import { MusicPanel } from '@/components/music/MusicPanel'
import { SfxPanel } from '@/components/sfx/SfxPanel'
import { VideoPlayer } from '@/components/video/VideoPlayer'
import { YouTubeVideoPlayer } from '@/components/video/YouTubePlayer'
import { useLocalVideo } from '@/hooks/use-local-video'

function App() {
  const scene = useSceneStore((s) => s.activeScene())
  const appRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [uiVisible, setUiVisible] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const videoSource = scene?.video.source ?? null

  // Local video management (lifted here so VideoPlayer and VideoPanel share state)
  const localVideo = useLocalVideo(
    videoSource?.source === 'local' ? videoSource.shuffle : false
  )

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

  // Auto-hide UI in fullscreen after inactivity
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

      {/* UI layer — overlays on top of video */}
      <div
        className={`relative z-10 flex w-full h-full transition-opacity duration-500 ${
          isFullscreen && !uiVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Sidebar */}
        <SceneSidebar />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {scene ? (
            <>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-4">
                  <VideoPanel localVideo={localVideo} />
                  <MusicPanel />
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
