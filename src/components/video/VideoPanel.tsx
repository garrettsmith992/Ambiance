import { useSceneStore } from '@/store/index'
import { Panel, Slider, IconButton } from '@/components/ui/index'

export function VideoPanel() {
  const scene = useSceneStore((s) => s.activeScene())
  const setVolume = useSceneStore((s) => s.setVideoVolume)
  const toggleMute = useSceneStore((s) => s.toggleVideoMute)

  if (!scene) return null

  const { video } = scene

  return (
    <Panel
      title="Video"
      headerRight={
        <IconButton onClick={toggleMute} active={video.muted}>
          {video.muted ? '🔇' : '🔊'}
        </IconButton>
      }
    >
      <div className="space-y-4">
        {!video.source ? (
          <div className="text-center py-6">
            <p className="text-text-secondary text-sm mb-3">No video source selected</p>
            <div className="flex gap-2 justify-center">
              <button className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors">
                Local Folder
              </button>
              <button className="px-3 py-1.5 text-sm bg-surface-overlay border border-border rounded-md hover:border-accent transition-colors">
                YouTube
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-text-secondary">
            Source: {video.source.source}
          </div>
        )}
        <Slider label="Vol" value={video.volume} onChange={setVolume} />
      </div>
    </Panel>
  )
}
