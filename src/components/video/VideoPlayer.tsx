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
  const prevSrcRef = useRef<string | null>(null)

  // Sync volume
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.volume = muted ? 0 : volume
    }
    if (nextRef.current) {
      nextRef.current.volume = muted ? 0 : volume
    }
  }, [volume, muted])

  // When src changes (new video loaded after advancement), swap it into the active player
  useEffect(() => {
    if (!src || !activeRef.current) return

    // If we're crossfading, the new src is for the "next" player
    if (crossfading.current) {
      setNextSrc(src)
      if (nextRef.current) {
        nextRef.current.src = src
        nextRef.current.volume = muted ? 0 : volume
        nextRef.current.play().catch(() => {})
      }
      return
    }

    // Normal source change — load into active player
    if (src !== prevSrcRef.current) {
      activeRef.current.src = src
      activeRef.current.volume = muted ? 0 : volume
      if (playing) activeRef.current.play().catch(() => {})
      prevSrcRef.current = src
    }
  }, [src])

  // Play/pause sync
  useEffect(() => {
    if (!activeRef.current || !src) return
    if (playing) {
      activeRef.current.play().catch(() => {})
    } else {
      activeRef.current.pause()
    }
  }, [playing, src])

  const handleTimeUpdate = useCallback(() => {
    const video = activeRef.current
    if (!video || crossfading.current) return

    const remaining = video.duration - video.currentTime
    if (remaining <= CROSSFADE_MS / 1000 && remaining > 0) {
      crossfading.current = true
      setActiveOpacity(0)

      // Tell parent to advance — this will change `src` prop to the next video
      onEnded()

      setTimeout(() => {
        // Swap: next becomes active
        if (activeRef.current && nextRef.current && nextSrc) {
          activeRef.current.src = nextRef.current.src
          activeRef.current.currentTime = nextRef.current.currentTime
          activeRef.current.play().catch(() => {})
        }
        crossfading.current = false
        setActiveOpacity(1)
        setNextSrc(null)
        prevSrcRef.current = src
      }, CROSSFADE_MS)
    }
  }, [src, onEnded, nextSrc])

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
