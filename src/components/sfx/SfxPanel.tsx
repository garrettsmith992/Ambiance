import { useSceneStore } from '@/store/index'
import { Panel, Slider, IconButton } from '@/components/ui/index'
import type { SfxSlot, SfxMode } from '@/types/index'
import type { useSfx } from '@/hooks/use-sfx'

type SfxHook = ReturnType<typeof useSfx>

// ─── Per-slot row ──────────────────────────────────────────────

function SfxSlotRow({ slot, sfx }: { slot: SfxSlot; sfx: SfxHook }) {
  const updateSlot = useSceneStore((s) => s.updateSfxSlot)
  const removeSlot = useSceneStore((s) => s.removeSfxSlot)
  const isLoaded = sfx.isSlotLoaded(slot.id)

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
      {/* Reload prompt when file not loaded */}
      {!isLoaded && (
        <button
          onClick={() => sfx.reloadSlotFile(slot.id)}
          className="w-full py-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded hover:bg-amber-400/20 transition-colors"
        >
          File not loaded — click to re-select "{slot.file}"
        </button>
      )}
      {/* Top row: name, variant count, mode badge, mute, remove */}
      <div className="flex items-center gap-2">
        <span className={`text-sm truncate flex-1 min-w-0 ${!isLoaded ? 'text-text-secondary opacity-50' : ''}`}>
          {slot.name}
          {slot.files && slot.files.length > 0 && (
            <span className="text-xs text-text-secondary ml-1">({slot.files.length + 1} variants)</span>
          )}
        </span>
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
            <span className="text-xs text-text-secondary w-16 shrink-0">Delay min</span>
            <input
              type="range"
              min={0}
              max={3600}
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
            <span className="text-xs text-text-secondary w-16 shrink-0">Delay max</span>
            <input
              type="range"
              min={0}
              max={3600}
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
  const handleAddFile = async () => {
    const result = await sfx.pickFile()
    if (!result) return

    const slotData = {
      name: result.name.replace(/\.[^.]+$/, ''),
      file: result.name,
      mode: 'interval' as const,
      volume: 0.5,
      muted: false,
      minMs: 60_000,
      maxMs: 300_000,
      tags: [],
    }
    addSlot(slotData)

    const updated = useSceneStore.getState().activeScene()
    if (!updated) return
    const newSlot = updated.sfx.slots[updated.sfx.slots.length - 1]
    if (newSlot) {
      await sfx.loadSlotFile(newSlot.id, result.fileHandle)
    }
  }

  const handleAddFolder = async () => {
    const result = await sfx.pickFolder()
    if (!result) return

    const slotData = {
      name: result.name,
      file: result.files[0].name,
      files: result.files.map((f) => f.name),
      mode: 'interval' as const,
      volume: 0.5,
      muted: false,
      minMs: 60_000,
      maxMs: 300_000,
      tags: [],
    }
    addSlot(slotData)

    const updated = useSceneStore.getState().activeScene()
    if (!updated) return
    const newSlot = updated.sfx.slots[updated.sfx.slots.length - 1]
    if (newSlot) {
      await sfx.loadSlotFolder(newSlot.id, result.files.map((f) => f.handle))
    }
  }

  return (
    <Panel
      title={`Sound Effects${slots.length > 0 ? ` (${slots.length})` : ''}`}
      headerRight={
        <div className="flex gap-1">
          <button
            onClick={handleAddFile}
            className="text-xs px-2 py-1 bg-surface-overlay border border-border rounded hover:border-accent transition-colors"
          >
            + File
          </button>
          <button
            onClick={handleAddFolder}
            className="text-xs px-2 py-1 bg-surface-overlay border border-border rounded hover:border-accent transition-colors"
            title="Pick a folder of audio variants (randomly chosen each play)"
          >
            + Folder
          </button>
        </div>
      }
    >
      {slots.length === 0 ? (
        <p className="text-text-secondary text-sm text-center py-6">
          No SFX slots. Add sound files to create ambient layers.
        </p>
      ) : (
        <div>
          {slots.map((slot) => (
            <SfxSlotRow key={slot.id} slot={slot} sfx={sfx} />
          ))}
        </div>
      )}
    </Panel>
  )
}
