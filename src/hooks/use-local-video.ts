import { useState, useCallback, useRef } from 'react'

interface LocalVideoFile {
  name: string
  handle: FileSystemFileHandle
  url?: string
}

interface UseLocalVideoReturn {
  files: LocalVideoFile[]
  currentIndex: number
  currentUrl: string | null
  pickFolder: () => Promise<boolean>
  next: () => void
  prev: () => void
  hasFolder: boolean
}

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v']

function isVideoFile(name: string): boolean {
  return VIDEO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext))
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function useLocalVideo(shuffle = false): UseLocalVideoReturn {
  const [files, setFiles] = useState<LocalVideoFile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const prevUrlRef = useRef<string | null>(null)

  const loadFileUrl = useCallback(async (file: LocalVideoFile) => {
    if (file.url) {
      // Revoke previous URL to prevent memory leaks
      if (prevUrlRef.current && prevUrlRef.current !== file.url) {
        URL.revokeObjectURL(prevUrlRef.current)
      }
      prevUrlRef.current = file.url
      setCurrentUrl(file.url)
      return
    }
    const blob = await file.handle.getFile()
    const url = URL.createObjectURL(blob)
    file.url = url
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current)
    }
    prevUrlRef.current = url
    setCurrentUrl(url)
  }, [])

  const pickFolder = useCallback(async (): Promise<boolean> => {
    try {
      const dirHandle = await window.showDirectoryPicker()
      const videoFiles: LocalVideoFile[] = []

      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && isVideoFile(entry.name)) {
          videoFiles.push({ name: entry.name, handle: entry })
        }
      }

      if (videoFiles.length === 0) return false

      const ordered = shuffle ? shuffleArray(videoFiles) : videoFiles.sort((a, b) => a.name.localeCompare(b.name))
      setFiles(ordered)
      setCurrentIndex(0)
      await loadFileUrl(ordered[0])
      return true
    } catch {
      // User cancelled the picker
      return false
    }
  }, [shuffle, loadFileUrl])

  const next = useCallback(() => {
    if (files.length === 0) return
    const nextIdx = (currentIndex + 1) % files.length
    setCurrentIndex(nextIdx)
    loadFileUrl(files[nextIdx])
  }, [files, currentIndex, loadFileUrl])

  const prev = useCallback(() => {
    if (files.length === 0) return
    const prevIdx = (currentIndex - 1 + files.length) % files.length
    setCurrentIndex(prevIdx)
    loadFileUrl(files[prevIdx])
  }, [files, currentIndex, loadFileUrl])

  return {
    files,
    currentIndex,
    currentUrl,
    pickFolder,
    next,
    prev,
    hasFolder: files.length > 0,
  }
}
