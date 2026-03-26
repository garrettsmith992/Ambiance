/**
 * Core scene types — these mirror the scene.json schema inside .amb files.
 * The Zustand store shape is derived from these types so that
 * export/import is a direct serialization/deserialization.
 */

// ─── Video Layer ───────────────────────────────────────────────

export type VideoSourceType = 'local' | 'youtube'

export interface VideoSourceLocal {
  source: 'local'
  /** Display name or folder path — resolved at runtime via File System Access API */
  folderName: string
  shuffle: boolean
  loop: boolean
}

export interface VideoSourceYouTube {
  source: 'youtube'
  /** YouTube playlist ID or single video ID */
  videoId?: string
  playlistId?: string
}

export type VideoSource = VideoSourceLocal | VideoSourceYouTube

export interface VideoLayer {
  source: VideoSource | null
  volume: number
  muted: boolean
  /** Whether the video source contains its own music/soundtrack */
  containsMusic: boolean
  tags: string[]
}

// ─── Music Layer ───────────────────────────────────────────────

export type MusicSourceType = 'local' | 'spotify' | 'youtube'

export interface MusicSourceLocal {
  source: 'local'
  folderName: string
  shuffle: boolean
  loop: boolean
}

export interface MusicSourceSpotify {
  source: 'spotify'
  uri: string
}

export interface MusicSourceYouTube {
  source: 'youtube'
  playlistId?: string
  videoId?: string
}

export type MusicSource = MusicSourceLocal | MusicSourceSpotify | MusicSourceYouTube

export interface MusicLayer {
  source: MusicSource | null
  volume: number
  muted: boolean
  tags: string[]
}

// ─── SFX Layer ─────────────────────────────────────────────────

export type SfxMode = 'loop' | 'interval'

export interface SfxSlot {
  id: string
  name: string
  /** Relative path inside .amb (e.g. "sfx/rain.mp3") or runtime file reference */
  file: string
  mode: SfxMode
  volume: number
  muted: boolean
  /** Interval mode: minimum delay in ms before replaying */
  minMs: number
  /** Interval mode: maximum delay in ms before replaying */
  maxMs: number
  tags: string[]
}

export interface SfxLayer {
  slots: SfxSlot[]
}

// ─── Scene ─────────────────────────────────────────────────────

export interface Scene {
  id: string
  name: string
  version: string
  created: string
  video: VideoLayer
  music: MusicLayer
  sfx: SfxLayer
  tags: string[]
  /** Base64 data URI or blob URL for scene thumbnail */
  previewImage?: string
}

// ─── .amb manifest (what gets written to scene.json inside the zip) ──

export interface AmbManifest {
  name: string
  version: string
  created: string
  video: {
    source: VideoSource | null
    volume: number
    muted: boolean
    containsMusic: boolean
    tags: string[]
  }
  music: {
    source: MusicSource | null
    volume: number
    muted: boolean
    tags: string[]
  }
  sfx: Array<{
    name: string
    file: string
    mode: SfxMode
    volume: number
    minMs: number
    maxMs: number
    tags: string[]
  }>
  tags: string[]
}
