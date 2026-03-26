import { create } from 'zustand'
import type { Scene, VideoSource, MusicSource, SfxSlot } from '@/types/index'
import { createDefaultScene } from '@/lib/defaults'
import { loadScenes, saveScenes, loadActiveSceneId, saveActiveSceneId } from '@/lib/persistence'

interface SceneStore {
  // ─── State ───────────────────────────────────────────────
  scenes: Scene[]
  activeSceneId: string | null
  playing: boolean

  // ─── Computed-like ───────────────────────────────────────
  activeScene: () => Scene | undefined

  // ─── Scene CRUD ──────────────────────────────────────────
  createScene: (name?: string) => Scene
  deleteScene: (id: string) => void
  renameScene: (id: string, name: string) => void
  setActiveScene: (id: string | null) => void
  duplicateScene: (id: string) => Scene
  importScene: (scene: Scene) => void

  // ─── Transport ───────────────────────────────────────────
  play: () => void
  pause: () => void
  togglePlayback: () => void

  // ─── Video Layer ─────────────────────────────────────────
  setVideoSource: (source: VideoSource | null) => void
  setVideoVolume: (volume: number) => void
  toggleVideoMute: () => void
  toggleVideoContainsMusic: () => void

  // ─── Music Layer ─────────────────────────────────────────
  setMusicSource: (source: MusicSource | null) => void
  setMusicVolume: (volume: number) => void
  toggleMusicMute: () => void

  // ─── SFX Layer ───────────────────────────────────────────
  addSfxSlot: (slot: Omit<SfxSlot, 'id'>) => void
  removeSfxSlot: (slotId: string) => void
  updateSfxSlot: (slotId: string, updates: Partial<SfxSlot>) => void

  // ─── Tags ────────────────────────────────────────────────
  addSceneTag: (tag: string) => void
  removeSceneTag: (tag: string) => void
}

/** Helper: update the active scene immutably and persist */
function updateActive(
  get: () => SceneStore,
  set: (partial: Partial<SceneStore>) => void,
  updater: (scene: Scene) => Scene,
) {
  const { scenes, activeSceneId } = get()
  if (!activeSceneId) return

  const updated = scenes.map((s) => (s.id === activeSceneId ? updater(s) : s))
  set({ scenes: updated })
  saveScenes(updated)
}

export const useSceneStore = create<SceneStore>((set, get) => {
  const persisted = loadScenes()
  const activeId = loadActiveSceneId()

  return {
    scenes: persisted,
    activeSceneId: activeId && persisted.some((s) => s.id === activeId) ? activeId : null,
    playing: false,

    activeScene: () => {
      const { scenes, activeSceneId } = get()
      return scenes.find((s) => s.id === activeSceneId)
    },

    // ─── Scene CRUD ──────────────────────────────────────

    createScene: (name) => {
      const scene = createDefaultScene(name)
      const updated = [...get().scenes, scene]
      set({ scenes: updated, activeSceneId: scene.id })
      saveScenes(updated)
      saveActiveSceneId(scene.id)
      return scene
    },

    deleteScene: (id) => {
      const updated = get().scenes.filter((s) => s.id !== id)
      const newActive = get().activeSceneId === id ? null : get().activeSceneId
      set({ scenes: updated, activeSceneId: newActive, playing: false })
      saveScenes(updated)
      saveActiveSceneId(newActive)
    },

    renameScene: (id, name) => {
      const updated = get().scenes.map((s) => (s.id === id ? { ...s, name } : s))
      set({ scenes: updated })
      saveScenes(updated)
    },

    setActiveScene: (id) => {
      set({ activeSceneId: id, playing: false })
      saveActiveSceneId(id)
    },

    duplicateScene: (id) => {
      const original = get().scenes.find((s) => s.id === id)
      if (!original) return createDefaultScene()
      const dupe: Scene = {
        ...structuredClone(original),
        id: crypto.randomUUID(),
        name: `${original.name} (copy)`,
        created: new Date().toISOString().split('T')[0],
      }
      const updated = [...get().scenes, dupe]
      set({ scenes: updated, activeSceneId: dupe.id })
      saveScenes(updated)
      saveActiveSceneId(dupe.id)
      return dupe
    },

    importScene: (scene) => {
      const withNewId = { ...scene, id: crypto.randomUUID() }
      const updated = [...get().scenes, withNewId]
      set({ scenes: updated, activeSceneId: withNewId.id })
      saveScenes(updated)
      saveActiveSceneId(withNewId.id)
    },

    // ─── Transport ───────────────────────────────────────

    play: () => set({ playing: true }),
    pause: () => set({ playing: false }),
    togglePlayback: () => set({ playing: !get().playing }),

    // ─── Video Layer ─────────────────────────────────────

    setVideoSource: (source) =>
      updateActive(get, set, (s) => ({ ...s, video: { ...s.video, source } })),

    setVideoVolume: (volume) =>
      updateActive(get, set, (s) => ({ ...s, video: { ...s.video, volume } })),

    toggleVideoMute: () =>
      updateActive(get, set, (s) => ({
        ...s,
        video: { ...s.video, muted: !s.video.muted },
      })),

    toggleVideoContainsMusic: () =>
      updateActive(get, set, (s) => ({
        ...s,
        video: { ...s.video, containsMusic: !s.video.containsMusic },
      })),

    // ─── Music Layer ─────────────────────────────────────

    setMusicSource: (source) =>
      updateActive(get, set, (s) => ({ ...s, music: { ...s.music, source } })),

    setMusicVolume: (volume) =>
      updateActive(get, set, (s) => ({ ...s, music: { ...s.music, volume } })),

    toggleMusicMute: () =>
      updateActive(get, set, (s) => ({
        ...s,
        music: { ...s.music, muted: !s.music.muted },
      })),

    // ─── SFX Layer ───────────────────────────────────────

    addSfxSlot: (slot) =>
      updateActive(get, set, (s) => ({
        ...s,
        sfx: {
          slots: [...s.sfx.slots, { ...slot, id: crypto.randomUUID() }],
        },
      })),

    removeSfxSlot: (slotId) =>
      updateActive(get, set, (s) => ({
        ...s,
        sfx: { slots: s.sfx.slots.filter((sl) => sl.id !== slotId) },
      })),

    updateSfxSlot: (slotId, updates) =>
      updateActive(get, set, (s) => ({
        ...s,
        sfx: {
          slots: s.sfx.slots.map((sl) =>
            sl.id === slotId ? { ...sl, ...updates } : sl,
          ),
        },
      })),

    // ─── Tags ────────────────────────────────────────────

    addSceneTag: (tag) =>
      updateActive(get, set, (s) => ({
        ...s,
        tags: s.tags.includes(tag) ? s.tags : [...s.tags, tag],
      })),

    removeSceneTag: (tag) =>
      updateActive(get, set, (s) => ({
        ...s,
        tags: s.tags.filter((t) => t !== tag),
      })),
  }
})
