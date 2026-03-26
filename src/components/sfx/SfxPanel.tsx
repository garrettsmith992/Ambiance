import { useSceneStore } from '@/store/index'
import { Panel, Slider, IconButton } from '@/components/ui/index'
import type { SfxSlot } from '@/types/index'

function SfxSlotRow({ slot }: { slot: SfxSlot }) {
  const updateSlot = useSceneStore((s) => s.updateSfxSlot)
  const removeSlot = useSceneStore((s) => s.removeSfxSlot)

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm truncate">{slot.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-surface-overlay text-text-secondary">
            {slot.mode}
          </span>
        </div>
        {slot.mode === 'interval' && (
          <span className="text-xs text-text-secondary">
            {Math.round(slot.minMs / 60000)}–{Math.round(slot.maxMs / 60000)} min
          </span>
        )}
      </div>
      <Slider
        value={slot.volume}
        onChange={(v) => updateSlot(slot.id, { volume: v })}
        className="w-28"
      />
      <IconButton
        onClick={() => updateSlot(slot.id, { muted: !slot.muted })}
        active={slot.muted}
      >
        {slot.muted ? '🔇' : '🔊'}
      </IconButton>
      <IconButton onClick={() => removeSlot(slot.id)}>✕</IconButton>
    </div>
  )
}

export function SfxPanel() {
  const scene = useSceneStore((s) => s.activeScene())

  if (!scene) return null

  const { slots } = scene.sfx
  const canAdd = slots.length < 8

  return (
    <Panel
      title={`SFX (${slots.length}/8)`}
      headerRight={
        canAdd ? (
          <button className="text-xs px-2 py-1 bg-surface-overlay border border-border rounded hover:border-accent transition-colors">
            + Add
          </button>
        ) : null
      }
    >
      {slots.length === 0 ? (
        <p className="text-text-secondary text-sm text-center py-6">
          No SFX slots. Add sound files to create ambient layers.
        </p>
      ) : (
        <div>
          {slots.map((slot) => (
            <SfxSlotRow key={slot.id} slot={slot} />
          ))}
        </div>
      )}
    </Panel>
  )
}
