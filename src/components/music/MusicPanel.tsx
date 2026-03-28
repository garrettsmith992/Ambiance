import { useState } from 'react'
import { useSceneStore } from '@/store/index'
import { Panel, Slider, IconButton } from '@/components/ui/index'
import type { MusicSource } from '@/types/index'

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

function sourceLabel(source: MusicSource): string {
  if (source.type === 'local') return `📁 ${source.folderName}`
  if (source.type === 'spotify') return `🎵 Spotify`
  if (source.playlistId) return `▶ YT Playlist`
  return `▶ YT Video`
}

export function MusicPanel({ localAudio, spotify }: MusicPanelProps) {
  const scene = useSceneStore((s) => s.activeScene())
  const setVolume = useSceneStore((s) => s.setMusicVolume)
  const toggleMute = useSceneStore((s) => s.toggleMusicMute)
  const toggleShuffle = useSceneStore((s) => s.toggleMusicShuffle)
  const addMusicSource = useSceneStore((s) => s.addMusicSource)
  const removeMusicSource = useSceneStore((s) => s.removeMusicSource)

  const [youtubeInput, setYoutubeInput] = useState('')
  const [spotifyInput, setSpotifyInput] = useState('')
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)
  const [showSpotifyInput, setShowSpotifyInput] = useState(false)

  if (!scene) return null
  const { music } = scene

  const handlePickFolder = async () => {
    await localAudio.pickFolder()
    addMusicSource({ type: 'local', folderName: 'Local Folder' })
  }

  const handleYoutubeSubmit = () => {
    const input = youtubeInput.trim()
    if (!input) return
    const playlistMatch = input.match(/[?&]list=([^&]+)/)
    const videoMatch = input.match(/(?:youtu\.be\/|v=)([^&?]+)/)

    if (playlistMatch) {
      addMusicSource({ type: 'youtube', playlistId: playlistMatch[1] })
    } else if (videoMatch) {
      addMusicSource({ type: 'youtube', videoId: videoMatch[1] })
    } else {
      addMusicSource({ type: 'youtube', videoId: input })
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
    let uri = input
    const urlMatch = input.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/)
    if (urlMatch) {
      uri = `spotify:${urlMatch[1]}:${urlMatch[2]}`
    }
    addMusicSource({ type: 'spotify', uri })
    spotify.playUri(uri)
    setShowSpotifyInput(false)
    setSpotifyInput('')
  }

  // Determine current track display
  const trackDisplay = (() => {
    const hasLocal = music.sources.some((s) => s.type === 'local')
    const hasSpotify = music.sources.some((s) => s.type === 'spotify')
    if (hasLocal && localAudio.currentTrack) return localAudio.currentTrack
    if (hasSpotify && spotify.currentTrack) return spotify.currentTrack
    return null
  })()

  return (
    <Panel
      title="Music"
      headerRight={
        <div className="flex items-center gap-1">
          <IconButton
            onClick={toggleShuffle}
            active={music.shuffle}
            title={music.shuffle ? 'Shuffle on' : 'Shuffle off'}
          >
            🔀
          </IconButton>
          <IconButton onClick={toggleMute} active={music.muted}>
            {music.muted ? '🔇' : '🔊'}
          </IconButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Source list */}
        {music.sources.length > 0 && (
          <div className="space-y-1">
            {music.sources.map((source, i) => (
              <div key={i} className="flex items-center justify-between py-1 text-sm">
                <span className="text-text-secondary truncate">{sourceLabel(source)}</span>
                <button
                  onClick={() => removeMusicSource(i)}
                  className="text-xs text-text-secondary hover:text-red-400 transition-colors px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Now playing */}
        {localAudio.hasFolder && (
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>{localAudio.currentIndex + 1}/{localAudio.files.length} files</span>
            <div className="flex gap-1">
              <IconButton onClick={localAudio.prev}>⏮</IconButton>
              <IconButton onClick={localAudio.next}>⏭</IconButton>
            </div>
          </div>
        )}

        {trackDisplay && (
          <p className="text-xs text-text-secondary truncate">♪ {trackDisplay}</p>
        )}

        {/* Add source buttons */}
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            onClick={handlePickFolder}
            className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors"
          >
            + Local Folder
          </button>
          <button
            onClick={handleSpotifyConnect}
            className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors"
          >
            {spotify.isAuthenticated ? '+ Spotify' : '+ Spotify (Connect)'}
          </button>
          <button
            onClick={() => setShowYoutubeInput(!showYoutubeInput)}
            className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors"
          >
            + YouTube
          </button>
        </div>

        {showSpotifyInput && spotify.isAuthenticated && (
          <div className="flex gap-2">
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
              Add
            </button>
          </div>
        )}

        {showYoutubeInput && (
          <div className="flex gap-2">
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
              Add
            </button>
          </div>
        )}

        <Slider label="Vol" value={music.volume} onChange={setVolume} />
      </div>
    </Panel>
  )
}
