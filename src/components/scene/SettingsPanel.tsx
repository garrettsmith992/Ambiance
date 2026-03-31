import { useState } from 'react'
import { Panel } from '@/components/ui/index'

const SPOTIFY_CLIENT_ID_KEY = 'ambiance-spotify-client-id'

interface SettingsPanelProps {
  spotify: {
    isAuthenticated: boolean
    isReady: boolean
    authenticate: () => void
    currentTrack: string | null
  }
}

export function SettingsPanel({ spotify }: SettingsPanelProps) {
  const [clientId, setClientId] = useState(
    () => localStorage.getItem(SPOTIFY_CLIENT_ID_KEY) ?? '',
  )
  const [saved, setSaved] = useState(true)

  const handleSaveClientId = () => {
    localStorage.setItem(SPOTIFY_CLIENT_ID_KEY, clientId.trim())
    setSaved(true)
  }

  const handleDisconnectSpotify = () => {
    localStorage.removeItem('ambiance-spotify-token')
    localStorage.removeItem('ambiance-spotify-token-expiry')
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      <Panel title="Spotify">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs text-text-secondary">
              Client ID
              <span className="text-text-secondary/60 ml-1">
                (from developer.spotify.com/dashboard)
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={clientId}
                onChange={(e) => { setClientId(e.target.value); setSaved(false) }}
                placeholder="Your Spotify Client ID"
                className="flex-1 px-3 py-1.5 text-sm bg-surface border border-border rounded-md focus:border-accent outline-none text-text-primary placeholder:text-text-secondary font-mono"
              />
              {!saved && (
                <button
                  onClick={handleSaveClientId}
                  className="px-3 py-1.5 text-sm bg-accent text-white rounded-md hover:bg-accent-hover transition-colors"
                >
                  Save
                </button>
              )}
            </div>
            {saved && clientId && (
              <p className="text-xs text-green-400">Client ID saved</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-text-secondary">Connection</label>
            {spotify.isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-sm text-green-400">
                    Connected{spotify.isReady ? ' (player ready)' : ' (initializing...)'}
                  </span>
                </div>
                {spotify.currentTrack && (
                  <p className="text-xs text-text-secondary truncate">Now playing: {spotify.currentTrack}</p>
                )}
                <button
                  onClick={handleDisconnectSpotify}
                  className="px-3 py-1.5 text-sm text-red-400 border border-red-400/30 rounded-md hover:bg-red-400/10 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-text-secondary" />
                  <span className="text-sm text-text-secondary">Not connected</span>
                </div>
                {clientId ? (
                  <button
                    onClick={spotify.authenticate}
                    className="px-3 py-1.5 text-sm bg-[#1DB954] text-white rounded-md hover:bg-[#1ed760] transition-colors"
                  >
                    Connect Spotify
                  </button>
                ) : (
                  <p className="text-xs text-text-secondary">
                    Enter a Client ID above to enable Spotify. Requires Spotify Premium.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="YouTube">
        <div className="space-y-2">
          <p className="text-sm text-text-secondary">
            YouTube works automatically — no setup needed.
          </p>
          <p className="text-sm text-text-secondary">
            If you have YouTube Premium, embedded videos will be ad-free automatically based on your browser login.
          </p>
        </div>
      </Panel>

      <Panel title="About">
        <div className="space-y-2">
          <p className="text-sm text-text-secondary">
            Ambiance — multi-layered atmosphere composer.
          </p>
          <p className="text-xs text-text-secondary">
            Video + Music + SFX, layered together, saved as portable .amb scenes.
          </p>
        </div>
      </Panel>
    </div>
  )
}
