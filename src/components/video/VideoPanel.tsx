import { useState } from 'react'
import { useSceneStore } from '@/store/index'
import { Panel, Slider, IconButton } from '@/components/ui/index'
import type { VideoSource } from '@/types/index'

interface LocalVideoState {
  files: { name: string }[]
  currentIndex: number
  hasFolder: boolean
  pickFolder: () => Promise<void>
  next: () => void
  prev: () => void
}

interface VideoPanelProps {
  localVideo: LocalVideoState
}

function sourceLabel(source: VideoSource): string {
  if (source.type === 'local') return `📁 ${source.folderName}`
  if (source.playlistId) return `▶ YT Playlist`
  return `▶ YT Video`
}

export function VideoPanel({ localVideo }: VideoPanelProps) {
  const scene = useSceneStore((s) => s.activeScene())
  const setVolume = useSceneStore((s) => s.setVideoVolume)
  const toggleMute = useSceneStore((s) => s.toggleVideoMute)
  const toggleShuffle = useSceneStore((s) => s.toggleVideoShuffle)
  const addVideoSource = useSceneStore((s) => s.addVideoSource)
  const removeVideoSource = useSceneStore((s) => s.removeVideoSource)
  const toggleContainsMusic = useSceneStore((s) => s.toggleVideoContainsMusic)

  const [youtubeInput, setYoutubeInput] = useState('')
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)

  if (!scene) return null
  const { video } = scene

  const handlePickFolder = async () => {
    await localVideo.pickFolder()
    addVideoSource({ type: 'local', folderName: 'Local Folder' })
  }

  const handleYoutubeSubmit = () => {
    const input = youtubeInput.trim()
    if (!input) return

    const playlistMatch = input.match(/[?&]list=([^&]+)/)
    const videoMatch = input.match(/(?:youtu\.be\/|v=)([^&?]+)/)

    if (playlistMatch) {
      addVideoSource({ type: 'youtube', playlistId: playlistMatch[1] })
    } else if (videoMatch) {
      addVideoSource({ type: 'youtube', videoId: videoMatch[1] })
    } else {
      addVideoSource({ type: 'youtube', videoId: input })
    }
    setShowYoutubeInput(false)
    setYoutubeInput('')
  }

  return (
    <Panel
      title="Video"
      headerRight={
        <div className="flex items-center gap-1">
          <IconButton
            onClick={toggleShuffle}
            active={video.shuffle}
            title={video.shuffle ? 'Shuffle on' : 'Shuffle off'}
          >
            🔀
          </IconButton>
          <IconButton onClick={toggleMute} active={video.muted}>
            {video.muted ? '🔇' : '🔊'}
          </IconButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Source list */}
        {video.sources.length > 0 && (
          <div className="space-y-1">
            {video.sources.map((source, i) => (
              <div key={i} className="flex items-center justify-between py-1 text-sm">
                <span className="text-text-secondary truncate">{sourceLabel(source)}</span>
                <button
                  onClick={() => removeVideoSource(i)}
                  className="text-xs text-text-secondary hover:text-red-400 transition-colors px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Now playing (local) */}
        {localVideo.hasFolder && (
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>{localVideo.currentIndex + 1}/{localVideo.files.length} files</span>
            <div className="flex gap-1">
              <IconButton onClick={localVideo.prev}>⏮</IconButton>
              <IconButton onClick={localVideo.next}>⏭</IconButton>
            </div>
          </div>
        )}

        {/* Add source buttons */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={handlePickFolder}
            className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors"
          >
            + Local Folder
          </button>
          <button
            onClick={() => setShowYoutubeInput(!showYoutubeInput)}
            className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors"
          >
            + YouTube
          </button>
        </div>

        {showYoutubeInput && (
          <div className="flex gap-2">
            <input
              type="text"
              value={youtubeInput}
              onChange={(e) => setYoutubeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleYoutubeSubmit()}
              placeholder="YouTube URL or video/playlist ID"
              className="flex-1 px-3 py-1.5 text-sm bg-surface border border-border rounded-md focus:border-accent outline-none text-text-primary placeholder:text-text-secondary"
              autoFocus
            />
            <button
              onClick={handleYoutubeSubmit}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded-md hover:bg-accent-hover transition-colors"
            >
              Add
            </button>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={video.containsMusic}
            onChange={toggleContainsMusic}
            className="accent-accent"
          />
          Video contains its own music
        </label>

        <Slider label="Vol" value={video.volume} onChange={setVolume} />
      </div>
    </Panel>
  )
}
