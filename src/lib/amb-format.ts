import JSZip from 'jszip'
import type { Scene, AmbManifest } from '@/types/index'
import { createDefaultScene } from '@/lib/defaults'

/**
 * Build an AmbManifest from a Scene (strips runtime-only fields like id).
 */
function sceneToManifest(scene: Scene): AmbManifest {
  return {
    name: scene.name,
    version: scene.version,
    created: scene.created,
    video: {
      sources: scene.video.sources,
      shuffle: scene.video.shuffle,
      volume: scene.video.volume,
      muted: scene.video.muted,
      containsMusic: scene.video.containsMusic,
      tags: scene.video.tags,
    },
    music: {
      sources: scene.music.sources,
      shuffle: scene.music.shuffle,
      volume: scene.music.volume,
      muted: scene.music.muted,
      tags: scene.music.tags,
    },
    sfx: scene.sfx.slots.map((s) => ({
      name: s.name,
      file: `sfx/${s.file}`,
      mode: s.mode,
      volume: s.volume,
      minMs: s.minMs,
      maxMs: s.maxMs,
      tags: s.tags,
    })),
    tags: scene.tags,
  }
}

/**
 * Check if a scene uses local file paths for video or music that won't
 * be portable in a .amb file.
 */
export function getLocalSourceWarnings(scene: Scene): string[] {
  const warnings: string[] = []
  if (scene.video.sources.some((s) => s.type === 'local')) {
    warnings.push('Video has local folder sources — they won\'t be accessible on another machine.')
  }
  if (scene.music.sources.some((s) => s.type === 'local')) {
    warnings.push('Music has local folder sources — they won\'t be accessible on another machine.')
  }
  return warnings
}

/**
 * Export a scene as a .amb file (zip containing scene.json + sfx/ audio files).
 */
export async function exportAmb(
  scene: Scene,
  getFileHandle: (slotId: string) => FileSystemFileHandle | null,
): Promise<Blob> {
  const zip = new JSZip()
  const manifest = sceneToManifest(scene)

  // Bundle SFX audio files
  for (const slot of scene.sfx.slots) {
    const handle = getFileHandle(slot.id)
    if (handle) {
      const file = await handle.getFile()
      zip.file(`sfx/${slot.file}`, file)
    }
  }

  // Bundle preview image if present
  if (scene.previewImage) {
    const match = scene.previewImage.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      const ext = match[1].split('/')[1] || 'jpg'
      zip.file(`preview.${ext}`, match[2], { base64: true })
    }
  }

  // Write manifest
  zip.file('scene.json', JSON.stringify(manifest, null, 2))

  return zip.generateAsync({ type: 'blob' })
}

/**
 * Import a .amb file and reconstruct a Scene from it.
 */
export async function importAmb(
  file: File | Blob,
): Promise<{ scene: Scene; sfxBlobs: Map<string, { blob: Blob; filename: string }> }> {
  const zip = await JSZip.loadAsync(file)

  const manifestFile = zip.file('scene.json')
  if (!manifestFile) throw new Error('Invalid .amb file: missing scene.json')

  const manifest: AmbManifest = JSON.parse(await manifestFile.async('text'))

  // Build the Scene
  const base = createDefaultScene(manifest.name)
  const scene: Scene = {
    ...base,
    version: manifest.version,
    created: manifest.created,
    video: {
      sources: manifest.video.sources,
      shuffle: manifest.video.shuffle,
      volume: manifest.video.volume,
      muted: manifest.video.muted,
      containsMusic: manifest.video.containsMusic,
      tags: manifest.video.tags,
    },
    music: {
      sources: manifest.music.sources,
      shuffle: manifest.music.shuffle,
      volume: manifest.music.volume,
      muted: manifest.music.muted,
      tags: manifest.music.tags,
    },
    sfx: {
      slots: manifest.sfx.map((s) => ({
        id: crypto.randomUUID(),
        name: s.name,
        file: s.file.replace(/^sfx\//, ''),
        mode: s.mode,
        volume: s.volume,
        muted: false,
        minMs: s.minMs,
        maxMs: s.maxMs,
        tags: s.tags,
      })),
    },
    tags: manifest.tags,
  }

  // Extract preview image
  const previewEntry = zip.file(/^preview\./)?.[0]
  if (previewEntry) {
    const data = await previewEntry.async('base64')
    const ext = previewEntry.name.split('.').pop() || 'jpg'
    scene.previewImage = `data:image/${ext};base64,${data}`
  }

  // Extract SFX blobs
  const sfxBlobs = new Map<string, { blob: Blob; filename: string }>()
  for (const slot of scene.sfx.slots) {
    const sfxFile = zip.file(`sfx/${slot.file}`)
    if (sfxFile) {
      const blob = await sfxFile.async('blob')
      sfxBlobs.set(slot.id, { blob, filename: slot.file })
    }
  }

  return { scene, sfxBlobs }
}

/** Trigger a download of a Blob as a named file. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
