# SOUNDWAVE — Modern Full-Stack Music Playlist & Audio Workstation

A production-grade, full-stack music playlist application and persistent audio player built with **Vue 3**, **Pinia**, **Node.js/Express**, **MongoDB**, and **JWT Authentication**.

- **Frontend:** Vue 3 (Composition API), Pinia State Management, Vue Router 4, Axios, Vite ([Live Frontend](https://music-playlist-pp8l.vercel.app/))
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, BcryptJS, Jest & Supertest ([Live Backend API](https://music-playlist-nine.vercel.app/api/test))
- **Repository:** [github.com/rk0802p/music_playlist](https://github.com/rk0802p/music_playlist)

---

## ✨ Key Features & Enhancements

### 🎵 1. Persistent Audio Player Engine
- **Application-Level HTML5 Audio Engine**: Persistent bottom player bar integrated with Pinia. Seamless playback continues uninterrupted during navigation across playlists and pages.
- **Smart Media Source Handling**:
  - Direct playable audio streams (`.mp3`, `.wav`, `.ogg`, CDN streams) play natively with scrubbable progress bar, volume control, and time tracking.
  - Curated royalty-free classical and ambient tracks pre-bundled for instant listening out of the box.
  - External links (YouTube, Spotify, SoundCloud) are clearly badged with direct launch links without triggering browser media player errors.
  - Playback features: Queue management, Shuffle, Repeat Mode (`off`, `all`, `one`), and graceful stream error recovery.

### 🛡️ 2. Security Hardening & Ownership Isolation
- **Strict Ownership Middleware**: Users can only edit, mutate, or delete their own private playlists. Cross-user modification attempts return `403 Forbidden`.
- **Mass Assignment & ID Tampering Prevention**: Strict payload sanitization strips `userId`, `_id`, and protected timestamps, eliminating privilege escalation.
- **ObjectId Sanitation**: All parameter IDs are validated against MongoDB ObjectId patterns before querying to prevent internal server `500 CastError` crashes.
- **Standardized JWT Lifecycle**: Uniform claims `{ id, username, email }` with configurable expiration, Bearer scheme verification, and distinct `TOKEN_EXPIRED` handling for graceful auto-logout.
- **Dynamic CORS**: Environment-configured origins supporting local development (`localhost:5173`) and cloud deployments via `ALLOWED_ORIGINS`.

### 📂 3. Expressive Data Model & Playlist Management
- **Rich Metadata**: Playlist cover images (curated artwork presets or custom URLs), descriptions, tags, and visibility status (`isPublic`).
- **Granular Song Operations**:
  - Dedicated endpoints for adding, updating, deleting, and reordering songs.
  - **Duplicate Detection**: Prevents accidental track duplicates (case-insensitive `title` + `artist`) with `409 Conflict`, with optional user-confirmed `allowDuplicate` override.
  - **Deterministic Ordering**: Drag-and-drop / position re-indexing ensures songs remain in exact user-defined sequences.
- **Mongoose Virtuals**: Real-time computed virtuals for `songCount` and `totalDuration`.

### 🧪 4. Comprehensive Automated Integration Tests
- In-memory database testing using **Jest**, **Supertest**, and **mongodb-memory-server** with zero external cloud dependencies.
- **43 automated test cases** across 4 suites covering Auth, Playlist CRUD, Security/Ownership isolation, and Song Mutations.
- **Measured Line Coverage: 89.18%**.

---

## 🏗️ Architecture & Component Hierarchy

```
music_playlist/
├── music-playlist-frontend-vue/
│   ├── src/
│   │   ├── api/                     # Segregated API services (auth, playlists, client)
│   │   ├── components/
│   │   │   ├── common/              # Toast notifications
│   │   │   ├── layout/              # AppLayout, Sidebar, TopBar
│   │   │   ├── player/              # Persistent AudioPlayer bottom bar
│   │   │   └── playlists/           # PlaylistHero, SongTable, Add/Edit Modals
│   │   ├── data/                    # Curated demo tracks, artwork presets, audio helpers
│   │   ├── stores/                  # Pinia stores (auth, playlist, player, toast)
│   │   ├── views/                   # HomeView, PlayListView, LoginView, SignupView
│   │   ├── App.vue
│   │   └── main.js
└── server/
    ├── controllers/                 # authController, playlistController
    ├── middleware/                  # verifyToken (auth.js), ownership.js
    ├── models/                      # Playlist.js, User.js
    ├── routes/                      # auth.js, playlist.js, protected.js
    ├── tests/                       # Jest + Supertest integration test suite
    ├── utils/                       # validation.js (sanitization, ObjectId checks)
    ├── index.js                     # Express app, dynamic CORS, server entry
    └── package.json
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register new user with hashed password | No |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes |
| `GET` | `/api/protected` | Verify token authorization status | Yes |

### Playlists
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/playlists` | Get user playlists (supports `?search=` and `?page=`) | Yes |
| `POST` | `/api/playlists` | Create playlist with cover art and description | Yes |
| `GET` | `/api/playlists/:id` | Get playlist details (owner or public) | Yes |
| `PUT` | `/api/playlists/:id` | Update playlist metadata (whitelisted fields only) | Yes (Owner) |
| `DELETE` | `/api/playlists/:id` | Delete playlist | Yes (Owner) |

### Songs
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/playlists/:id/songs` | Add song (includes duplicate check & override) | Yes (Owner) |
| `PUT` | `/api/playlists/:id/songs/:songId` | Update song metadata | Yes (Owner) |
| `DELETE` | `/api/playlists/:id/songs/:songId` | Remove song & re-index positions | Yes (Owner) |
| `PUT` | `/api/playlists/:id/songs/reorder` | Reorder songs by array of song IDs | Yes (Owner) |

---

## 🧪 Running Automated Tests

Run the full integration test suite with in-memory MongoDB:

```bash
cd server
npm test
```

Generate test coverage report:

```bash
cd server
npm run test:coverage
```

### Test Coverage Summary:
```text
Test Suites: 4 passed, 4 total
Tests:       43 passed, 43 total
Coverage:    89.18% Line Coverage (Controllers: 86.6%, Models: 90.9%, Middleware: 91.1%)
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (or MongoDB Atlas connection URI)

### 2. Backend Setup
```bash
cd server
npm install

# Create .env file:
# PORT=5000
# MONGO_URI=your_mongodb_connection_string
# JWT_SECRET=your_jwt_secret_key
# ALLOWED_ORIGINS=http://localhost:5173

npm run dev
```

### 3. Frontend Setup
```bash
cd ../music-playlist-frontend-vue
npm install

# Create .env file:
# VITE_API_URL=http://localhost:5000

npm run dev
```

Visit `http://localhost:5173` to explore the application.

---

## 📄 License
ISC
