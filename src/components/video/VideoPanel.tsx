import { useState } from 'react'
import { useSceneStore } from '@/store/index'
import { Panel, Slider, IconButton } from '@/components/ui/index'
import type { VideoSource } from '@/types/index'

interface LocalVideoState {
  files: { name: string }[]
  currentIndex: number
  hasFolder: boolean
  pickFolder: () => Promise<boolean>
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
  const moveVideoSource = useSceneStore((s) => s.moveVideoSource)
  const toggleSourceContainsMusic = useSceneStore((s) => s.toggleVideoSourceContainsMusic)
  const videoSourceIndex = useSceneStore((s) => s.videoSourceIndex)

  const [youtubeInput, setYoutubeInput] = useState('')
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)

  if (!scene) return null
  const { video } = scene

  const handlePickFolder = async () => {
    const picked = await localVideo.pickFolder()
    if (picked) {
      addVideoSource({ type: 'local', folderName: 'Local Folder' })
    }
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
      title={`Video${video.sources.length > 0 ? ` (${video.sources.length})` : ''}`}
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
              <div
                key={i}
                className={`flex items-center justify-between py-1 text-sm rounded px-1 ${
                  i === videoSourceIndex ? 'bg-surface-overlay' : ''
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <span className={`truncate ${i === videoSourceIndex ? 'text-accent' : 'text-text-secondary'}`}>
                    {sourceLabel(source)}
                  </span>
                  <label className="flex items-center gap-1 text-xs text-text-secondary shrink-0 cursor-pointer" title="Has its own music">
                    <input
                      type="checkbox"
                      checked={source.containsMusic ?? false}
                      onChange={() => toggleSourceContainsMusic(i)}
                      className="accent-accent"
                    />
                    ♪
                  </label>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => moveVideoSource(i, 'up')}
                    disabled={i === 0}
                    className="text-xs text-text-secondary hover:text-text-primary disabled:opacity-25 transition-colors px-0.5"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveVideoSource(i, 'down')}
                    disabled={i === video.sources.length - 1}
                    className="text-xs text-text-secondary hover:text-text-primary disabled:opacity-25 transition-colors px-0.5"
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => removeVideoSource(i)}
                    className="text-xs text-text-secondary hover:text-red-400 transition-colors px-1"
                  >
                    ✕
                  </button>
                </div>
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

        <Slider label="Vol" value={video.volume} onChange={setVolume} />
      </div>
    </Panel>
  )
}
