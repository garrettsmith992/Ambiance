import { useState } from 'react'
import { useSceneStore } from '@/store/index'
import { Panel, Slider, IconButton } from '@/components/ui/index'

interface LocalAudioState {
  files: { name: string }[]
  currentIndex: number
  currentTrack: string | null
  hasFolder: boolean
  pickFolder: () => Promise<void>
  next: () => void
  prev: () => void
  play: () => void
  pause: () => void
  isPlaying: boolean
}

interface SpotifyState {
  isReady: boolean
  isAuthenticated: boolean
  currentTrack: string | null
  authenticate: () => void
  playUri: (uri: string) => void
  play: () => void
  pause: () => void
}

interface MusicPanelProps {
  localAudio: LocalAudioState
  spotify: SpotifyState
}

export function MusicPanel({ localAudio, spotify }: MusicPanelProps) {
  const scene = useSceneStore((s) => s.activeScene())
  const setVolume = useSceneStore((s) => s.setMusicVolume)
  const toggleMute = useSceneStore((s) => s.toggleMusicMute)
  const setMusicSource = useSceneStore((s) => s.setMusicSource)

  const [youtubeInput, setYoutubeInput] = useState('')
  const [spotifyInput, setSpotifyInput] = useState('')
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)
  const [showSpotifyInput, setShowSpotifyInput] = useState(false)

  if (!scene) return null
  const { music } = scene

  const handlePickFolder = async () => {
    await localAudio.pickFolder()
    setMusicSource({
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
      setMusicSource({ source: 'youtube', playlistId: playlistMatch[1] })
    } else if (videoMatch) {
      setMusicSource({ source: 'youtube', videoId: videoMatch[1] })
    } else {
      setMusicSource({ source: 'youtube', videoId: input })
    }
    setShowYoutubeInput(false)
    setYoutubeInput('')
  }

  const handleSpotifyConnect = () => {
    if (!spotify.isAuthenticated) {
      spotify.authenticate()
      return
    }
    setShowSpotifyInput(true)
  }

  const handleSpotifySubmit = () => {
    const input = spotifyInput.trim()
    if (!input) return
    // Accept spotify URIs or URLs
    let uri = input
    const urlMatch = input.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/)
    if (urlMatch) {
      uri = `spotify:${urlMatch[1]}:${urlMatch[2]}`
    }
    setMusicSource({ source: 'spotify', uri })
    spotify.playUri(uri)
    setShowSpotifyInput(false)
    setSpotifyInput('')
  }

  const handleClearSource = () => {
    setMusicSource(null)
  }

  // Determine current track display
  const trackDisplay = (() => {
    if (!music.source) return null
    if (music.source.source === 'local') return localAudio.currentTrack
    if (music.source.source === 'spotify') return spotify.currentTrack
    return null
  })()

  return (
    <Panel
      title="Music"
      headerRight={
        <div className="flex items-center gap-1">
          {music.source && (
            <IconButton onClick={handleClearSource} title="Remove source">✕</IconButton>
          )}
          <IconButton onClick={toggleMute} active={music.muted}>
            {music.muted ? '🔇' : '🔊'}
          </IconButton>
        </div>
      }
    >
      <div className="space-y-4">
        {!music.source ? (
          <div className="text-center py-6">
            <p className="text-text-secondary text-sm mb-3">No music source selected</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handlePickFolder}
                className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors"
              >
                Local Folder
              </button>
              <button
                onClick={handleSpotifyConnect}
                className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors"
              >
                {spotify.isAuthenticated ? 'Spotify' : 'Spotify (Connect)'}
              </button>
              <button
                onClick={() => setShowYoutubeInput(true)}
                className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors"
              >
                YouTube
              </button>
            </div>

            {showSpotifyInput && spotify.isAuthenticated && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={spotifyInput}
                  onChange={(e) => setSpotifyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSpotifySubmit()}
                  placeholder="Spotify URI or URL"
                  className="flex-1 px-3 py-1.5 text-sm bg-surface border border-border rounded-md focus:border-accent outline-none text-text-primary placeholder:text-text-secondary"
                  autoFocus
                />
                <button
                  onClick={handleSpotifySubmit}
                  className="px-3 py-1.5 text-sm bg-accent text-white rounded-md hover:bg-accent-hover transition-colors"
                >
                  Play
                </button>
              </div>
            )}

            {showYoutubeInput && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleYoutubeSubmit()}
                  placeholder="YouTube URL or playlist ID"
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
              <div className="text-sm text-text-secondary min-w-0 flex-1">
                {music.source.source === 'local' && (
                  <span>📁 Local · {localAudio.files.length} files</span>
                )}
                {music.source.source === 'spotify' && (
                  <span>🎵 Spotify{spotify.isReady ? '' : ' (connecting...)'}</span>
                )}
                {music.source.source === 'youtube' && (
                  <span>▶ YouTube · {music.source.playlistId ? 'Playlist' : 'Video'}</span>
                )}
              </div>
              {music.source.source === 'local' && localAudio.hasFolder && (
                <div className="flex gap-1">
                  <IconButton onClick={localAudio.prev}>⏮</IconButton>
                  <IconButton onClick={localAudio.next}>⏭</IconButton>
                </div>
              )}
            </div>

            {trackDisplay && (
              <p className="text-xs text-text-secondary truncate">
                ♪ {trackDisplay}
              </p>
            )}
          </div>
        )}
        <Slider label="Vol" value={music.volume} onChange={setVolume} />
      </div>
    </Panel>
  )
}
