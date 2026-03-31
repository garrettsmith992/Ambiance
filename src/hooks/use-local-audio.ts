import { useState, useCallback, useRef, useEffect } from 'react'

interface LocalAudioFile {
  name: string
  handle: FileSystemFileHandle
  url?: string
}

interface UseLocalAudioReturn {
  files: LocalAudioFile[]
  currentIndex: number
  currentTrack: string | null
  pickFolder: () => Promise<boolean>
  next: () => void
  prev: () => void
  play: () => void
  pause: () => void
  hasFolder: boolean
  isPlaying: boolean
}

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.opus', '.wma']

function isAudioFile(name: string): boolean {
  return AUDIO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext))
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function useLocalAudio(shuffle = false, volume = 0.5, muted = false): UseLocalAudioReturn {
  const [files, setFiles] = useState<LocalAudioFile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentTrack, setCurrentTrack] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Create audio element once
  useEffect(() => {
    const audio = new Audio()
    audio.addEventListener('ended', () => {
      // Auto-advance to next track
      setCurrentIndex((prev) => {
        const nextIdx = (prev + 1) % (files.length || 1)
        return nextIdx
      })
    })
    audioRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  // Sync volume
  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = muted ? 0 : volume
  }, [volume, muted])

  // Load track when index changes
  useEffect(() => {
    if (files.length === 0 || !audioRef.current) return
    const file = files[currentIndex]
    if (!file) return

    const loadAndPlay = async () => {
      if (!file.url) {
        const blob = await file.handle.getFile()
        file.url = URL.createObjectURL(blob)
      }
      if (!audioRef.current) return
      audioRef.current.src = file.url
      setCurrentTrack(file.name)
      if (isPlaying) {
        audioRef.current.play().catch(() => {})
      }
    }
    loadAndPlay()
  }, [currentIndex, files])

  const pickFolder = useCallback(async (): Promise<boolean> => {
    try {
      const dirHandle = await window.showDirectoryPicker()
      const audioFiles: LocalAudioFile[] = []

      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && isAudioFile(entry.name)) {
          audioFiles.push({ name: entry.name, handle: entry })
        }
      }

      if (audioFiles.length === 0) return false

      const ordered = shuffle
        ? shuffleArray(audioFiles)
        : audioFiles.sort((a, b) => a.name.localeCompare(b.name))
      setFiles(ordered)
      setCurrentIndex(0)
      return true
    } catch {
      // User cancelled
      return false
    }
  }, [shuffle])

  const play = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.play().catch(() => {})
    setIsPlaying(true)
  }, [])

  const pause = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.pause()
    setIsPlaying(false)
  }, [])

  const next = useCallback(() => {
    if (files.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % files.length)
  }, [files.length])

  const prev = useCallback(() => {
    if (files.length === 0) return
    setCurrentIndex((prev) => (prev - 1 + files.length) % files.length)
  }, [files.length])

  return {
    files,
    currentIndex,
    currentTrack,
    pickFolder,
    next,
    prev,
    play,
    pause,
    hasFolder: files.length > 0,
    isPlaying,
  }
}
