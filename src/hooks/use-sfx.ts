import { useRef, useEffect, useCallback } from 'react'
import type { SfxSlot } from '@/types/index'

const AUDIO_ACCEPT = {
  'audio/*': ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.opus', '.wma'],
}

interface SlotRuntime {
  audio: HTMLAudioElement
  blobUrl: string | null
  fileHandle: FileSystemFileHandle | null
  timeoutId: ReturnType<typeof setTimeout> | null
}

function randomInRange(minMs: number, maxMs: number): number {
  return minMs + Math.random() * (maxMs - minMs)
}

/**
 * Manages audio playback for all SFX slots.
 * Each slot gets its own HTMLAudioElement. Loop-mode slots use the native
 * `loop` attribute. Interval-mode slots use self-rescheduling setTimeout.
 */
export function useSfx(slots: SfxSlot[], playing: boolean) {
  // Map slotId → runtime state. Persists across renders.
  const runtimeRef = useRef<Map<string, SlotRuntime>>(new Map())

  // --- helpers -------------------------------------------------------

  const getRuntime = useCallback((slotId: string): SlotRuntime => {
    let rt = runtimeRef.current.get(slotId)
    if (!rt) {
      rt = { audio: new Audio(), blobUrl: null, fileHandle: null, timeoutId: null }
      runtimeRef.current.set(slotId, rt)
    }
    return rt
  }, [])

  const clearSchedule = useCallback((rt: SlotRuntime) => {
    if (rt.timeoutId !== null) {
      clearTimeout(rt.timeoutId)
      rt.timeoutId = null
    }
  }, [])

  const scheduleInterval = useCallback((slot: SfxSlot, rt: SlotRuntime) => {
    clearSchedule(rt)
    const delay = randomInRange(slot.minMs, slot.maxMs)
    rt.timeoutId = setTimeout(() => {
      rt.audio.currentTime = 0
      rt.audio.play().catch(() => {})
      // After the clip finishes, schedule the next play
      const onEnded = () => {
        rt.audio.removeEventListener('ended', onEnded)
        scheduleInterval(slot, rt)
      }
      rt.audio.addEventListener('ended', onEnded)
    }, delay)
  }, [clearSchedule])

  // --- pick a file for a new slot ------------------------------------

  const pickFile = useCallback(async (): Promise<{
    name: string
    fileHandle: FileSystemFileHandle
  } | null> => {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'Audio files', accept: AUDIO_ACCEPT }],
      })
      return { name: handle.name, fileHandle: handle }
    } catch {
      return null // user cancelled
    }
  }, [])

  // --- load a file handle into a slot's audio element ----------------

  const loadSlotFile = useCallback(async (slotId: string, handle: FileSystemFileHandle) => {
    const rt = getRuntime(slotId)
    // Revoke old blob URL
    if (rt.blobUrl) URL.revokeObjectURL(rt.blobUrl)
    const file = await handle.getFile()
    const url = URL.createObjectURL(file)
    rt.blobUrl = url
    rt.fileHandle = handle
    rt.audio.src = url
  }, [getRuntime])

  // --- sync slot settings to audio elements --------------------------

  useEffect(() => {
    const activeIds = new Set(slots.map((s) => s.id))

    // Clean up runtimes for removed slots
    for (const [id, rt] of runtimeRef.current) {
      if (!activeIds.has(id)) {
        clearSchedule(rt)
        rt.audio.pause()
        rt.audio.src = ''
        if (rt.blobUrl) URL.revokeObjectURL(rt.blobUrl)
        runtimeRef.current.delete(id)
      }
    }

    // Update each active slot
    for (const slot of slots) {
      const rt = getRuntime(slot.id)

      // Volume & mute
      rt.audio.volume = slot.muted ? 0 : slot.volume

      if (!playing || slot.muted) {
        // Stop everything
        clearSchedule(rt)
        if (slot.mode === 'loop') {
          rt.audio.pause()
        } else {
          rt.audio.pause()
        }
        continue
      }

      // Playing & not muted
      if (!rt.audio.src || rt.audio.src === '') continue // no file loaded yet

      if (slot.mode === 'loop') {
        clearSchedule(rt)
        rt.audio.loop = true
        if (rt.audio.paused) rt.audio.play().catch(() => {})
      } else {
        // Interval mode
        rt.audio.loop = false
        // Only schedule if not already scheduled
        if (rt.timeoutId === null && rt.audio.paused) {
          // Play once immediately, then schedule
          rt.audio.currentTime = 0
          rt.audio.play().catch(() => {})
          const onEnded = () => {
            rt.audio.removeEventListener('ended', onEnded)
            scheduleInterval(slot, rt)
          }
          rt.audio.addEventListener('ended', onEnded)
        }
      }
    }
  }, [slots, playing, getRuntime, clearSchedule, scheduleInterval])

  // --- cleanup on unmount --------------------------------------------

  useEffect(() => {
    return () => {
      for (const rt of runtimeRef.current.values()) {
        clearSchedule(rt)
        rt.audio.pause()
        rt.audio.src = ''
        if (rt.blobUrl) URL.revokeObjectURL(rt.blobUrl)
      }
      runtimeRef.current.clear()
    }
  }, [])

  /** Load a raw Blob into a slot's audio element (used by .amb import) */
  const loadSlotBlob = useCallback((slotId: string, blob: Blob) => {
    const rt = getRuntime(slotId)
    if (rt.blobUrl) URL.revokeObjectURL(rt.blobUrl)
    const url = URL.createObjectURL(blob)
    rt.blobUrl = url
    rt.fileHandle = null
    rt.audio.src = url
  }, [getRuntime])

  /** Get the FileSystemFileHandle for a loaded slot (needed for .amb export) */
  const getFileHandle = useCallback((slotId: string): FileSystemFileHandle | null => {
    return runtimeRef.current.get(slotId)?.fileHandle ?? null
  }, [])

  return { pickFile, loadSlotFile, loadSlotBlob, getFileHandle }
}
