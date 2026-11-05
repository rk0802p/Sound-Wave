# SOUNDWAVE – Jamendo‑Powered Neo‑Brutalist Music App

**A full‑stack music‑discovery and playlist‑curation portfolio project built with Vue 3, Pinia, Node / Express, MongoDB, and the Jamendo API.** The UI follows a neo‑brutalist design inspired by **Jellykit**.

---

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

### Project Overview
SoundWave is a personal‑portfolio web app that lets users **discover**, **play**, and **organise** Creative‑Commons‑licensed tracks from **Jamendo**.
- Users can browse curated genres, create and edit their own playlists, and fork community mixtapes.
- A persistent HTML5 audio player lives at the bottom of the screen, offering timeline scrubbing, volume memory, shuffle/repeat and a queue.
- Authentication (JWT) protects playlist ownership and enables a simple “my library” view.
- The UI deliberately adopts a **neo‑brutalist** aesthetic (bold borders, high‑contrast colours, blocky layout) taken from the Jellykit reference site.

The project showcases end‑to‑end development skills: front‑end Vue 3 architecture, Pinia state management, back‑end Express APIs, MongoDB modelling, secure JWT auth, automated testing, and a production CI/CD pipeline on Vercel.

---

### Live Demo
- **Frontend:** https://music-playlist-pp8l.vercel.app
- **Backend API:** https://music-playlist-nine.vercel.app
- **API health check:** https://music-playlist-nine.vercel.app/api/test

> **Note:** The live deployment reflects the latest committed code. Running the repository locally yields the same behaviour.

---

## Features (Implemented)

| Category | Implemented Features |
|----------|---------------------|
| **Playback** | • HTML5 `<audio>` element with persistent player<br>• Play / pause / next / previous<br>• Scrubbable timeline<br>• Volume memory across sessions<br>• Shuffle & repeat modes<br>• Queue handling (added tracks appear after the current track) |
| **Discovery & Browsing** | • Home page shows featured tracks, genre sections, and a quick‑search bar<br>• “Explore” view lists tracks by mood/genre<br>• Search endpoint that queries Jamendo for titles / artists |
| **Playlist Management** | • CRUD operations (create, read, update, delete)<br>• Add / remove songs from a playlist<br>• Fork community playlists into a personal library |
| **Authentication** | • JWT‑based sign‑up, login, and protected routes<br>• Ownership enforcement for playlist edits |
| **UI / UX** | • Neo‑brutalist sidebar with collapsible sections<br>• Fixed‑height audio‑settings panel (bottom‑left) – clipping issue resolved<br>• Responsive layout for desktop & tablet widths |
| **Security / Hardening** | • Strict provider whitelist – only Jamendo streams are allowed (HTTPS, correct hostname, no user‑info, port 443)<br>• Defensive URL validation in `DirectAudioProvider` and `detector.js`<br>• Fail‑closed handling for unavailable or non‑Jamendo tracks |
| **Testing** | • 183 backend Jest tests covering providers, auth, playlist logic, and policy enforcement – all passing<br>• Independent playback‑verification script (`scratch/independent_verify_all_claims.js`) that checks `readyState`, time progression, and source URLs |
| **Build / Deploy** | • Vite‑powered front‑end build (`npm run build`)<br>• Production deployment via Vercel (automatic on `git push`) |

*Features that are **partially** implemented*  
- **Queue persistence across browser refresh** – the queue lives only in memory; can be persisted with `localStorage`.
- **Favorites / “liked” tracks** – UI shows a heart icon but no backend storage yet.

---

## Music Sources & Playback

| Aspect | Details |
|--------|---------|
| **Provider** | **Jamendo** is the **sole** music source. All tracks are Creative‑Commons‑licensed and streamed from Jamendo CDN sub‑domains (`*.jamendo.com`). |
| **Track Model** | Stored in MongoDB with fields like `source: { provider, externalId, url }`. The `provider` must be `"jamendo"`; the URL is validated before playback. |
| **Playback Flow** | 1. UI dispatches `playerStore.playTrack(track, …)`<br>2. `player.js` checks `track.isPlayable` and `provider === 'jamendo'`.<br>3. If a direct, validated URL exists, `DirectAudioProvider` assigns it to a hidden `<audio>` element and calls `.play()`.<br>4. Visual feedback is provided by `AudioVisualizer.vue` (simulated graph, no WebAudio processing). |
| **Restrictions** | • Only HTTPS Jamendo URLs are accepted.<br>• Any non‑Jamendo or malformed URL is rejected, and playback is marked *unavailable*.<br>• No API keys are required for public Jamendo streaming; the app respects Jamendo’s rate‑limits. |
| **Future Expansion** | The architecture already includes a provider‑registry (`src/services/providers/index.js`) that could host additional providers, but they are **currently blocked** by the provider‑policy config. |

---

## Future Roadmap

| Planned Feature | Description | Status |
|-----------------|-------------|--------|
| **Multi‑Source Music Support** | Integrate additional legal music libraries (e.g., Free Music Archive, Internet Archive) alongside Jamendo. Extend `ProviderRegistry` and `detector.js` to recognise new URL patterns, and expose a unified playback interface. | 📅 Planned – no code started |
| **Play‑Along / Practice Mode** | Add UI controls (loop start/end markers, playback speed slider) so users can practice with a track. Utilises the native `audio.playbackRate` and `currentTime` APIs. | 📅 Planned |
| **Queue Persistence** | Store the current playback queue in `localStorage` and re‑hydrate the Pinia store on app start. | 📅 Planned |
| **Public Playlist Sharing** | Generate a shareable URL (slug) for a playlist that anyone can view/read without authentication. Add a read‑only endpoint and copy‑to‑clipboard button. | 📅 Planned |
| **Keyboard Shortcuts** | Global shortcuts: Space → play/pause, Left/Right → seek, `S` → shuffle toggle, `R` → repeat toggle. | 📅 Planned |
| **Accessibility Enhancements** | Add visible focus ring, ARIA labels for all interactive elements, and colour‑contrast checks (WCAG AA). | 📅 Planned |
| **Enhanced Mobile Experience** | Optimise sidebar collapse, enlarge touch targets, and add a swipe‑to‑open drawer. | 📅 Planned |
| **Metadata Enrichment** | Pull album artwork, release year, and genre tags from Jamendo metadata and display them in the player and playlist cards. | 📅 Planned |

> **All items are future work only; none are currently implemented.**

---

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
| **Testing** | **Jest** (backend) | Unit & integration tests (183 passing) |
| **Deployment** | **Vercel** (frontend + backend) | Serverless functions, automatic CI on push |
| **Node Version** | ≥ 18 (as specified in `.nvmrc`) | Required for ES‑module support |
| **Package Managers** | **npm** (lockfile `package-lock.json`) | Dependency resolution |

---

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
4. **Provider Policy** – `src/services/providers/detector.js` enforces the **Jamendo‑only** whitelist; all other URLs are rejected early.
5. **Security** – JWT middleware protects private routes; URL sanitisation occurs in `playbackDiagnostics.js` before logging.

---

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

## Testing
```bash
# Backend unit / integration tests
npm test --prefix server
```
- **183 tests** across 10 suites (providers, auth, policy enforcement, playlist logic, etc.) – all passing (exit code 0).
- For a quick sanity check of the front‑end playback logic, see the script `scratch/independent_verify_all_claims.js` (runs a headless Playwright session and verifies time progression for every track).

---

## Current Limitations
| Limitation | Impact | Possible Fix |
|------------|--------|--------------|
| **Single music provider** – only Jamendo streams are allowed. | Users cannot search beyond Jamendo’s catalog. | Add additional providers (see roadmap). |
| **Queue not persisted** across page reloads. | Queue resets when the browser is refreshed. | Store queue in `localStorage` and hydrate on start. |
| **No public playlist sharing** – playlists are only viewable by the owner when logged in. | Limited discoverability of user‑generated content. | Implement a slug‑based read‑only endpoint. |
| **Accessibility** – focus indicators and screen‑reader labels are minimal. | May not meet WCAG AA standards. | Add ARIA attributes, ensure colour contrast, implement focus rings. |
| **Mobile UX** – sidebar is desktop‑focused, touch targets are small. | Sub‑optimal experience on phones. | Add responsive drawer and larger controls. |
| **Play‑Along / speed control** – not available yet. | Users cannot practice at slower tempos. | Add UI controls that modify `audio.playbackRate`. |

---

## License & Attribution
- **Source code** – **ISC** license (see `LICENSE` file).
- **Music content** – All tracks are streamed from **Jamendo** under Creative Commons licences (CC BY, CC BY‑NC, CC BY‑NC‑SA, CC BY‑NC‑ND). The app displays the appropriate attribution badge for each track, linking directly to the Jamendo track page and the relevant CC deed.
- **Design inspiration** – UI design is heavily inspired by the **Jellykit** website (https://jellykit.site/). No proprietary assets from Jellykit are used; all visual elements are custom‑crafted.

---
