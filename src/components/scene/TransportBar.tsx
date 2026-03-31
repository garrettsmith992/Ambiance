import { useSceneStore } from '@/store/index'
import { IconButton } from '@/components/ui/index'

interface TransportBarProps {
  onFullscreen: () => void
  isFullscreen: boolean
  showSettings: boolean
  onToggleSettings: () => void
}

export function TransportBar({ onFullscreen, isFullscreen, showSettings, onToggleSettings }: TransportBarProps) {
  const scene = useSceneStore((s) => s.activeScene())
  const playing = useSceneStore((s) => s.playing)
  const togglePlayback = useSceneStore((s) => s.togglePlayback)
  const nextVideoSource = useSceneStore((s) => s.nextVideoSource)
  const nextMusicSource = useSceneStore((s) => s.nextMusicSource)

  const hasMultipleVideoSources = (scene?.video.sources.length ?? 0) > 1
  const hasMultipleMusicSources = (scene?.music.sources.length ?? 0) > 1

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-surface-raised border-t border-border">
      {scene && (
        <button
          onClick={togglePlayback}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-accent hover:bg-accent-hover transition-colors text-white text-lg"
        >
          {playing ? '⏸' : '▶'}
        </button>
      )}

      {/* Skip buttons */}
      {hasMultipleVideoSources && (
        <IconButton onClick={nextVideoSource} title="Next video source">
          ⏭
        </IconButton>
      )}
      {hasMultipleMusicSources && (
        <IconButton onClick={nextMusicSource} title="Next music source">
          ⏭♪
        </IconButton>
      )}

      <div className="flex-1 min-w-0">
        {scene ? (
          <>
            <p className="text-sm font-medium truncate">{scene.name}</p>
            <p className="text-xs text-text-secondary">
              {scene.video.sources.length > 0 && `${scene.video.sources.length} video`}
              {scene.video.sources.length > 0 && scene.music.sources.length > 0 && ' · '}
              {scene.music.sources.length > 0 && `${scene.music.sources.length} music`}
              {(scene.video.sources.length > 0 || scene.music.sources.length > 0) && scene.sfx.slots.length > 0 && ' · '}
              {scene.sfx.slots.length > 0 && `${scene.sfx.slots.length} SFX`}
              {scene.tags.length > 0 && ` · ${scene.tags.join(', ')}`}
            </p>
          </>
        ) : (
          <p className="text-sm text-text-secondary">No scene selected</p>
        )}
      </div>

      <IconButton
        onClick={onToggleSettings}
        active={showSettings}
        title={showSettings ? 'Back to scene' : 'Settings'}
      >
        {showSettings ? '✕' : '⚙'}
      </IconButton>
      <IconButton onClick={onFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
        {isFullscreen ? '⛶' : '⛶'}
      </IconButton>
    </div>
  )
}
