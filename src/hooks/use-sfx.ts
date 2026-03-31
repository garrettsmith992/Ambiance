import { useRef, useEffect, useCallback, useState } from 'react'
import type { SfxSlot } from '@/types/index'
import { saveSfxBlob, loadSfxBlob, deleteSfxBlob } from '@/lib/sfx-db'

const AUDIO_ACCEPT = {
  'audio/*': ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.opus', '.wma'],
}
const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.opus', '.wma']

function isAudioFile(name: string): boolean {
  return AUDIO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext))
}

interface SlotRuntime {
  audio: HTMLAudioElement
  /** All blob URLs for this slot (1 for single file, N for folder) */
  blobUrls: string[]
  fileHandle: FileSystemFileHandle | null
  timeoutId: ReturnType<typeof setTimeout> | null
}

function randomInRange(minMs: number, maxMs: number): number {
  return minMs + Math.random() * (maxMs - minMs)
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Manages audio playback for all SFX slots.
 * Each slot gets its own HTMLAudioElement. Loop-mode slots use the native
 * `loop` attribute. Interval-mode slots use self-rescheduling setTimeout.
 * Folder-based slots randomly pick a variant each time they play.
 * Audio blobs are persisted to IndexedDB so slots survive page reloads.
 */
export function useSfx(slots: SfxSlot[], playing: boolean) {
  const runtimeRef = useRef<Map<string, SlotRuntime>>(new Map())
  const [loadedSlots, setLoadedSlots] = useState<Set<string>>(new Set())

  const markLoaded = useCallback((slotId: string) => {
    setLoadedSlots((prev) => {
      const next = new Set(prev)
      next.add(slotId)
      return next
    })
  }, [])

  const markUnloaded = useCallback((slotId: string) => {
    setLoadedSlots((prev) => {
      const next = new Set(prev)
      next.delete(slotId)
      return next
    })
  }, [])

  // --- helpers -------------------------------------------------------

  const getRuntime = useCallback((slotId: string): SlotRuntime => {
    let rt = runtimeRef.current.get(slotId)
    if (!rt) {
      rt = { audio: new Audio(), blobUrls: [], fileHandle: null, timeoutId: null }
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

  /** Play the clip once, then after it ends wait a random delay before playing again */
  const playIntervalClip = useCallback((slot: SfxSlot, rt: SlotRuntime) => {
    if (rt.blobUrls.length === 0) return
    // Pick a random variant each time
    const url = rt.blobUrls.length === 1
      ? rt.blobUrls[0]
      : pickRandom(rt.blobUrls)
    rt.audio.src = url
    rt.audio.currentTime = 0
    rt.audio.play().catch(() => {})
    const onEnded = () => {
      rt.audio.removeEventListener('ended', onEnded)
      clearSchedule(rt)
      const delay = randomInRange(slot.minMs, slot.maxMs)
      rt.timeoutId = setTimeout(() => {
        playIntervalClip(slot, rt)
      }, delay)
    }
    rt.audio.addEventListener('ended', onEnded)
  }, [clearSchedule])

  // --- load blobs into a slot ------------------------------------------

  const loadBlobsIntoSlot = useCallback((slotId: string, blobs: Blob[]) => {
    const rt = getRuntime(slotId)
    // Revoke old URLs
    for (const url of rt.blobUrls) URL.revokeObjectURL(url)
    rt.blobUrls = blobs.map((b) => URL.createObjectURL(b))
    if (rt.blobUrls.length > 0) {
      rt.audio.src = rt.blobUrls[0]
      markLoaded(slotId)
    }
  }, [getRuntime, markLoaded])

  // --- pick a single file for a new slot --------------------------------

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
      return null
    }
  }, [])

  // --- pick a folder of variants for a new slot -------------------------

  const pickFolder = useCallback(async (): Promise<{
    name: string
    files: { name: string; handle: FileSystemFileHandle }[]
  } | null> => {
    try {
      const dirHandle = await window.showDirectoryPicker()
      const audioFiles: { name: string; handle: FileSystemFileHandle }[] = []
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && isAudioFile(entry.name)) {
          audioFiles.push({ name: entry.name, handle: entry })
        }
      }
      if (audioFiles.length === 0) return null
      return { name: dirHandle.name, files: audioFiles }
    } catch {
      return null
    }
  }, [])

  // --- load a single file handle into a slot ----------------------------

  const loadSlotFile = useCallback(async (slotId: string, handle: FileSystemFileHandle) => {
    const rt = getRuntime(slotId)
    for (const url of rt.blobUrls) URL.revokeObjectURL(url)
    const file = await handle.getFile()
    const url = URL.createObjectURL(file)
    rt.blobUrls = [url]
    rt.fileHandle = handle
    rt.audio.src = url
    markLoaded(slotId)
    saveSfxBlob(slotId, file).catch(() => {})
  }, [getRuntime, markLoaded])

  // --- load multiple file handles into a slot (folder) ------------------

  const loadSlotFolder = useCallback(async (
    slotId: string,
    handles: FileSystemFileHandle[],
  ) => {
    const rt = getRuntime(slotId)
    for (const url of rt.blobUrls) URL.revokeObjectURL(url)

    const blobs: Blob[] = []
    const urls: string[] = []
    for (const handle of handles) {
      const file = await handle.getFile()
      blobs.push(file)
      urls.push(URL.createObjectURL(file))
    }
    rt.blobUrls = urls
    rt.fileHandle = null
    if (urls.length > 0) {
      rt.audio.src = urls[0]
      markLoaded(slotId)
    }
    // Persist all blobs as an array
    saveSfxBlob(slotId, blobs).catch(() => {})
  }, [getRuntime, markLoaded])

  // --- auto-restore blobs from IndexedDB on mount -----------------------

  useEffect(() => {
    let cancelled = false
    async function restore() {
      for (const slot of slots) {
        if (cancelled) break
        if (runtimeRef.current.get(slot.id)?.blobUrls.length) continue
        const stored = await loadSfxBlob(slot.id).catch(() => null)
        if (!stored || cancelled) continue
        // stored can be a single Blob or an array of Blobs
        const blobs = Array.isArray(stored) ? stored as Blob[] : [stored as Blob]
        loadBlobsIntoSlot(slot.id, blobs)
      }
    }
    restore()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.map((s) => s.id).join(',')])

  // --- sync slot settings to audio elements -----------------------------

  useEffect(() => {
    const activeIds = new Set(slots.map((s) => s.id))

    for (const [id, rt] of runtimeRef.current) {
      if (!activeIds.has(id)) {
        clearSchedule(rt)
        rt.audio.pause()
        rt.audio.src = ''
        for (const url of rt.blobUrls) URL.revokeObjectURL(url)
        rt.blobUrls = []
        runtimeRef.current.delete(id)
        markUnloaded(id)
        deleteSfxBlob(id).catch(() => {})
      }
    }

    for (const slot of slots) {
      const rt = getRuntime(slot.id)
      rt.audio.volume = slot.muted ? 0 : slot.volume

      if (!playing || slot.muted) {
        clearSchedule(rt)
        rt.audio.pause()
        continue
      }

      if (rt.blobUrls.length === 0) continue // no file loaded yet

      if (slot.mode === 'loop') {
        clearSchedule(rt)
        if (rt.blobUrls.length <= 1) {
          // Single file: native loop
          rt.audio.loop = true
          if (!rt.audio.src || rt.audio.src === '') {
            rt.audio.src = rt.blobUrls[0]
          }
          if (rt.audio.paused) rt.audio.play().catch(() => {})
        } else {
          // Multiple variants: play one, on ended pick another randomly, repeat
          rt.audio.loop = false
          if (rt.audio.paused) {
            rt.audio.src = pickRandom(rt.blobUrls)
            rt.audio.currentTime = 0
            rt.audio.play().catch(() => {})
            const loopVariants = () => {
              rt.audio.removeEventListener('ended', loopVariants)
              rt.audio.src = pickRandom(rt.blobUrls)
              rt.audio.currentTime = 0
              rt.audio.play().catch(() => {})
              rt.audio.addEventListener('ended', loopVariants)
            }
            rt.audio.addEventListener('ended', loopVariants)
          }
        }
      } else {
        // Interval mode: play a random variant, wait delay after it ends, repeat
        rt.audio.loop = false
        if (rt.timeoutId === null && rt.audio.paused) {
          playIntervalClip(slot, rt)
        }
      }
    }
  }, [slots, playing, getRuntime, clearSchedule, playIntervalClip, markUnloaded])

  // --- cleanup on unmount -----------------------------------------------

  useEffect(() => {
    return () => {
      for (const rt of runtimeRef.current.values()) {
        clearSchedule(rt)
        rt.audio.pause()
        rt.audio.src = ''
        for (const url of rt.blobUrls) URL.revokeObjectURL(url)
      }
      runtimeRef.current.clear()
    }
  }, [])

  /** Load a raw Blob into a slot's audio element (used by .amb import) */
  const loadSlotBlob = useCallback((slotId: string, blob: Blob) => {
    loadBlobsIntoSlot(slotId, [blob])
    saveSfxBlob(slotId, blob).catch(() => {})
  }, [loadBlobsIntoSlot])

  /** Get the FileSystemFileHandle for a loaded slot (needed for .amb export) */
  const getFileHandle = useCallback((slotId: string): FileSystemFileHandle | null => {
    return runtimeRef.current.get(slotId)?.fileHandle ?? null
  }, [])

  /** Re-pick a file for an existing slot */
  const reloadSlotFile = useCallback(async (slotId: string): Promise<boolean> => {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'Audio files', accept: AUDIO_ACCEPT }],
      })
      await loadSlotFile(slotId, handle)
      return true
    } catch {
      return false
    }
  }, [loadSlotFile])

  /** Check whether a slot has audio loaded */
  const isSlotLoaded = useCallback((slotId: string): boolean => {
    return loadedSlots.has(slotId)
  }, [loadedSlots])

  return {
    pickFile, pickFolder, loadSlotFile, loadSlotFolder,
    loadSlotBlob, getFileHandle, reloadSlotFile, isSlotLoaded,
  }
}
