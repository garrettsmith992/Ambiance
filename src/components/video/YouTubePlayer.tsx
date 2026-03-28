import { useEffect } from 'react'
import { useSceneStore } from '@/store/index'
import { useYouTubePlayer } from '@/hooks/use-youtube-player'
import type { VideoSourceYouTube } from '@/types/index'

const CONTAINER_ID = 'yt-video-player'

interface YouTubeVideoPlayerProps {
  source: VideoSourceYouTube
}

export function YouTubeVideoPlayer({ source }: YouTubeVideoPlayerProps) {
  const volume = useSceneStore((s) => s.activeScene()?.video.volume ?? 0.5)
  const muted = useSceneStore((s) => s.activeScene()?.video.muted ?? false)
  const playing = useSceneStore((s) => s.playing)

  const { loadVideo, loadPlaylist, play, pause, isReady } = useYouTubePlayer({
    containerId: CONTAINER_ID,
    volume,
    muted,
  })

  // Load content when source changes
  useEffect(() => {
    if (!isReady) return
    if (source.playlistId) {
      loadPlaylist(source.playlistId)
    } else if (source.videoId) {
      loadVideo(source.videoId)
    }
  }, [isReady, source.playlistId, source.videoId, loadVideo, loadPlaylist])

  // Play/pause sync
  useEffect(() => {
    if (!isReady) return
    if (playing) {
      play()
    } else {
      pause()
    }
  }, [playing, isReady, play, pause])

  return (
    <div className="absolute inset-0 overflow-hidden bg-black pointer-events-none">
      <div id={CONTAINER_ID} className="w-full h-full" />
    </div>
  )
}
