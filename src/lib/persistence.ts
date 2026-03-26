import type { Scene } from '@/types/index'

const STORAGE_KEY = 'ambiance-scenes'
const ACTIVE_SCENE_KEY = 'ambiance-active-scene'

export function loadScenes(): Scene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveScenes(scenes: Scene[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
}

export function loadActiveSceneId(): string | null {
  return localStorage.getItem(ACTIVE_SCENE_KEY)
}

export function saveActiveSceneId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_SCENE_KEY, id)
  } else {
    localStorage.removeItem(ACTIVE_SCENE_KEY)
  }
}
