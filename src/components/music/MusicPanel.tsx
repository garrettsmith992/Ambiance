import { useSceneStore } from '@/store/index'
import { Panel, Slider, IconButton } from '@/components/ui/index'

export function MusicPanel() {
  const scene = useSceneStore((s) => s.activeScene())
  const setVolume = useSceneStore((s) => s.setMusicVolume)
  const toggleMute = useSceneStore((s) => s.toggleMusicMute)

  if (!scene) return null

  const { music } = scene

  return (
    <Panel
      title="Music"
      headerRight={
        <IconButton onClick={toggleMute} active={music.muted}>
          {music.muted ? '🔇' : '🔊'}
        </IconButton>
      }
    >
      <div className="space-y-4">
        {!music.source ? (
          <div className="text-center py-6">
            <p className="text-text-secondary text-sm mb-3">No music source selected</p>
            <div className="flex gap-2 justify-center">
              <button className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors">
                Local Folder
              </button>
              <button className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors">
                Spotify
              </button>
              <button className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors">
                YouTube
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-text-secondary">
            Source: {music.source.source}
          </div>
        )}
        <Slider label="Vol" value={music.volume} onChange={setVolume} />
      </div>
    </Panel>
  )
}
