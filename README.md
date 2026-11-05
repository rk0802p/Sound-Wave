# SOUNDWAVE — Jamendo-Powered Neo-Brutalist Music Application

A modern, full-stack music discovery and playlist curation application featuring a site-wide **neo-brutalist design system** inspired by [Jellykit](https://jellykit.site/) and an uninterrupted persistent HTML5 audio engine. Built with **Vue 3**, **Vite**, **Pinia**, **Node.js/Express**, **MongoDB**, and **JWT Authentication**.

- **Live Frontend Application:** [https://music-playlist-pp8l.vercel.app](https://music-playlist-pp8l.vercel.app)
- **Live Backend API:** [https://music-playlist-nine.vercel.app](https://music-playlist-nine.vercel.app)
- **API Health Check:** [https://music-playlist-nine.vercel.app/api/test](https://music-playlist-nine.vercel.app/api/test)
- **GitHub Repository:** [github.com/rk0802p/Sound-Wave](https://github.com/rk0802p/Sound-Wave)

---

## ✨ System Architecture & Key Capabilities

### 🎨 1. Jellykit-Inspired Neo-Brutalist Visual Design System
- **Authentic Neo-Brutalist Aesthetic**:
  - Warm cream canvas background (`#F3EFE8`) paired with crisp white card surfaces (`#FFFFFF`).
  - High-contrast, near-black ink borders (`2px solid #111111`) and zero-blur hard offset drop shadows (`3px 3px 0 #111`, `5px 5px 0 #111`, `8px 8px 0 #111`).
  - Bold, punchy display typography using **Inter** (`wght 400..900`) alongside **JetBrains Mono** for micro-labels, badges, timestamps, and breadcrumbs.
  - Saturated category color tokens (`--c-sun`, `--c-blue`, `--c-coral`, `--c-mint`, `--c-pink`, `--c-lavender`, `--c-lime`).
- **Consistent Site-Wide Design**:
  - **Homepage (`/`)**: Collapsible 300px sidebar with brand grid, command-line search box, curated hero banners, diagonal hatched featured spotlight, and 4-column catalog track cards.
  - **Public Explorer (`/explore`)**: Community mixtape cards with fork counters, provider badges, and filter chips.
  - **Mixtape Preview (`/playlist/:id`)**: High-contrast mixtape cover art, tracklist table, track deletion, playlist deletion, and fork actions.
  - **Search Discovery (`/search`)**: Real-time Jamendo search with category chips and neo-brutalist track cards.
  - **Auth (`/login` & `/signup`)**: Minimalist bordered cards with monospace form fields and high-contrast primary CTA buttons.

---

### 🎵 2. Unified Persistent Audio Engine & Jamendo Streaming
- **Jamendo as Primary Music Provider**:
  - Official Jamendo API v3.0 direct stream integration (`audioformat=mp32`) delivering high-fidelity audio streams directly to the browser.
  - Complete Creative Commons license verification (`CC BY`, `CC BY-NC-SA`, `CC BY-ND`, `CC0`) with explicit creator attribution and direct links back to original Jamendo track pages (`shareurl`).
  - Strict compliance with licensing and copyright policies: zero local audio file caching or unauthorized storage.
- **Persistent Bottom Player Bar (88px)**:
  - Global playback state managed by Pinia (`player.js`). Playback never stops or reloads when navigating between routes, searching tracks, or managing playlists.
  - Full scrubbable timeline, duration timestamps, volume memory slider, repeat toggle, shuffle toggle, and Up Next Queue drawer.
  - Fully accessible sidebar controls with dynamic viewport bottom clearance.

---

### 📂 3. Playlist Management & Social Discovery
- **Granular Playlist Operations**:
  - Create new playlists with custom names and descriptions.
  - Add tracks directly from search or catalog discovery.
  - Remove songs individually from active playlists.
  - Permanently delete playlists with cascade cleanup.
- **Community Mixtape Forking (`POST /api/playlists/:id/fork`)**:
  - Clone any public community mixtape directly into your private library with one click, preserving original Jamendo track metadata and CC licenses.
  - Real-time fork counter tracking.

---

### 🛡️ 4. Security Hardening & Observability
- **Strict Ownership Enforcement**: Users can only modify or delete playlists they own. Cross-user attempts return `403 Forbidden`.
- **Authoritative Provider Policy Gatekeeping**: Backend test matrix strictly enforces permitted audio sources, rejecting unverified or proprietary platforms from audio registration.
- **Structured Observability**: Request correlation via `x-request-id`, sensitive credential redaction, and health telemetry (`/api/test`).
- **10/10 Test Suites Passing**: 183 automated backend test assertions validating playback security, ownership, and error resilience.

---

## 🛠️ Project Structure

```
├── music-playlist-frontend-vue/    # Vue 3 + Vite SPA Frontend
│   ├── src/
│   │   ├── assets/styles/          # tokens.css, global.css, base.css
│   │   ├── components/             # Reusable UI, Layout, Player, Modals
│   │   ├── stores/                 # Pinia stores (player, playlist, auth, toast)
│   │   ├── views/                  # HomeView, ExploreView, SearchView, PlaylistPreviewView, Auth
│   │   └── router/                 # Vue Router configuration
├── server/                         # Node.js + Express Backend
│   ├── controllers/                # Playlist, Search, Auth controllers
│   ├── models/                     # Mongoose models (User, Playlist)
│   ├── providers/                  # JamendoProvider & Authoritative Provider Registry
│   ├── routes/                     # REST API route definitions
│   └── tests/                      # Jest test suites (183 tests)
├── docs/                           # Architecture, audit reports, and test matrices
└── vercel.json                     # Serverless deployment configuration
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally or a MongoDB Atlas URI

### 1. Backend Server Setup
```bash
cd server
npm install
cp .env.example .env # Configure PORT and MONGO_URI
npm run dev
```

### 2. Frontend Setup
```bash
cd music-playlist-frontend-vue
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Testing

### Backend Test Suite
```bash
npm test --prefix "server"
```
Runs 183 test assertions covering provider policy, authentication, playlist operations, and API security.

### Frontend Production Build
```bash
npm run build --prefix "music-playlist-frontend-vue"
```

---

## 📚 Documentation & Audit Reports

Comprehensive verification reports, architecture documentation, and test matrices are maintained in the [`docs/`](./docs) directory:
- [`docs/JAMENDO_PRODUCTION_VERIFICATION.md`](./docs/JAMENDO_PRODUCTION_VERIFICATION.md)
- [`docs/FINAL_PLAYBACK_AND_PRODUCTION_VERIFICATION.md`](./docs/FINAL_PLAYBACK_AND_PRODUCTION_VERIFICATION.md)
- [`docs/PLAYBACK_LOGIC_AUDIT_AND_VERIFICATION.md`](./docs/PLAYBACK_LOGIC_AUDIT_AND_VERIFICATION.md)
- [`docs/FINAL_PUSH_READINESS_REVIEW.md`](./docs/FINAL_PUSH_READINESS_REVIEW.md)
- [`docs/FINAL_PRODUCTION_POLICY_AND_LICENSE_AUDIT.md`](./docs/FINAL_PRODUCTION_POLICY_AND_LICENSE_AUDIT.md)

---

## 🎨 Visual Reference & Credits

The frontend design system and neo-brutalist visual language across SOUNDWAVE are inspired by:
- **Jellykit**: [https://jellykit.site/](https://jellykit.site/)

---

## 📄 License
This project is licensed under the **ISC License**.
