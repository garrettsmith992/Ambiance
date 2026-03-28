import { useState, useRef, useEffect } from 'react'
import { useSceneStore } from '@/store/index'
import type { Scene } from '@/types/index'

// ─── Inline rename input ───────────────────────────────────────

function RenameInput({
  value,
  onCommit,
  onCancel,
}: {
  value: string
  onCommit: (name: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  return (
    <input
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(draft.trim() || value)
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => onCommit(draft.trim() || value)}
      className="text-sm bg-surface-overlay border border-accent rounded px-1 py-0.5 w-full outline-none"
    />
  )
}

// ─── Per-scene row ─────────────────────────────────────────────

function SceneRow({ scene, isActive }: { scene: Scene; isActive: boolean }) {
  const setActive = useSceneStore((s) => s.setActiveScene)
  const deleteScene = useSceneStore((s) => s.deleteScene)
  const renameScene = useSceneStore((s) => s.renameScene)
  const duplicateScene = useSceneStore((s) => s.duplicateScene)
  const reorderScene = useSceneStore((s) => s.reorderScene)

  const [renaming, setRenaming] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div
      onClick={() => setActive(scene.id)}
      className={`relative px-3 py-2 cursor-pointer transition-colors group
        ${isActive
          ? 'bg-accent/10 border-r-2 border-accent text-text-primary'
          : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
        }`}
    >
      <div className="flex items-center gap-2">
        {/* Thumbnail */}
        {scene.previewImage ? (
          <img
            src={scene.previewImage}
            alt=""
            className="w-8 h-8 rounded object-cover shrink-0 border border-border"
          />
        ) : (
          <div className="w-8 h-8 rounded bg-surface-overlay border border-border shrink-0 flex items-center justify-center text-xs text-text-secondary">
            🎬
          </div>
        )}

        {/* Name or rename input */}
        <div className="flex-1 min-w-0">
          {renaming ? (
            <RenameInput
              value={scene.name}
              onCommit={(name) => {
                renameScene(scene.id, name)
                setRenaming(false)
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <span className="text-sm truncate block">{scene.name}</span>
          )}
        </div>

        {/* Context menu button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen(!menuOpen)
          }}
          className="text-xs opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary transition-all px-1"
        >
          ···
        </button>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-2 top-full z-20 mt-1 bg-surface-raised border border-border rounded shadow-lg py-1 min-w-[130px]"
        >
          <MenuButton
            onClick={() => {
              setRenaming(true)
              setMenuOpen(false)
            }}
          >
            Rename
          </MenuButton>
          <MenuButton
            onClick={() => {
              duplicateScene(scene.id)
              setMenuOpen(false)
            }}
          >
            Duplicate
          </MenuButton>
          <MenuButton
            onClick={() => {
              reorderScene(scene.id, 'up')
              setMenuOpen(false)
            }}
          >
            Move up
          </MenuButton>
          <MenuButton
            onClick={() => {
              reorderScene(scene.id, 'down')
              setMenuOpen(false)
            }}
          >
            Move down
          </MenuButton>
          <div className="border-t border-border my-1" />
          <MenuButton
            onClick={() => {
              deleteScene(scene.id)
              setMenuOpen(false)
            }}
            danger
          >
            Delete
          </MenuButton>
        </div>
      )}
    </div>
  )
}

function MenuButton({
  onClick,
  children,
  danger,
}: {
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`block w-full text-left text-xs px-3 py-1.5 transition-colors
        ${danger
          ? 'text-red-400 hover:bg-red-400/10'
          : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
        }`}
    >
      {children}
    </button>
  )
}

// ─── Sidebar ───────────────────────────────────────────────────

export function SceneSidebar() {
  const scenes = useSceneStore((s) => s.scenes)
  const activeSceneId = useSceneStore((s) => s.activeSceneId)
  const createScene = useSceneStore((s) => s.createScene)

  return (
    <div className="w-56 shrink-0 bg-surface-raised border-r border-border flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-sm font-semibold tracking-widest uppercase text-text-secondary">
          Ambiance
        </h1>
        <button
          onClick={() => createScene()}
          className="text-xs px-2 py-1 bg-surface-overlay border border-border rounded hover:border-accent transition-colors"
        >
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {scenes.length === 0 ? (
          <p className="text-text-secondary text-xs text-center px-4 py-8">
            No scenes yet. Create one to get started.
          </p>
        ) : (
          scenes.map((scene) => (
            <SceneRow
              key={scene.id}
              scene={scene}
              isActive={scene.id === activeSceneId}
            />
          ))
        )}
      </div>
    </div>
  )
}
