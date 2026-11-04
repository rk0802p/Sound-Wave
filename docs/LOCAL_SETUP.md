# SOUNDWAVE — Local Development & Run Guide

This document provides definitive, end-to-end instructions for installing, configuring, running, and verifying the **SOUNDWAVE** Music Playlist and Discovery platform on a local machine (Windows, macOS, or Linux).

---

## 1. System Requirements & Prerequisites

| Requirement | Supported Version | Notes |
|---|---|---|
| **Node.js** | `>= 18.0.0` (LTS recommended, e.g. Node 20 or 22) | Native `fetch` support required |
| **npm** | `>= 9.0.0` | Ships with Node.js |
| **Operating System** | Windows 10/11, macOS, Ubuntu / Debian Linux | Tested on Windows 11 PowerShell |
| **Browser** | Modern Chromium (Chrome, Edge), Firefox, or Safari | HTML5 Audio & Web Audio API support |
| **MongoDB (Optional)** | MongoDB 6.0+ or MongoDB Atlas | Optional for local UI testing; app includes offline storage fallback |

To check your installed versions:
```powershell
node -v
npm -v
```

---

## 2. Repository Structure

Notice that SOUNDWAVE uses isolated frontend and backend folders. There is **no root package.json**; commands are run directly within or targeted at `server/` and `music-playlist-frontend-vue/`.

```
music_playlist/
├── server/                           # Express REST API Backend
│   ├── index.js                      # Server entry point (Port 5000)
│   ├── providers/                    # Music Provider Registry & Adapters
│   ├── controllers/                  # API route controllers
│   ├── package.json                  # Backend dependencies
│   └── tests/                        # 7 Jest test suites (124 tests)
├── music-playlist-frontend-vue/      # Vue 3 + Vite SPA Frontend
│   ├── src/                          # Views, Components, Stores, Services
│   ├── index.html                    # HTML entry point
│   ├── vite.config.js                # Vite dev server configuration (Port 5173)
│   └── package.json                  # Frontend dependencies
├── docs/                             # Architecture & Verification Documentation
└── README.md                         # Project overview
```

---

## 3. Installation Steps

Clone the repository and install dependencies in both project subdirectories:

### Option A: Install via Root Helper Commands (PowerShell / Bash)
```powershell
# 1. Install Backend Dependencies
npm install --prefix server

# 2. Install Frontend Dependencies
npm install --prefix music-playlist-frontend-vue
```

### Option B: Install inside Subdirectories
```powershell
# 1. Install Backend
cd server
npm install
cd ..

# 2. Install Frontend
cd music-playlist-frontend-vue
npm install
cd ..
```

---

## 4. Configuration & Environment Variables

### Backend Configuration (`server/.env`)
Create a `.env` file inside `server/` (or copy from `.env.example` if available).

```env
# Server Port
PORT=5000

# Environment Mode
NODE_ENV=development

# Allowed Frontend Origins (CORS)
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# JWT Secret (Used for authentication)
JWT_SECRET=soundwave_super_secret_jwt_key_local_dev_2026

# Optional: MongoDB Database Connection
# If omitted, server runs gracefully in offline-capable mode
# MONGO_URI=mongodb://localhost:27017/soundwave

# Optional: Spotify Developer Credentials (for official Spotify Web API linking)
# SPOTIFY_CLIENT_ID=your_client_id
# SPOTIFY_CLIENT_SECRET=your_client_secret
# SPOTIFY_REDIRECT_URI=http://localhost:5000/api/spotify/callback
```

> **Note on MongoDB:** If `MONGO_URI` is not provided, the backend starts cleanly with a notice: `Starting server without active DB connection: MONGO_URI environment variable is not defined.` The frontend automatically utilizes its persistent local storage (`soundwave_bubble_playlists_v3`) for playlists, ensuring 100% functional music playback and exploration without requiring a database setup.

---

## 5. Running the Application

SOUNDWAVE runs as two decoupled processes: the Express backend on port 5000 and the Vite frontend dev server on port 5173.

### Step 1: Start the Backend Server (Terminal 1)
```powershell
npm start --prefix server
# Alternatively: cd server && npm start
```
*Expected Terminal Output:*
```
Starting server without active DB connection: MONGO_URI environment variable is not defined.
🚀 Music Playlist Server running on http://localhost:5000
```

### Step 2: Start the Frontend Dev Server (Terminal 2)
```powershell
npm run dev --prefix music-playlist-frontend-vue
# Alternatively: cd music-playlist-frontend-vue && npm run dev
```
*Expected Terminal Output:*
```
  VITE v6.4.5  ready in 1758 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 3: Open in Browser
Open your browser and navigate to:
```
http://localhost:5173/?demo=1
```
The `?demo=1` flag instantly provisions a demo curator profile, loads the 5 curated mood playlists, and displays the **18 Original Spotify Homepage Songs** ready for immediate listening.

---

## 6. Verification & Automated Testing

### Backend Unit & Integration Tests (124 Tests)
Run the full 7-suite backend test suite:
```powershell
npm test --prefix server
```
*Expected Result:*
- `Test Suites: 7 passed, 7 total`
- `Tests: 124 passed, 124 total`
- Suites covered: `auth.test.js`, `playlist.test.js`, `songs.test.js`, `security.test.js`, `providers.test.js`, `spotify.test.js`, `multiSourceSearch.test.js`.

### Frontend Production Build Test
Verify that the frontend compiles cleanly into static production assets:
```powershell
npm run build --prefix music-playlist-frontend-vue
```
*Expected Result:*
- Built in `~1.5s - 2.0s` with **0 errors**.
- Output files created in `music-playlist-frontend-vue/dist/`.

---

## 7. Operational Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| `Port 5000 already in use` | Another server instance is running. | Find and terminate the process: `Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess \| Stop-Process -Force` |
| `Port 5173 already in use` | Vite selected port 5174 instead. | Stop conflicting process or run with `--port 5173`. Check browser URL. |
| `CORS Error in Browser` | Frontend accessed on an unexpected host. | Access app via `http://localhost:5173`. Ensure `ALLOWED_ORIGINS` in `server/.env` includes your origin. |
| `Network fetch playlists error: 500` | MongoDB is not running locally. | **Normal behavior.** The frontend gracefully catches this and uses the offline local store without impacting music playback. |
| `Audio playback error / Network error` | Blocked network request or expired stream URL. | Click play again; SOUNDWAVE includes automatic one-time stream re-resolution. |

---

## 8. Development Commands Quick Reference

| Action | PowerShell Command |
|---|---|
| Start Backend | `npm start --prefix server` |
| Start Backend (Watch mode) | `npm run dev --prefix server` |
| Start Frontend | `npm run dev --prefix music-playlist-frontend-vue` |
| Run Backend Tests | `npm test --prefix server` |
| Build Frontend | `npm run build --prefix music-playlist-frontend-vue` |
| Preview Production Build | `npm run preview --prefix music-playlist-frontend-vue` |
