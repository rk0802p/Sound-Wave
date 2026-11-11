# SOUNDWAVE – Jamendo‑Powered Neo‑Brutalist Music App

**A full‑stack music‑discovery and playlist‑curation portfolio project built with Vue 3, Pinia, Node / Express, MongoDB, and the Jamendo API.** The UI follows a neo‑brutalist design inspired by **Jellykit**.

---

<!-- Updated on 2026-11-11 -->
## Table of Contents
1. [Project Overview](#project-overview)
2. [Live Demo](#live-demo)
3. [Features (Implemented)](#features-implemented)
4. [Music Sources & Playback](#music-sources--playback)
5. [Future Roadmap](#future-roadmap)
6. [Technology Stack](#technology-stack)
7. [Architecture Overview](#architecture-overview)
8. [Installation & Development](#installation--development)
9. [Running the Application](#running-the-application)
10. [Testing](#testing)
11. [Current Limitations](#current-limitations)
12. [License & Attribution](#license--attribution)

---

<!-- Updated on 2026-11-11 -->
### Project Overview
SoundWave is a personal‑portfolio web app that lets users **discover**, **play**, and **organise** Creative‑Commons‑licensed tracks from **Jamendo**.
- Users can browse curated genres, create and edit their own playlists, and fork community mixtapes.
- A persistent HTML5 audio player lives at the bottom of the screen, offering timeline scrubbing, volume memory, shuffle/repeat and a queue.
- Authentication (JWT) protects playlist ownership and enables a simple “my library” view.
- The UI deliberately adopts a **neo‑brutalist** aesthetic (bold borders, high‑contrast colours, blocky layout) taken from the Jellykit reference site.

The project showcases end‑to‑end development skills: front‑end Vue 3 architecture, Pinia state management, back‑end Express APIs, MongoDB modelling, secure JWT auth, automated testing, and a production CI/CD pipeline on Vercel.

---

<!-- Updated on 2026-11-11 -->
### Live Demo
- **Frontend:** https://music-playlist-pp8l.vercel.app
- **Backend API:** https://music-playlist-nine.vercel.app
- **API health check:** https://music-playlist-nine.vercel.app/api/test

> **Note:** The live deployment reflects the latest committed code. Running the repository locally yields the same behaviour.

---

<!-- Updated on 2026-11-11 -->
## Features (Implemented)

| Category | Implemented Features |
|----------|---------------------|
| **Playback & Practice Mode** | • HTML5 `<audio>` element with persistent Floating Player Dock<br>• Play / pause / next / previous / scrubbable timeline<br>• **Play-Along / Practice Mode**: Loop A-B markers, seamless passage looping, and visual scrubber flags<br>• **Playback Speed Controls**: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x using native `audio.playbackRate`<br>• Volume memory across sessions & mute toggle<br>• Shuffle & repeat modes ('off' \| 'all' \| 'one')<br>• Queue management (Play Next, Add to Queue, Remove from Queue) |
| **Global Keyboard Shortcuts** | • `Space` → Play / Pause (guarded when typing)<br>• `←` / `→` → Seek back 5s / forward 5s<br>• `↑` / `↓` → Volume up / down 5%<br>• `M` → Toggle Mute / Unmute<br>• `S` → Toggle Shuffle<br>• `R` → Cycle Repeat mode<br>• `?` or `Shift+/` → Open Neo-Brutalist Keyboard Shortcuts Guide Modal |
| **State Persistence** | • Full playback and queue persistence via `localStorage` (`soundwave_playback_state_v1`)<br>• Restores active track, queue, volume, repeat, shuffle, and playback speed seamlessly on refresh |
| **Multi-Source Audio** | • **Jamendo**: Full-length Creative Commons authorized direct streaming<br>• **Deezer**: Verified 30s preview streaming (`*.dzcdn.net`) with `30s PREVIEW` badge and provider pill<br>• **Apple Music / iTunes**: Verified 30s preview streaming (`audio-ssl.itunes.apple.com`) with `30s PREVIEW` badge and provider pill |
| **Discovery & Browsing** | • Home page shows featured tracks, genre sections, and quick-search<br>• Explore view lists public mixtapes with pagination<br>• Real-time audio search querying Jamendo catalog |
| **Playlist Management** | • Full CRUD operations (create, read, inline rename, update, delete with confirmation modal)<br>• Add songs via Drawer (Search, Liked, or Link tabs with batch add up to 50 songs)<br>• Insert songs at specific position indices with 5-second Undo toast on track remove<br>• Fork community playlists into personal library with guest login interception<br>• Duplicate playlist endpoint & UI action |
| **Authentication** | • JWT-based sign-up, login, and protected routes with ownership enforcement |
| **UI / UX** | • Jellykit-inspired neo-brutalist aesthetic with high-contrast borders and sharp drop shadows<br>• Collapsible neo-brutalist sidebar navigation<br>• Floating Player Dock with interactive Practice popover |
| **Security & Observability** | • Strict CDN whitelist (`*.jamendo.com`, `*.dzcdn.net`, `audio-ssl.itunes.apple.com`)<br>• Fail-closed handling for unavailable or unauthorized domains<br>• Request correlation ID (`x-request-id`), structured logging, and sensitive field redaction |
| **Testing** | • **208 backend Jest tests** covering providers, auth, playlist logic, security, and observability (all passing)<br>• **33 frontend Vitest unit tests** covering playlist store, player store, loop markers, speed, and persistence (all passing)<br>• **32 Playwright E2E browser assertions** verifying end-to-end user journeys and capturing screenshot evidence |
| **Build / Deploy** | • Vite-powered front-end build (`npm run build`) with 0 errors<br>• Production deployment via Vercel |

---

<!-- Updated on 2026-11-11 -->
## Music Sources & Playback

| Aspect | Details |
|--------|---------|
| **Supported Sources** | **Jamendo** (full CC streams), **Deezer** (30s preview streams via `*.dzcdn.net`), and **Apple Music / iTunes** (30s preview streams via `audio-ssl.itunes.apple.com`). |
| **Track Model** | Stored in MongoDB with fields like `source: { provider, externalId, url }`, `isPreview: Boolean`, and `previewDurationMs: Number`. |
| **Playback Flow** | 1. UI dispatches `playerStore.playTrack(track, …)`<br>2. `player.js` checks `track.isPlayable` and verifies authorized provider (`jamendo`, `deezer`, `itunes`, `apple`).<br>3. `DirectAudioProvider` validates URL domain against authorized CDN allowlist, sets playback rate, and starts streaming.<br>4. Seamless A-B loop monitors `currentTime` and cycles back to Marker A when Marker B is reached.<br>5. State is continuously saved to `soundwave_playback_state_v1` in `localStorage`. |
| **Restrictions** | • Only HTTPS authorized CDN URLs are accepted.<br>• Non-authorized or arbitrary domains are rejected fail-closed with 403 errors.<br>• Preview streams show explicit `30s PREVIEW` badge and provider pill in the dock. |

---

<!-- Updated on 2026-11-11 -->
## Future Roadmap

| Feature | Description | Status |
|---------|-------------|--------|
| **Multi-Source Preview Playback** | Verified Deezer and iTunes 30s preview streaming alongside Jamendo. | ✅ **Implemented & Verified** |
| **Play-Along / Practice Mode** | Loop A-B markers, seamless looping, playback speed controls (0.5x–2x). | ✅ **Implemented & Verified** |
| **Global Keyboard Shortcuts** | Space, Arrow navigation, Mute, Shuffle, Repeat, and Shortcut Guide modal. | ✅ **Implemented & Verified** |
| **Queue & State Persistence** | Persistent playback queue, volume, repeat, and speed in `localStorage`. | ✅ **Implemented & Verified** |
| **Playlist Enhancements** | Batch add, inline rename, position insert, undo toast, duplicate, fork. | ✅ **Implemented & Verified** |
| **Social Collaborative Playlists** | Multi-user shared playlist editing and real-time voting on next track. | 📅 Planned |
| **Advanced Equalizer (EQ)** | 5-band Web Audio API parametric equalizer with sound preset curves. | 📅 Planned |
| **LMS / Audio Stem Extraction** | Split audio into vocal, bass, and drum stems for enhanced practice mode. | 📅 Planned |

---

<!-- Updated on 2026-11-11 -->
## Technology Stack

| Layer | Technology | Role |
|-------|------------|------|
| **Frontend Framework** | **Vue 3** (Composition API) | Component‑based UI, reactivity |
| **State Management** | **Pinia** | Global stores (`auth`, `player`, `playlist`, `toast`) |
| **Build Tool** | **Vite** | Fast dev server, production bundling |
| **Styling** | CSS modules + custom **neo‑brutalist token system** (`src/assets/styles/tokens.css`) | Consistent colors, borders, spacing |
| **Backend Framework** | **Node / Express** | REST API, auth middleware, playlist endpoints |
| **Database** | **MongoDB** (via Mongoose) | Stores users, playlists, track metadata |
| **Authentication** | **JWT** (signed with `process.env.JWT_SECRET`) | Stateless session handling |
| **Music Provider** | **Jamendo API** (public, no server‑side key required for streaming) | Supplies track listings and streaming URLs |
| **Testing** | **Jest** (backend) | Unit & integration tests (208 passing) |
| **Deployment** | **Vercel** (frontend + backend) | Serverless functions, automatic CI on push |
| **Node Version** | ≥ 18 (as specified in `.nvmrc`) | Required for ES‑module support |
| **Package Managers** | **npm** (lockfile `package-lock.json`) | Dependency resolution |

---

<!-- Updated on 2026-11-11 -->
## Architecture Overview

```
repo/
├─ .git/                     # Git metadata
├─ .vercel/                  # Vercel configuration
├─ docs/                     # Audit & verification reports
├─ server/                   # Express backend
│   ├─ src/
│   │   ├─ config/           # env & provider policy
│   │   ├─ controllers/      # route handlers (auth, playlists, providers)
│   │   ├─ middleware/       # JWT validation, error handling
│   │   ├─ models/           # Mongoose schemas (User, Playlist, Track)
│   │   └─ routes/           # Express routers
│   └─ test/                 # Jest test suite
├─ music-playlist-frontend-vue/  # Vue front‑end
│   ├─ public/
│   ├─ src/
│   │   ├─ api/               # thin wrappers around backend endpoints
│   │   ├─ assets/            # logos, global CSS, design tokens
│   │   ├─ components/
│   │   │   ├─ common/        # UI primitives (Button, Input, Modal, Toast)
│   │   │   ├─ layout/        # `AppLayout.vue` (sidebar, header, player dock)
│   │   │   ├─ player/        # `FloatingPlayerDock.vue`, `AudioVisualizer.vue`
│   │   │   ├─ playlists/     # Modals for create / edit / add‑song
│   │   │   └─ featured/      # Hero & category sections
│   │   ├─ data/              # Demo track lists, featured song arrays
│   │   ├─ router/            # Vue‑router routes (`HomeView`, `ExploreView`, …)
│   │   ├─ services/
│   │   │   ├─ audioEngine.js # low‑level audio control (play, pause, seek)
│   │   │   └─ providers/
│   │   │       ├─ detector.js          # URL validation logic
│   │   │       ├─ DirectAudioProvider.js # Direct stream playback
│   │   │       └─ index.js               # Exported provider map
│   │   ├─ stores/
│   │   │   ├─ auth.js         # JWT handling, user profile
│   │   │   ├─ player.js       # Playback state, queue, controls
│   │   │   ├─ playlist.js     # CRUD actions, playlist selection
│   │   │   └─ toast.js        # Global notifications
│   │   ├─ utils/
│   │   │   ├─ playbackDiagnostics.js # Sanitised logging for playback attempts
│   │   │   └─ featuredSongs.js       # Helper for featured‑section data
│   │   └─ views/
│   │       ├─ HomeView.vue            # Home page with hero & quick actions
│   │       ├─ ExploreView.vue         # Mood‑based browsing
│   │       ├─ PlaylistPreviewView.vue # Playlist detail + edit controls
│   │       ├─ DashboardView.vue       # User’s library
│   │       └─ … (Login, Signup, etc.)
│   ├─ vite.config.js
│   └─ package.json
├─ .env.example                # Sample environment variables
└─ README.md                   # <‑ this file
```

**Key Interactions**
1. **Frontend → Backend** – API calls (`/api/auth`, `/api/playlists`, `/api/search`) are wrapped in `src/api/*.js`.
2. **State Management** – Pinia stores hold auth tokens, playlist data, and playback state.
3. **Playback** – `playerStore` validates a track, then hands the URL to `DirectAudioProvider`, which sets `audio.src` on a hidden `<audio>` element.
4. **Provider Policy** – `src/services/providers/detector.js` enforces an allow‑list of approved providers (Jamendo, Deezer preview, Apple Music preview); URLs from other domains are rejected early.
5. **Security** – JWT middleware protects private routes; URL sanitisation occurs in `playbackDiagnostics.js` before logging.

---

<!-- Updated on 2026-11-11 -->
## Installation & Development

### Prerequisites
| Tool | Minimum Version |
|------|-----------------|
| **Node.js** | 18.x (or later) |
| **npm** | 9.x (comes with Node) |
| **MongoDB** | Local or Atlas instance (connection string in `.env`) |
| **Git** | Any recent version |

### 1. Clone the repository
```bash
git clone https://github.com/rk0802p/Sound-Wave.git
cd Sound-Wave
```

### 2. Set up environment variables
```bash
# Backend
cd server
cp .env.example .env   # edit as needed
# Example keys (replace with your own values):
# MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/soundwave
# JWT_SECRET=your‑random‑secret
# PORT=5000
```
> The frontend does **not** need any secret keys; it only talks to the backend.

### 3. Install dependencies
```bash
# Backend
npm install   # runs in server/

# Frontend
cd ../music-playlist-frontend-vue
npm install
```

### 4. Run development servers
```bash
# Backend API (http://localhost:5000)
cd ../server
npm run dev          # nodemon watches files

# Frontend (http://localhost:5173)
cd ../music-playlist-frontend-vue
npm run dev
```
The frontend proxies API requests to `http://localhost:5000` as defined in `vite.config.js`.

### 5. Build for production
```bash
npm run build --prefix music-playlist-frontend-vue
```
The static files are emitted to `music-playlist-frontend-vue/dist/` and can be served by any static host (Vercel, Netlify, etc.).

---

<!-- Updated on 2026-11-11 -->
## Running the Application
1. Open `http://localhost:5173` in a browser.
2. Sign up / log in using the forms (JWT stored in `localStorage`).
3. Browse the home page – featured tracks appear in large cards; click a card to start playback.
4. Control playback using the bottom‑right player dock (play/pause, next/prev, shuffle, repeat, volume slider).
5. Create a playlist via the “+ New Playlist” button in the sidebar, then drag or add songs from any view.
6. Edit / delete playlists using the three‑dot menu on each card.
7. Fork a community mixtape by clicking the fork icon on a playlist card – the new copy appears under “My Playlists”.

All interactions are reflected instantly thanks to Pinia’s reactivity and the persistent audio element.

---

<!-- Updated on 2026-11-11 -->
## Testing
```bash
# Backend unit / integration tests
npm test --prefix server
```
- **208 backend Jest tests** and **33 frontend Vitest tests** (plus **32 Playwright E2E assertions**) – all passing (exit code 0).
- For a quick sanity check of the front‑end playback logic, see the script `scratch/independent_verify_all_claims.js` (runs a headless Playwright session and verifies time progression for every track).

---

<!-- Updated on 2026-11-11 -->
## Current Limitations

| Limitation | Impact |
|------------|--------|
| **30-second preview cap on Deezer & Apple Music / iTunes** | Only Jamendo Creative Commons tracks stream in full; Deezer and Apple Music / iTunes tracks are limited to 30-second previews (`30s PREVIEW`). |
| **Strict authorized CDN domain allowlist** | Arbitrary external MP3 URLs and unauthorized streaming hosts are rejected fail-closed (`403` / playback policy error) to preserve licensing compliance. |
| **Browser-local favorites, queue & playback state** | Liked tracks and active queue/player state are stored in `localStorage`, so they persist across reloads on the same browser but do not sync across devices. |
| **Jamendo credentials required for live online search** | Live `/api/search` discovery depends on backend Jamendo API configuration; unconfigured environments cannot fetch live online search results. |
| **Single-owner playlist write model** | Only the playlist creator can edit or delete a playlist (`404`/`401` on unauthorized access); real-time multi-user collaborative editing is not yet available. |
| **Native HTML5 `<audio>` playback without DSP effects** | A–B Practice looping and speed controls (`0.5×–2×`) work natively, while a 5-band parametric equalizer (EQ) and vocal/instrument stem separation are not yet implemented. |
| **Online-only streaming architecture** | Playback requires an active network connection to authorized CDNs; offline downloads and background caching are unsupported. |

---

<!-- Updated on 2026-11-11 -->
## License & Attribution
- **Source code** – **ISC** license (see `LICENSE` file).
- **Music content** – All tracks are streamed from **Jamendo** under Creative Commons licences (CC BY, CC BY‑NC, CC BY‑NC‑SA, CC BY‑NC‑ND). The app displays the appropriate attribution badge for each track, linking directly to the Jamendo track page and the relevant CC deed.
- **Design inspiration** – UI design is heavily inspired by the **Jellykit** website (https://jellykit.site/). No proprietary assets from Jellykit are used; all visual elements are custom‑crafted.

---

<!-- Updated on 2026-11-11 -->