# SOUNDWAVE — Modern Multi-Source Music Playlist & Audio Workstation

A production-grade, full-stack music discovery and playlist application with a persistent unified audio player engine built with **Vue 3**, **Pinia**, **Node.js/Express**, **MongoDB**, and **JWT Authentication**.

- **Live Frontend Application:** [https://music-playlist-pp8l.vercel.app](https://music-playlist-pp8l.vercel.app)
- **Live Backend API:** [https://music-playlist-nine.vercel.app](https://music-playlist-nine.vercel.app)
- **API Health Check:** [https://music-playlist-nine.vercel.app/api/test](https://music-playlist-nine.vercel.app/api/test)
- **GitHub Repository:** [github.com/rk0802p/music_playlist](https://github.com/rk0802p/music_playlist)

---

## ✨ System Architecture & Key Capabilities

### 🎵 1. Unified Persistent Audio Engine
- **Persistent Bottom Player Bar**: Integrated with Pinia (`player.js`). Music playback continues seamlessly and uninterrupted across page transitions, search queries, and playlist editing.
- **Multi-Provider Playback Architecture**:
  - **Direct HTML5 Audio (`DirectAudioProvider`)**: Native streaming for MP3, FLAC, and OGG with full scrubbable progress bar, volume control, time events, and zero CORS errors.
  - **Jamendo Music Integration (`JamendoProvider`)**: Official v3.0 API integration for legal Creative Commons music streaming (`audioformat=mp32`). Extracts explicit creator CC licenses (`CC BY`, `CC BY-NC-SA`, `CC BY-ND`, `CC0`), evaluates rights flags (`hasCommercialRestriction`, `hasDerivativeRestriction`), formats attribution credits, and provides direct backlinks to Jamendo track pages (`shareurl`). Zero audio storage or file caching.
  - **Audius Decentralized Streaming**: Resolves on-demand directly to decentralized creator node CDNs without requiring local audio caching or storage.
  - **Internet Archive Stream Resolver**: Streams curated, verified archival recordings on demand.
  - **Curated Discover Collection (Original 18 Spotify Songs)**: Curated collection matching the user's Spotify playlist screenshots (including Calvin Harris & Dua Lipa, Alan Walker, Wiz Khalifa & Charlie Puth, Ed Sheeran, Billie Eilish, J Balvin, FloyyMenor), fully playable via high-bitrate AAC streaming with honest unavailable fallback.
  - **Saavn Provider (Development Mode)**: High-resolution on-demand audio resolution engine (`DEV-SAAVN`) with automatic credit-stripping search fallback and production environment guardrails.
  - **Spotify Web Playback SDK & Embeds (`SpotifyProvider`)**: Official OAuth 2.0 connection and Spotify Web Playback SDK player with fallback to interactive responsive embeds.
- **Playback Reliability & Guarding**:
  - **Race Condition Guard**: Request sequence IDs (`playRequestId`) prevent out-of-order race conditions when users rapidly skip or switch tracks.
  - **Automatic One-Time Stream Re-Resolution**: Automatically queries provider resolvers for a fresh stream URL if an upstream CDN token expires during playback.
  - **Unplayable Stream Guard**: Gracefully detects unresolvable or missing audio URLs, updating UI state without throwing unhandled browser audio errors.
  - **Playback Controls**: Queue management, Shuffle, Repeat Mode (`off`, `all`, `one`), volume memory, and responsive visualizers.

---

### 🌐 2. Multi-Source Music Aggregation & Discovery
- **Unified Multi-Source Search (`/api/search`)**: Aggregates search results across multiple legal music providers concurrently.
- **Provider Resilience & Fault Isolation**:
  - **Circuit Breaker Pattern (`CircuitBreaker.js`)**: Wraps each provider in a state machine (`CLOSED` → `OPEN` → `HALF_OPEN`). If a provider encounters 3 consecutive timeouts or failures, the circuit trips open for a 30-second cooldown period, preventing slow external APIs from degrading the rest of the application.
  - **Partial-Failure Tolerance**: If one provider is down or rate-limited, SOUNDWAVE returns all available results from healthy providers without failing the search request.
- **Provenance & Rights Verification**:
  - **Ripper Signature Detection**: Automatically detects and quarantines community uploads bearing watermarks of audio-ripping tools (e.g. `flvto`, `ytmp3`, `y2mate`).
  - **Collection Provenance Checking**: Requires items to originate from verified archival/open collections (`freemusicarchive`, `audio_music`, `etree`, `78rpm`, `netlabels`) or declare explicit Creative Commons / Public Domain license URLs. Unverified community rips are blocked at the resolver.
- **Deduplication & Ranking Engine**: Intelligently deduplicates identical recordings across providers and ranks exact artist/title matches above short audio clips and spoken-word noise.

---

### 🛡️ 3. Security Hardening & Data Isolation
- **Strict Ownership Enforcement**: Users can only modify, reorder, or delete playlists they personally own. Cross-user modification attempts return `403 Forbidden`.
- **Mass Assignment & ID Tampering Prevention**: Request payloads strictly sanitize incoming objects, stripping `userId`, `_id`, and protected timestamps.
- **ObjectId Sanitation**: All parameter IDs are validated against MongoDB ObjectId patterns before querying to prevent internal server `500 CastError` crashes.
- **Standardized JWT Authentication**: Uniform payload claims `{ id, username, email }` with Bearer scheme verification and distinct `TOKEN_EXPIRED` error codes for smooth client auto-logout.
- **Dynamic CORS Whitelisting**: Environment-driven CORS configuration allowing local dev environments (`localhost:5173`) and production domains (`ALLOWED_ORIGINS`).
- **Dependabot Security Auditing**: Strict dependency pinning and overrides (`minimatch >= 11.0.4`, `deepmerge 4.1.2`), achieving **0 vulnerabilities** on `npm audit`.

---

### 📂 4. Expressive Playlist Management
- **Granular Song Operations**: Dedicated RESTful endpoints for adding, updating, deleting, and reordering songs.
- **Duplicate Prevention**: Detects accidental duplicate additions (`title` + `artist`, case-insensitive) returning `409 Conflict`, with optional user-confirmed `allowDuplicate` override.
- **Deterministic Reordering**: Custom song drag-and-drop position re-indexing via `PUT /api/playlists/:id/songs/reorder`.
- **Zero Local Audio Storage**: MongoDB stores only track metadata, provider keys, and external references — never audio files, buffers, or copyright-infringing content.

---

## 🏗️ Project Directory Structure

```
music_playlist/
├── music-playlist-frontend-vue/      # Vue 3 SPA Frontend
│   ├── src/
│   │   ├── api/                      # Client API modules (auth, playlists, search, spotify)
│   │   ├── assets/styles/            # Global styling, tokens, and responsive themes
│   │   ├── components/
│   │   │   ├── common/               # Toast notifications, ambient backdrops
│   │   │   ├── featured/             # FeaturedMusicSection, LicenseAttributionModal
│   │   │   ├── layout/               # AppLayout, Navigation, TopBar
│   │   │   ├── player/               # FloatingPlayerDock, AcousticCapsule, Visualizers
│   │   │   └── playlists/            # CreatePlaylistModal, AddSongModal, SongTable
│   │   ├── data/                     # featuredSongs.js (12 static tracks), moodPlaylists.js
│   │   ├── services/providers/       # DirectAudioProvider, SpotifyProvider, detector
│   │   ├── stores/                   # Pinia stores (auth, playlist, player, spotify, toast)
│   │   ├── utils/                    # featuredSongs helpers, formatting utilities
│   │   ├── views/                    # HomeView, SearchView, PlayListView, LoginView, SignupView
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── server/                           # Node.js / Express API Backend
    ├── controllers/                  # authController, playlistController, searchController, spotifyController
    ├── middleware/                   # auth.js (JWT verify), ownership.js
    ├── models/                       # User.js, Playlist.js
    ├── providers/                    # BaseProvider, AudiusProvider, ArchiveProvider, JamendoProvider, ProviderRegistry, CircuitBreaker
    ├── routes/                       # auth.js, playlist.js, protected.js, search.js, spotify.js
    ├── tests/                        # 7 comprehensive Jest + Supertest integration test suites
    │   ├── auth.test.js
    │   ├── multiSourceSearch.test.js
    │   ├── playlist.test.js
    │   ├── providers.test.js
    │   ├── security.test.js
    │   ├── songs.test.js
    │   └── spotify.test.js
    ├── utils/                        # validation.js, musicLinkParser.js
    ├── index.js                      # Express app entry, dynamic CORS, routes
    ├── package.json                  # Dependencies & npm overrides
    └── vercel.json                   # Vercel serverless deployment config
```

---

## 📡 API Reference

### 🔐 1. Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register new user with hashed password (bcrypt) | No |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT token | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes |
| `GET` | `/api/protected` | Test token verification and authorization status | Yes |

### 📂 2. Playlists (`/api/playlists`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/playlists` | Retrieve all playlists belonging to current user | Yes |
| `POST` | `/api/playlists` | Create new playlist with custom title, cover art, and description | Yes |
| `GET` | `/api/playlists/:id` | Get playlist details by ID (owner or public) | Yes |
| `PUT` | `/api/playlists/:id` | Update playlist metadata (whitelisted fields only) | Yes (Owner) |
| `DELETE` | `/api/playlists/:id` | Permanently delete playlist | Yes (Owner) |
| `GET` | `/api/playlists/resolve/track` | Resolve preview metadata for YouTube/Spotify links via oEmbed | Yes |

### 🎵 3. Songs (`/api/playlists/:id/songs`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/playlists/:id/songs` | Add song to playlist (with duplicate detection & `allowDuplicate` override) | Yes (Owner) |
| `PUT` | `/api/playlists/:id/songs/:songId` | Update song title, artist, or URL metadata | Yes (Owner) |
| `DELETE` | `/api/playlists/:id/songs/:songId` | Remove song and re-index remaining track positions | Yes (Owner) |
| `PUT` | `/api/playlists/:id/songs/reorder` | Reorder playlist songs by array of song IDs | Yes (Owner) |

### 🔍 4. Multi-Source Music Search (`/api/search`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/search?q={query}&limit=20` | Unified multi-source music search with ranking and deduplication | No |
| `GET` | `/api/search/providers` | Query health, configuration, and circuit breaker status of all providers | No |
| `GET` | `/api/search/resolve?provider={p}&trackId={id}` | On-demand playback resolution with rights and provenance verification | No |

### 🎧 5. Spotify Integration (`/api/spotify`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/spotify/login` | Initiate Spotify OAuth 2.0 authorization code flow | Yes |
| `GET` | `/api/spotify/callback` | OAuth redirect callback; exchanges authorization code for tokens | No |
| `GET` | `/api/spotify/status` | Check if current user has an active connected Spotify account | Yes |
| `GET` | `/api/spotify/token` | Retrieve valid Spotify access token (refreshes automatically if expired) | Yes |
| `POST` | `/api/spotify/disconnect` | Revoke user Spotify tokens and disconnect account | Yes |

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js**: v18.x or v20.x or v22.x
- **npm**: v9+ or v10+
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017/music_playlist`) or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster URI.

---

### Step 1: Clone Repository
```bash
git clone https://github.com/rk0802p/music_playlist.git
cd music_playlist
```

---

### Step 2: Backend Configuration & Startup
1. Navigate to the `server/` directory and install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Create a `.env` file in `server/`:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Connection
   MONGO_URI=mongodb://127.0.0.1:27017/music_playlist

   # Security
   JWT_SECRET=super_secret_soundwave_jwt_key_2026

   # CORS & Clients (comma-separated origins)
   FRONTEND_URL=http://localhost:5173
   ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

   # Spotify OAuth (Optional for Spotify integration)
   # Register an app at https://developer.spotify.com/dashboard
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:5000/api/spotify/callback

   # Music Provider Keys (Optional)
   # Audius works out of the box without keys (public read-only)
   AUDIUS_API_KEY=
   JAMENDO_CLIENT_ID=
   ```

3. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server starts on `http://localhost:5000` with hot-reloading via `nodemon`.*

---

### Step 3: Frontend Configuration & Startup
1. In a new terminal window, navigate to the frontend directory:
   ```bash
   cd music-playlist-frontend-vue
   npm install
   ```

2. Create a `.env` file in `music-playlist-frontend-vue/`:
   ```env
   # Backend API Base URL
   VITE_API_URL=http://localhost:5000

   # Optional Spotify Client ID (for Web Playback SDK initialization)
   VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will be available at `http://localhost:5173`.*

---

## 🧪 Running Automated Tests

SOUNDWAVE includes **124 integration and unit tests** across 7 test suites running against an isolated in-memory MongoDB database (**zero external network or cloud DB dependencies required**).

Run all test suites:
```bash
npm test --prefix server
```

### Test Suite Summary:
```text
Test Suites: 7 passed, 7 total
Tests:       124 passed, 124 total
Snapshots:   0 total
Time:        ~28 s

Suites:
  ✓ tests/multiSourceSearch.test.js   (Unified search, Circuit Breaker, Audius/Archive/Saavn, concurrency deduplication)
  ✓ tests/providers.test.js           (MusicLinkParser, oEmbed resolution, multi-source playlist additions)
  ✓ tests/spotify.test.js             (Spotify OAuth code exchange, token refresh lifecycle, disconnect)
  ✓ tests/security.test.js            (Ownership enforcement, ID tampering, mass assignment guards)
  ✓ tests/songs.test.js               (Granular song CRUD, position reordering, duplicate detection)
  ✓ tests/playlist.test.js            (Playlist CRUD, pagination, search filtering)
  ✓ tests/auth.test.js                (Signup, login, token verification, expiration handling)
```

To verify the frontend production build:
```bash
npm run build --prefix music-playlist-frontend-vue
```

For detailed setup, troubleshooting, and verification reports, consult:
- **Local Run & Installation Guide:** [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md)
- **Phase 5 Complete Application Audit:** [docs/PHASE_5_COMPLETE_APPLICATION_AUDIT.md](docs/PHASE_5_COMPLETE_APPLICATION_AUDIT.md)

---

## ☁️ Production Deployment Guide (Vercel)

SOUNDWAVE is architected to deploy seamlessly as two independent services on **Vercel**: a serverless Node.js backend and a static single-page application (SPA) frontend.

---

### Project A: Backend API Deployment (`server`)

1. **Vercel Project Setup**:
   - In the [Vercel Dashboard](https://vercel.com/), click **Add New** → **Project**.
   - Import your GitHub repository: `rk0802p/music_playlist`.
   - Set **Root Directory** to `server`.
   - **Framework Preset**: Other (Vercel will detect `@vercel/node` via `server/vercel.json`).

2. **Environment Variables Configuration** (in Vercel Project Settings → Environment Variables):
   | Variable | Value Description | Example Production Value |
   | :--- | :--- | :--- |
   | `NODE_ENV` | Environment mode | `production` |
   | `MONGO_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://user:pass@cluster.mongodb.net/music_playlist?retryWrites=true&w=majority` |
   | `JWT_SECRET` | Strong random secret string for JWT signing | `a_very_long_secure_random_string_2026` |
   | `FRONTEND_URL` | Production URL of your deployed frontend | `https://music-playlist-pp8l.vercel.app` |
   | `ALLOWED_ORIGINS` | Comma-separated list of allowed origins | `https://music-playlist-pp8l.vercel.app,http://localhost:5173` |
   | `SPOTIFY_CLIENT_ID` | Spotify App Client ID | `your_spotify_client_id` |
   | `SPOTIFY_CLIENT_SECRET` | Spotify App Client Secret | `your_spotify_client_secret` |
   | `SPOTIFY_REDIRECT_URI` | Production backend OAuth callback URL | `https://music-playlist-nine.vercel.app/api/spotify/callback` |

3. **MongoDB Atlas Network Access**:
   - In your MongoDB Atlas dashboard, navigate to **Network Access**.
   - Ensure an IP Access List entry is set to `0.0.0.0/0` (Allow Access from Anywhere) so Vercel's dynamic serverless IP ranges can connect to your database.

---

### Project B: Frontend SPA Deployment (`music-playlist-frontend-vue`)

1. **Vercel Project Setup**:
   - In the Vercel Dashboard, create another project from the same repository: `rk0802p/music_playlist`.
   - Set **Root Directory** to `music-playlist-frontend-vue`.
   - **Framework Preset**: Vite.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

2. **Environment Variables Configuration**:
   | Variable | Value Description | Example Production Value |
   | :--- | :--- | :--- |
   | `VITE_API_URL` | Production URL of your deployed backend API | `https://music-playlist-nine.vercel.app` |
   | `VITE_SPOTIFY_CLIENT_ID` | Spotify Client ID (if using Web Playback SDK) | `your_spotify_client_id` |

3. **SPA Rewrites**:
   - Vite and Vue Router use HTML5 History mode. Vercel automatically routes non-asset URL requests to `/index.html`.

---

### 🔑 Spotify Developer Dashboard Production Setup

1. Log in to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Select your registered Application.
3. Click **Settings** and add your production callback URL under **Redirect URIs**:
   - Local: `http://localhost:5000/api/spotify/callback`
   - Production: `https://music-playlist-nine.vercel.app/api/spotify/callback`
4. Under **User Management**, add the email addresses of the users permitted to test Spotify playback (subject to the 25-user limit of Spotify Developer Mode).

---

## ⚖️ Legal & Music Rights Policy

- **Zero Local Audio Hosting**: SOUNDWAVE never downloads, stores, caches, or distributes audio files or copyrighted music recordings on its servers or database.
- **Direct Playback**: All playable audio streams resolve to the original legitimate publisher's endpoints (Audius decentralised network, Free Music Archive, or Musopen).
- **Provenance Quarantine**: Automated checks reject unverified community rips (e.g. tracks from YouTube rippers).
- **Commercial Music**: Commercial music (Billboard hits) requires official authenticated playback through Spotify's player controls.

---

## 📄 License
This project is licensed under the **ISC License**.
