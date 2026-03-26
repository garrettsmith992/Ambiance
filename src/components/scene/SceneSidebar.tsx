import { useSceneStore } from '@/store/index'

export function SceneSidebar() {
  const scenes = useSceneStore((s) => s.scenes)
  const activeSceneId = useSceneStore((s) => s.activeSceneId)
  const setActive = useSceneStore((s) => s.setActiveScene)
  const createScene = useSceneStore((s) => s.createScene)
  const deleteScene = useSceneStore((s) => s.deleteScene)

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
            <div
              key={scene.id}
              onClick={() => setActive(scene.id)}
              className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors group
                ${scene.id === activeSceneId
                  ? 'bg-accent/10 border-r-2 border-accent text-text-primary'
                  : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
                }`}
            >
              <span className="text-sm truncate">{scene.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteScene(scene.id)
                }}
                className="text-xs opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-400 transition-all"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
