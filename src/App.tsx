import { useSceneStore } from '@/store/index'
import { SceneSidebar } from '@/components/scene/SceneSidebar'
import { TransportBar } from '@/components/scene/TransportBar'
import { VideoPanel } from '@/components/video/VideoPanel'
import { MusicPanel } from '@/components/music/MusicPanel'
import { SfxPanel } from '@/components/sfx/SfxPanel'

function App() {
  const scene = useSceneStore((s) => s.activeScene())

  return (
    <div className="flex h-screen bg-surface text-text-primary">
      {/* Sidebar — scene list */}
      <SceneSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {scene ? (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-4">
                <VideoPanel />
                <MusicPanel />
                <SfxPanel />
              </div>
            </div>
            <TransportBar />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-light text-text-secondary mb-2">Ambiance</p>
              <p className="text-sm text-text-secondary">
                Create a new scene or select one from the sidebar.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
