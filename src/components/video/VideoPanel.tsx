import { useState } from 'react'
import { useSceneStore } from '@/store/index'
import { Panel, Slider, IconButton } from '@/components/ui/index'

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

export function VideoPanel({ localVideo }: VideoPanelProps) {
  const scene = useSceneStore((s) => s.activeScene())
  const setVolume = useSceneStore((s) => s.setVideoVolume)
  const toggleMute = useSceneStore((s) => s.toggleVideoMute)
  const setVideoSource = useSceneStore((s) => s.setVideoSource)
  const toggleContainsMusic = useSceneStore((s) => s.toggleVideoContainsMusic)

  const [youtubeInput, setYoutubeInput] = useState('')
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)

  if (!scene) return null
  const { video } = scene

  const handlePickFolder = async () => {
    await localVideo.pickFolder()
    setVideoSource({
      source: 'local',
      folderName: 'Local Folder',
      shuffle: true,
      loop: true,
    })
  }

  const handleYoutubeSubmit = () => {
    const input = youtubeInput.trim()
    if (!input) return

    const playlistMatch = input.match(/[?&]list=([^&]+)/)
    const videoMatch = input.match(/(?:youtu\.be\/|v=)([^&?]+)/)

    if (playlistMatch) {
      setVideoSource({ source: 'youtube', playlistId: playlistMatch[1] })
    } else if (videoMatch) {
      setVideoSource({ source: 'youtube', videoId: videoMatch[1] })
    } else {
      setVideoSource({ source: 'youtube', videoId: input })
    }
    setShowYoutubeInput(false)
    setYoutubeInput('')
  }

  const handleClearSource = () => {
    setVideoSource(null)
  }

  return (
    <Panel
      title="Video"
      headerRight={
        <div className="flex items-center gap-1">
          {video.source && (
            <IconButton onClick={handleClearSource} title="Remove source">✕</IconButton>
          )}
          <IconButton onClick={toggleMute} active={video.muted}>
            {video.muted ? '🔇' : '🔊'}
          </IconButton>
        </div>
      }
    >
      <div className="space-y-4">
        {!video.source ? (
          <div className="text-center py-6">
            <p className="text-text-secondary text-sm mb-3">No video source selected</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handlePickFolder}
                className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors"
              >
                Local Folder
              </button>
              <button
                onClick={() => setShowYoutubeInput(true)}
                className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors"
              >
                YouTube
              </button>
            </div>
            {showYoutubeInput && (
              <div className="mt-3 flex gap-2">
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
                  Load
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-text-secondary">
                {video.source.source === 'local' ? (
                  <span>
                    📁 Local · {localVideo.files.length} files
                    {localVideo.hasFolder && ` · ${localVideo.currentIndex + 1}/${localVideo.files.length}`}
                  </span>
                ) : (
                  <span>
                    ▶ YouTube · {video.source.playlistId ? 'Playlist' : 'Video'}
                  </span>
                )}
              </div>
              {video.source.source === 'local' && localVideo.hasFolder && (
                <div className="flex gap-1">
                  <IconButton onClick={localVideo.prev}>⏮</IconButton>
                  <IconButton onClick={localVideo.next}>⏭</IconButton>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={video.containsMusic}
                onChange={toggleContainsMusic}
                className="accent-accent"
              />
              Video contains its own music
            </label>
          </div>
        )}
        <Slider label="Vol" value={video.volume} onChange={setVolume} />
      </div>
    </Panel>
  )
}
