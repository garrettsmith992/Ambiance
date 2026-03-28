import { useSceneStore } from '@/store/index'
import { Panel, Slider, IconButton } from '@/components/ui/index'
import type { SfxSlot, SfxMode } from '@/types/index'
import type { useSfx } from '@/hooks/use-sfx'

type SfxHook = ReturnType<typeof useSfx>

// ─── Per-slot row ──────────────────────────────────────────────

function SfxSlotRow({ slot }: { slot: SfxSlot }) {
  const updateSlot = useSceneStore((s) => s.updateSfxSlot)
  const removeSlot = useSceneStore((s) => s.removeSfxSlot)

  const toggleMode = () => {
    const next: SfxMode = slot.mode === 'loop' ? 'interval' : 'loop'
    updateSlot(slot.id, {
      mode: next,
      // Give sensible defaults when switching to interval
      ...(next === 'interval' && slot.minMs === 0 && slot.maxMs === 0
        ? { minMs: 120_000, maxMs: 360_000 }
        : {}),
    })
  }

  return (
    <div className="py-3 border-b border-border last:border-0 space-y-2">
      {/* Top row: name, mode badge, mute, remove */}
      <div className="flex items-center gap-2">
        <span className="text-sm truncate flex-1 min-w-0">{slot.name}</span>
        <button
          onClick={toggleMode}
          className="text-xs px-1.5 py-0.5 rounded bg-surface-overlay text-text-secondary hover:text-text-primary hover:border-accent border border-border transition-colors"
        >
          {slot.mode}
        </button>
        <IconButton
          onClick={() => updateSlot(slot.id, { muted: !slot.muted })}
          active={slot.muted}
        >
          {slot.muted ? '🔇' : '🔊'}
        </IconButton>
        <IconButton onClick={() => removeSlot(slot.id)}>✕</IconButton>
      </div>

      {/* Volume */}
      <Slider
        value={slot.volume}
        onChange={(v) => updateSlot(slot.id, { volume: v })}
        label="Vol"
      />

      {/* Interval controls (only in interval mode) */}
      {slot.mode === 'interval' && (
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary w-16 shrink-0">Min</span>
            <input
              type="range"
              min={5}
              max={600}
              step={5}
              value={Math.round(slot.minMs / 1000)}
              onChange={(e) => {
                const sec = parseInt(e.target.value)
                updateSlot(slot.id, {
                  minMs: sec * 1000,
                  // Keep max >= min
                  ...(sec * 1000 > slot.maxMs ? { maxMs: sec * 1000 } : {}),
                })
              }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-border accent-accent"
            />
            <span className="text-xs text-text-secondary w-14 text-right tabular-nums">
              {formatSeconds(slot.minMs / 1000)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary w-16 shrink-0">Max</span>
            <input
              type="range"
              min={5}
              max={600}
              step={5}
              value={Math.round(slot.maxMs / 1000)}
              onChange={(e) => {
                const sec = parseInt(e.target.value)
                updateSlot(slot.id, {
                  maxMs: sec * 1000,
                  // Keep min <= max
                  ...(sec * 1000 < slot.minMs ? { minMs: sec * 1000 } : {}),
                })
              }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-border accent-accent"
            />
            <span className="text-xs text-text-secondary w-14 text-right tabular-nums">
              {formatSeconds(slot.maxMs / 1000)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function formatSeconds(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = Math.round(totalSec % 60)
  return m > 0 ? `${m}m${s > 0 ? ` ${s}s` : ''}` : `${s}s`
}

// ─── Panel ─────────────────────────────────────────────────────

export function SfxPanel({ sfx }: { sfx: SfxHook }) {
  const scene = useSceneStore((s) => s.activeScene())
  const addSlot = useSceneStore((s) => s.addSfxSlot)

  if (!scene) return null

  const { slots } = scene.sfx
  const canAdd = slots.length < 8

  const handleAdd = async () => {
    const result = await sfx.pickFile()
    if (!result) return

    // Build slot data (without id — store generates it)
    const slotData = {
      name: result.name.replace(/\.[^.]+$/, ''),
      file: result.name,
      mode: 'loop' as const,
      volume: 0.5,
      muted: false,
      minMs: 0,
      maxMs: 0,
      tags: [],
    }
    addSlot(slotData)

    // We need the id that the store assigned. Read it back from the updated scene.
    // The new slot is always appended last.
    const updated = useSceneStore.getState().activeScene()
    if (!updated) return
    const newSlot = updated.sfx.slots[updated.sfx.slots.length - 1]
    if (newSlot) {
      await sfx.loadSlotFile(newSlot.id, result.fileHandle)
    }
  }

  return (
    <Panel
      title={`SFX (${slots.length}/8)`}
      headerRight={
        canAdd ? (
          <button
            onClick={handleAdd}
            className="text-xs px-2 py-1 bg-surface-overlay border border-border rounded hover:border-accent transition-colors"
          >
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
