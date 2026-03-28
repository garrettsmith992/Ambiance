# Ambiance — Concept & Vision Summary

## The Idea

Ambiance is a locally-run web application designed to let you construct a fully custom, multi-layered sensory atmosphere from your own media. The core inspiration is that feeling you get when you're deep in a game world — the visual environment, the soundtrack, the subtle background noise — and you want to carry that feeling with you without having to actively play the game. You finished Clair Obscur: Expedition 33 and you don't want to replay it, but you want to sit in that world while you work, read, or relax.

Existing tools don't solve this. Spotify plays music. YouTube plays video. Ambient noise apps like Moodist or myNoise offer curated soundscapes but lock you to their library. Wallpaper Engine gives you animated desktop wallpapers with some audio but isn't purpose-built for this kind of intentional layered atmosphere. Nothing on the market lets you take your own video files, your own music, your own sound effects, and compose them into a living, breathing scene that you control completely.

Ambiance fills that gap.

---

## The Layered Architecture

The app is built around three independent, simultaneously-playing audio/video layers. Think of it like a mixing board for atmosphere.

### Layer 1 — Video

The visual backdrop of your scene. This can be:

- **Local video files** — a folder on your machine containing ambiance footage, gameplay recordings, scenic loops, whatever you want. The app reads the folder via the browser's File System Access API (no installation required, just folder permission) and plays them in sequence, shuffled, or looped.
- **YouTube** — a playlist URL or individual video URL fed into the YouTube IFrame API. The video plays embedded in the background, with independent volume control so you can mute the YouTube audio entirely while still using it as a visual source.

The video layer is full-screen and sits behind everything else. Crossfading between clips as they transition gives it a cinematic, breathing quality rather than a jarring hard cut. The audio from the video source is independently controllable — you might want the crackling fireplace sound from your video, or you might want to mute it entirely and let the other layers carry the audio.

### Layer 2 — Music

The musical backbone of the scene. Sources:

- **Local audio files** — a folder of MP3s, FLACs, whatever. Shuffle, loop, skip, volume. Straightforward playlist behavior.
- **Spotify** — via the Spotify Web Playback SDK, which works entirely client-side with OAuth PKCE (no backend server needed). Point it at a playlist URI and it plays through the app. Requires a Spotify Premium account and a free developer app registration (takes five minutes, just needs your localhost added as a redirect URI).
- **YouTube** — a music playlist URL fed into a hidden YouTube embed. Effective if you want to use YouTube Music playlists or specific ambient music compilations someone uploaded.

The music layer has its own volume slider, independent of everything else. You can fade the music down during a tense moment in whatever you're doing and back up when you want it.

### Layer 3 — SFX (Sound Effects / Ambiance Sounds)

This is the layer that makes Ambiance genuinely unique compared to anything else out there. Instead of a single background sound, you get multiple simultaneous SFX slots — think of it like the ambient noise panel in myNoise but entirely driven by your own files and with an additional trick: **interval mode**.

Each SFX slot can be configured in one of two modes:

**Loop mode** — the file plays continuously on repeat at whatever volume you set. This is for persistent environmental sounds: rain, wind, a crackling fire, distant ocean waves, a crowd murmur, HVAC hum, jungle insects. Set it and forget it.

**Interval mode** — the file plays once, then waits a random amount of time within a range you define before playing again. This is the feature that makes a scene feel *alive*. A dragon roar fires somewhere between 3 and 8 minutes, randomly. An owl hoot every 5 to 10 minutes. Distant thunder every 2 to 6 minutes. The randomness tricks your brain — you know it's coming eventually but not when, which is exactly how real environments feel.

You can stack up to 8 SFX slots simultaneously. Each has its own volume slider and mute toggle. The combination of looping environmental texture plus occasional interval punctuation creates a layered soundscape that feels genuinely immersive rather than like a looping MP3.

A practical example of a full scene:

| Layer | Source | Content |
|---|---|---|
| Video | Local folder | Skyrim gameplay footage, shuffled |
| Music | Spotify | Skyrim OST playlist |
| SFX Slot 1 | Local file | heavy_rain.mp3 — Loop, vol 40% |
| SFX Slot 2 | Local file | distant_thunder.mp3 — Interval 2–6 min, vol 60% |
| SFX Slot 3 | Local file | dragon_roar.mp3 — Interval 5–12 min, vol 50% |
| SFX Slot 4 | Local file | wind_howl.mp3 — Loop, vol 25% |

The result is Skyrim's music playing over ambient gameplay footage while a realistic storm plays out around you with occasional dragon activity in the distance. That's something no existing app can produce.

---

## Scenes — Save and Restore Complete Atmospheres

All of the above configuration — which video source, which music source, which SFX slots with which files and settings — gets saved as a **Scene**. A named, reloadable preset.

You build "Skyrim Night" once. Next time you open the app, you click "Skyrim Night" and everything spins up exactly as you left it. Volume levels, interval ranges, shuffle state, Spotify playlist, all of it.

Scenes are stored in localStorage as JSON, so they persist between browser sessions without any backend needed. You can have as many scenes as you want — one per game world, one per mood, one per activity (focus work vs. relaxing vs. sleep).

---

## The .amb File Format — Portable Scene Sharing

This is the longer-term vision that shapes how the app is architected from the start.

A `.amb` file is essentially a renamed `.zip` archive containing everything needed to reconstruct a scene on someone else's machine. The structure:

```
my-skyrim-night.amb
├── scene.json       ← all configuration, links, settings
├── sfx/             ← bundled audio files for SFX slots
│   ├── thunder.mp3
│   ├── dragon_roar.mp3
│   └── rain_heavy.mp3
└── preview.jpg      ← thumbnail image for the scene browser
```

The `scene.json` handles sources by reference rather than by file when the content is large:

```json
{
  "name": "Skyrim Night",
  "version": "1.0",
  "created": "2026-03-26",
  "video": {
    "source": "youtube",
    "playlist": "PLxxxxxxxxxxxxxx"
  },
  "music": {
    "source": "spotify",
    "uri": "spotify:playlist:xxxxxxxxxxxxxxxxx"
  },
  "sfx": [
    {
      "name": "Heavy Rain",
      "file": "sfx/rain_heavy.mp3",
      "mode": "loop",
      "volume": 0.4
    },
    {
      "name": "Dragon Roar",
      "file": "sfx/dragon_roar.mp3",
      "mode": "interval",
      "minMs": 300000,
      "maxMs": 720000,
      "volume": 0.65
    }
  ]
}
```

**Why this format works for sharing:**

- Video and music files are too large to bundle — but YouTube playlist IDs and Spotify URIs are just short strings. Anyone who downloads the `.amb` file gets the same video and music content for free via those platforms.
- SFX files *are* bundled because they're small — a few seconds of audio each, totalling maybe 5–30MB for a whole scene.
- The format is human-readable and hand-editable if needed.
- The `version` field is there from day one so future format changes can be handled gracefully without breaking old files.

**The sharing ecosystem this enables:**

Someone builds a perfect "Cozy Cabin in a Storm" scene, exports it as `cozy-cabin-storm.amb`, and posts it on Reddit or Discord. You download it, drag it into Ambiance, and it loads instantly — rain looping, thunder on intervals, a fireplace crackling, some lo-fi playlist playing over footage of a snowy cabin exterior. Zero configuration on your end.

Down the road, a community site where people upload and browse `.amb` files by mood, game, or theme is a natural extension. The format as designed from the start either enables or prevents that future. Designing it now means it enables it.

**One important UX consideration to build in:**

If someone tries to export a scene that uses local file paths for video or music (e.g., `C:/Videos/skyrim-gameplay.mp4`), the app should warn them clearly: "These local sources won't be accessible on another machine. Consider replacing them with YouTube equivalents before sharing." This is a discoverable, friendly guardrail rather than a silent failure.

---

## Technical Stack

| Concern | Solution |
|---|---|
| Framework | Vite + React + TypeScript |
| Styling | Tailwind CSS |
| State management | Zustand (lightweight, perfect for scene store) |
| Local file access | File System Access API (`showDirectoryPicker()`) |
| Video playback | Native `<video>` element + YouTube IFrame API |
| Audio playback | Native `<audio>` elements + Web Audio API for mixing |
| Music (Spotify) | Spotify Web Playback SDK + OAuth PKCE (no backend) |
| SFX intervals | `setTimeout` with randomized ranges, self-rescheduling |
| Scene persistence | localStorage as JSON |
| .amb export/import | JSZip library for zip read/write in the browser |

No backend server required. No database. No accounts. Runs entirely in the browser pointed at localhost. The only external dependencies are the Spotify SDK (optional), YouTube IFrame API, and JSZip.

---

## What Makes This Different

To be direct about the gap this fills:

- **myNoise / Moodist / Ambient-mixer** — curated libraries only, no local files, no video layer, no music layer. Great for what they do but locked gardens.
- **Wallpaper Engine** — animated desktop wallpapers with some audio, but it's a full desktop engine, Windows only, not purpose-built for ambient atmosphere composition, no music/SFX mixing concept.
- **Plex / Jellyfin / Navidrome** — media servers focused on library management and playback, not atmosphere composition. No layering concept whatsoever.
- **Spotify / YouTube** — single-source players. No layering.

Ambiance's specific combination — local or streaming video + local or streaming music + multiple simultaneous SFX with interval randomization + portable shareable scene files — doesn't exist anywhere as a coherent, purpose-built product. The closest thing is someone with four browser tabs open and a lot of manual effort.

---

## Phased Build Plan

- [x] **Phase 1 — Core shell**
  Vite + React + TypeScript + Tailwind scaffold. Dark cinematic UI shell. Three-panel layout (Video, Music, SFX). Scene sidebar with create/select/delete. Transport bar. Reusable UI primitives (Panel, Slider, IconButton).
  - Core types defined in `src/types/scene.ts` — mirrors `.amb` scene.json schema
  - Zustand store in `src/store/scene-store.ts` — shaped around `Scene` type, auto-persists to localStorage
  - `tags: string[]` on all entities, `containsMusic: boolean` on VideoLayer — baked into schema from day one
  - Path alias `@/` configured for clean imports

- [x] **Phase 2 — Video layer**
  Local folder picker via File System Access API. Shuffle/loop playback. YouTube IFrame integration. Volume + mute. 2-second crossfade between clips. Fullscreen mode with auto-hiding UI overlay.
  - `src/hooks/use-local-video.ts` — folder picker, blob URL management, shuffle, prev/next
  - `src/hooks/use-youtube-player.ts` — YouTube IFrame API singleton loader
  - `src/components/video/VideoPlayer.tsx` — local video with crossfade
  - `src/components/video/YouTubePlayer.tsx` — YouTube embed
  - Fullscreen via Fullscreen API, UI auto-hides after 3s inactivity

- [x] **Phase 3 — Music layer**
  Local audio folder playback. Spotify Web Playback SDK with OAuth PKCE (no backend). YouTube hidden embed for audio-only. Global transport syncs play/pause across sources.
  - `src/hooks/use-local-audio.ts` — audio folder picker, auto-advance, play/pause
  - `src/hooks/use-spotify.ts` — PKCE auth flow, Web Playback SDK, play URIs
  - `src/components/music/YouTubeMusicPlayer.tsx` — hidden YouTube embed
  - Spotify client ID stored in localStorage (`ambiance-spotify-client-id`)
  - TODO: Auto-duck music when video `containsMusic` is true (deferred to polish)

- [x] **Phase 4 — SFX layer**
  Multiple addable/removable SFX slots. Loop mode. Interval mode with min/max sliders. Per-slot volume and mute. Up to 8 simultaneous slots. `setTimeout` with randomized ranges, self-rescheduling.
  - `src/hooks/use-sfx.ts` — file picker (`showOpenFilePicker`), per-slot HTMLAudioElement pool, loop via native `loop`, interval via self-rescheduling `setTimeout` with randomized delays
  - `src/components/sfx/SfxPanel.tsx` — full UI: add slot (file picker), mode toggle (loop/interval), volume slider, interval min/max range sliders (5s–10min), mute, remove
  - Global transport sync: SFX slots start/stop with play/pause, interval scheduling clears on pause

- [ ] **Phase 5 — Scene management**
  Scene browser UI polish. Rename, duplicate, reorder. Preview thumbnails.
  *(Note: Zustand store + localStorage persistence already done in Phase 1.)*

- [ ] **Phase 6 — .amb format**
  Export scene as `.amb` zip (scene.json + bundled SFX + preview image). Import `.amb` file drag-and-drop. Local path warning on export. Uses JSZip (already installed).

- [ ] **Phase 7 (potential) — Tags & Vibe Mode**
  Tagging UI + "Vibe Mode" that dynamically assembles a scene from tagged media across the whole library. Schema already supports it — deferred until real usage validates the need.

---

## Project Structure

```
src/
├── types/          ← scene.json schema + global.d.ts (File System Access, YT IFrame API)
├── store/          ← Zustand store (scene CRUD, layer controls, tags)
├── lib/            ← defaults, localStorage persistence
├── hooks/          ← use-local-video, use-local-audio, use-youtube-player, use-spotify, use-sfx
├── components/
│   ├── ui/         ← Panel, Slider, IconButton
│   ├── video/      ← VideoPanel, VideoPlayer, YouTubePlayer
│   ├── music/      ← MusicPanel, YouTubeMusicPlayer
│   ├── sfx/        ← SfxPanel (add/remove slots, mode toggle, interval sliders)
│   └── scene/      ← SceneSidebar, TransportBar
```

---

## Resuming Work

If starting a new chat, the key files to read first:
1. This file (`CONCEPT.md`) — vision + progress
2. `src/types/scene.ts` — the data model everything is built around
3. `src/store/scene-store.ts` — all app state and actions

---

*Last updated March 28, 2026 — Phases 1–4 complete, Phase 5 (scene management polish) next.*
