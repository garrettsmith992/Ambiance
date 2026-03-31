import { create } from 'zustand'
import type { Scene, VideoSource, MusicSource, SfxSlot } from '@/types/index'
import { createDefaultScene } from '@/lib/defaults'
import { loadScenes, saveScenes, loadActiveSceneId, saveActiveSceneId } from '@/lib/persistence'

interface SceneStore {
  // ─── State ───────────────────────────────────────────────
  scenes: Scene[]
  activeSceneId: string | null
  playing: boolean
  /** Index into the active scene's video.sources array */
  videoSourceIndex: number
  /** Index into the active scene's music.sources array */
  musicSourceIndex: number

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
  addVideoSource: (source: VideoSource) => void
  removeVideoSource: (index: number) => void
  moveVideoSource: (index: number, direction: 'up' | 'down') => void
  setVideoVolume: (volume: number) => void
  toggleVideoMute: () => void
  toggleVideoShuffle: () => void
  toggleVideoSourceContainsMusic: (index: number) => void
  nextVideoSource: () => void
  prevVideoSource: () => void
  setVideoSourceIndex: (index: number) => void

  // ─── Music Layer ─────────────────────────────────────────
  addMusicSource: (source: MusicSource) => void
  removeMusicSource: (index: number) => void
  moveMusicSource: (index: number, direction: 'up' | 'down') => void
  setMusicVolume: (volume: number) => void
  toggleMusicMute: () => void
  toggleMusicShuffle: () => void
  nextMusicSource: () => void
  prevMusicSource: () => void
  setMusicSourceIndex: (index: number) => void

  // ─── SFX Layer ───────────────────────────────────────────
  addSfxSlot: (slot: Omit<SfxSlot, 'id'>) => void
  removeSfxSlot: (slotId: string) => void
  updateSfxSlot: (slotId: string, updates: Partial<SfxSlot>) => void

  // ─── Scene Management ───────────────────────────────────
  reorderScene: (id: string, direction: 'up' | 'down') => void
  setPreviewImage: (id: string, dataUri: string) => void

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
    videoSourceIndex: 0,
    musicSourceIndex: 0,

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
      set({ activeSceneId: id, playing: false, videoSourceIndex: 0, musicSourceIndex: 0 })
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

    addVideoSource: (source) =>
      updateActive(get, set, (s) => ({
        ...s,
        video: { ...s.video, sources: [...s.video.sources, source] },
      })),

    removeVideoSource: (index) => {
      const scene = get().activeScene()
      if (!scene) return
      updateActive(get, set, (s) => ({
        ...s,
        video: { ...s.video, sources: s.video.sources.filter((_, i) => i !== index) },
      }))
      // Adjust current index if needed
      const { videoSourceIndex } = get()
      const newLen = scene.video.sources.length - 1
      if (videoSourceIndex >= newLen && newLen > 0) {
        set({ videoSourceIndex: newLen - 1 })
      } else if (newLen === 0) {
        set({ videoSourceIndex: 0 })
      }
    },

    moveVideoSource: (index, direction) =>
      updateActive(get, set, (s) => {
        const sources = [...s.video.sources]
        const targetIdx = direction === 'up' ? index - 1 : index + 1
        if (targetIdx < 0 || targetIdx >= sources.length) return s
        ;[sources[index], sources[targetIdx]] = [sources[targetIdx], sources[index]]
        return { ...s, video: { ...s.video, sources } }
      }),

    setVideoVolume: (volume) =>
      updateActive(get, set, (s) => ({ ...s, video: { ...s.video, volume } })),

    toggleVideoMute: () =>
      updateActive(get, set, (s) => ({
        ...s,
        video: { ...s.video, muted: !s.video.muted },
      })),

    toggleVideoShuffle: () =>
      updateActive(get, set, (s) => ({
        ...s,
        video: { ...s.video, shuffle: !s.video.shuffle },
      })),

    toggleVideoSourceContainsMusic: (index) =>
      updateActive(get, set, (s) => ({
        ...s,
        video: {
          ...s.video,
          sources: s.video.sources.map((src, i) =>
            i === index ? { ...src, containsMusic: !src.containsMusic } : src,
          ),
        },
      })),

    nextVideoSource: () => {
      const scene = get().activeScene()
      if (!scene || scene.video.sources.length === 0) return
      const next = (get().videoSourceIndex + 1) % scene.video.sources.length
      set({ videoSourceIndex: next })
    },

    prevVideoSource: () => {
      const scene = get().activeScene()
      if (!scene || scene.video.sources.length === 0) return
      const len = scene.video.sources.length
      const prev = (get().videoSourceIndex - 1 + len) % len
      set({ videoSourceIndex: prev })
    },

    setVideoSourceIndex: (index) => set({ videoSourceIndex: index }),

    // ─── Music Layer ─────────────────────────────────────

    addMusicSource: (source) =>
      updateActive(get, set, (s) => ({
        ...s,
        music: { ...s.music, sources: [...s.music.sources, source] },
      })),

    removeMusicSource: (index) => {
      const scene = get().activeScene()
      if (!scene) return
      updateActive(get, set, (s) => ({
        ...s,
        music: { ...s.music, sources: s.music.sources.filter((_, i) => i !== index) },
      }))
      const { musicSourceIndex } = get()
      const newLen = scene.music.sources.length - 1
      if (musicSourceIndex >= newLen && newLen > 0) {
        set({ musicSourceIndex: newLen - 1 })
      } else if (newLen === 0) {
        set({ musicSourceIndex: 0 })
      }
    },

    moveMusicSource: (index, direction) =>
      updateActive(get, set, (s) => {
        const sources = [...s.music.sources]
        const targetIdx = direction === 'up' ? index - 1 : index + 1
        if (targetIdx < 0 || targetIdx >= sources.length) return s
        ;[sources[index], sources[targetIdx]] = [sources[targetIdx], sources[index]]
        return { ...s, music: { ...s.music, sources } }
      }),

    setMusicVolume: (volume) =>
      updateActive(get, set, (s) => ({ ...s, music: { ...s.music, volume } })),

    toggleMusicMute: () =>
      updateActive(get, set, (s) => ({
        ...s,
        music: { ...s.music, muted: !s.music.muted },
      })),

    toggleMusicShuffle: () =>
      updateActive(get, set, (s) => ({
        ...s,
        music: { ...s.music, shuffle: !s.music.shuffle },
      })),

    nextMusicSource: () => {
      const scene = get().activeScene()
      if (!scene || scene.music.sources.length === 0) return
      const next = (get().musicSourceIndex + 1) % scene.music.sources.length
      set({ musicSourceIndex: next })
    },

    prevMusicSource: () => {
      const scene = get().activeScene()
      if (!scene || scene.music.sources.length === 0) return
      const len = scene.music.sources.length
      const prev = (get().musicSourceIndex - 1 + len) % len
      set({ musicSourceIndex: prev })
    },

    setMusicSourceIndex: (index) => set({ musicSourceIndex: index }),

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

    // ─── Scene Management ─────────────────────────────────

    reorderScene: (id, direction) => {
      const { scenes } = get()
      const idx = scenes.findIndex((s) => s.id === id)
      if (idx === -1) return
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= scenes.length) return
      const updated = [...scenes]
      ;[updated[idx], updated[targetIdx]] = [updated[targetIdx], updated[idx]]
      set({ scenes: updated })
      saveScenes(updated)
    },

    setPreviewImage: (id, dataUri) => {
      const updated = get().scenes.map((s) =>
        s.id === id ? { ...s, previewImage: dataUri } : s,
      )
      set({ scenes: updated })
      saveScenes(updated)
    },

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
