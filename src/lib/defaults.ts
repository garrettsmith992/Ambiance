import type { Scene, VideoLayer, MusicLayer, SfxLayer } from '@/types/index'

export function createDefaultVideoLayer(): VideoLayer {
  return {
    source: null,
    volume: 0.5,
    muted: false,
    containsMusic: false,
    tags: [],
  }
}

export function createDefaultMusicLayer(): MusicLayer {
  return {
    source: null,
    volume: 0.5,
    muted: false,
    tags: [],
  }
}

export function createDefaultSfxLayer(): SfxLayer {
  return {
    slots: [],
  }
}

export function createDefaultScene(name = 'Untitled Scene'): Scene {
  return {
    id: crypto.randomUUID(),
    name,
    version: '1.0',
    created: new Date().toISOString().split('T')[0],
    video: createDefaultVideoLayer(),
    music: createDefaultMusicLayer(),
    sfx: createDefaultSfxLayer(),
    tags: [],
  }
}
