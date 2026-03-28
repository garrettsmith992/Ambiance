import { useRef, useEffect, useCallback, useState } from 'react'
import { useSceneStore } from '@/store/index'

interface VideoPlayerProps {
  src: string | null
  onEnded: () => void
}

const CROSSFADE_MS = 2000

export function VideoPlayer({ src, onEnded }: VideoPlayerProps) {
  const volume = useSceneStore((s) => s.activeScene()?.video.volume ?? 0.5)
  const muted = useSceneStore((s) => s.activeScene()?.video.muted ?? false)
  const playing = useSceneStore((s) => s.playing)

  const activeRef = useRef<HTMLVideoElement>(null)
  const nextRef = useRef<HTMLVideoElement>(null)
  const [activeOpacity, setActiveOpacity] = useState(1)
  const [nextSrc, setNextSrc] = useState<string | null>(null)
  const crossfading = useRef(false)

  // Sync volume
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.volume = muted ? 0 : volume
    }
    if (nextRef.current) {
      nextRef.current.volume = muted ? 0 : volume
    }
  }, [volume, muted])

  // Play/pause sync
  useEffect(() => {
    if (!activeRef.current || !src) return
    if (playing) {
      activeRef.current.play().catch(() => {})
    } else {
      activeRef.current.pause()
    }
  }, [playing, src])

  // Load new src
  useEffect(() => {
    if (!src || !activeRef.current) return
    if (!crossfading.current) {
      activeRef.current.src = src
      activeRef.current.volume = muted ? 0 : volume
      if (playing) activeRef.current.play().catch(() => {})
    }
  }, [src])

  const handleTimeUpdate = useCallback(() => {
    const video = activeRef.current
    if (!video || crossfading.current) return

    const remaining = video.duration - video.currentTime
    if (remaining <= CROSSFADE_MS / 1000 && remaining > 0) {
      crossfading.current = true
      setNextSrc(src)
      setActiveOpacity(0)

      setTimeout(() => {
        crossfading.current = false
        setActiveOpacity(1)
        setNextSrc(null)
        onEnded()
      }, CROSSFADE_MS)
    }
  }, [src, onEnded])

  const handleEnded = useCallback(() => {
    if (!crossfading.current) {
      onEnded()
    }
  }, [onEnded])

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <video
        ref={activeRef}
        className="w-full h-full object-cover transition-opacity"
        style={{ transitionDuration: `${CROSSFADE_MS}ms`, opacity: activeOpacity }}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        playsInline
        muted={muted}
      />
      {nextSrc && (
        <video
          ref={nextRef}
          src={nextSrc}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted={muted}
        />
      )}
    </div>
  )
}
