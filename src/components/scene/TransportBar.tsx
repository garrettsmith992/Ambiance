import { useSceneStore } from '@/store/index'
import { IconButton } from '@/components/ui/index'

interface TransportBarProps {
  onFullscreen: () => void
  isFullscreen: boolean
}

export function TransportBar({ onFullscreen, isFullscreen }: TransportBarProps) {
  const scene = useSceneStore((s) => s.activeScene())
  const playing = useSceneStore((s) => s.playing)
  const togglePlayback = useSceneStore((s) => s.togglePlayback)

  if (!scene) return null

  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-surface-raised border-t border-border">
      <button
        onClick={togglePlayback}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-accent hover:bg-accent-hover transition-colors text-white text-lg"
      >
        {playing ? '⏸' : '▶'}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{scene.name}</p>
        <p className="text-xs text-text-secondary">
          {scene.sfx.slots.length} SFX slot{scene.sfx.slots.length !== 1 ? 's' : ''}
          {scene.tags.length > 0 && ` · ${scene.tags.join(', ')}`}
        </p>
      </div>
      <IconButton onClick={onFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
        {isFullscreen ? '⛶' : '⛶'}
      </IconButton>
    </div>
  )
}
