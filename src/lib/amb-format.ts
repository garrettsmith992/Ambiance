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
      source: scene.video.source,
      volume: scene.video.volume,
      muted: scene.video.muted,
      containsMusic: scene.video.containsMusic,
      tags: scene.video.tags,
    },
    music: {
      source: scene.music.source,
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
  if (scene.video.source?.source === 'local') {
    warnings.push('Video is set to a local folder — it won\'t be accessible on another machine.')
  }
  if (scene.music.source?.source === 'local') {
    warnings.push('Music is set to a local folder — it won\'t be accessible on another machine.')
  }
  return warnings
}

/**
 * Export a scene as a .amb file (zip containing scene.json + sfx/ audio files).
 *
 * @param scene The scene to export
 * @param getFileHandle Function to retrieve the FileSystemFileHandle for an SFX slot
 * @returns Blob of the .amb file, or null if cancelled/failed
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
    // previewImage is a data URI — extract the base64 portion
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
 *
 * @param file The .amb file (File or Blob)
 * @returns The reconstructed Scene with blob URLs for SFX files, plus
 *          a map of slotId → Blob so the caller can load them into the SFX hook
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
      source: manifest.video.source,
      volume: manifest.video.volume,
      muted: manifest.video.muted,
      containsMusic: manifest.video.containsMusic,
      tags: manifest.video.tags,
    },
    music: {
      source: manifest.music.source,
      volume: manifest.music.volume,
      muted: manifest.music.muted,
      tags: manifest.music.tags,
    },
    sfx: {
      slots: manifest.sfx.map((s) => ({
        id: crypto.randomUUID(),
        name: s.name,
        // Strip the "sfx/" prefix for the runtime file field
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

  // Extract SFX blobs (caller will load them into the audio hook)
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
