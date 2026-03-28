import { useEffect } from 'react'
import { useSceneStore } from '@/store/index'
import { useYouTubePlayer } from '@/hooks/use-youtube-player'
import type { MusicSourceYouTube } from '@/types/index'

const CONTAINER_ID = 'yt-music-player'

interface YouTubeMusicPlayerProps {
  source: MusicSourceYouTube
}

export function YouTubeMusicPlayer({ source }: YouTubeMusicPlayerProps) {
  const volume = useSceneStore((s) => s.activeScene()?.music.volume ?? 0.5)
  const muted = useSceneStore((s) => s.activeScene()?.music.muted ?? false)
  const playing = useSceneStore((s) => s.playing)

  const { loadVideo, loadPlaylist, play, pause, isReady } = useYouTubePlayer({
    containerId: CONTAINER_ID,
    volume,
    muted,
  })

  useEffect(() => {
    if (!isReady) return
    if (source.playlistId) {
      loadPlaylist(source.playlistId)
    } else if (source.videoId) {
      loadVideo(source.videoId)
    }
  }, [isReady, source.playlistId, source.videoId, loadVideo, loadPlaylist])

  useEffect(() => {
    if (!isReady) return
    if (playing) play()
    else pause()
  }, [playing, isReady, play, pause])

  return (
    <div className="hidden">
      <div id={CONTAINER_ID} />
    </div>
  )
}
