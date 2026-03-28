// File System Access API
interface FileSystemFileHandle {
  kind: 'file'
  name: string
  getFile(): Promise<File>
}

interface FileSystemDirectoryHandle {
  kind: 'directory'
  name: string
  values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>
}

interface OpenFilePickerOptions {
  multiple?: boolean
  types?: Array<{
    description?: string
    accept: Record<string, string[]>
  }>
}

interface Window {
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>
  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>
}

// YouTube IFrame API
declare namespace YT {
  class Player {
    constructor(
      elementId: string,
      config: {
        width?: string | number
        height?: string | number
        videoId?: string
        playerVars?: Record<string, number | string>
        events?: {
          onReady?: (event: { target: Player }) => void
          onStateChange?: (event: { data: number }) => void
          onError?: (event: { data: number }) => void
        }
      },
    )
    loadVideoById(videoId: string): void
    loadPlaylist(config: { list: string; listType: string }): void
    playVideo(): void
    pauseVideo(): void
    stopVideo(): void
    setVolume(volume: number): void
    getVolume(): number
    mute(): void
    unMute(): void
    isMuted(): boolean
    destroy(): void
  }
}
