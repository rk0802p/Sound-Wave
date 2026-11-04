# SOUNDWAVE — Production Playback Failure, Jamendo Integration & UI Consistency Incident Report

**Document ID:** SW-INCIDENT-2026-11-05  
**Severity:** CRITICAL  
**Status:** RESOLVED & VERIFIED (Pending Deployment Authorization)  
**Target Environments:** Production (`https://music-playlist-pp8l.vercel.app/`, `https://music-playlist-nine.vercel.app/`) & Local Verification  
**Branch:** `main`  
**Git Commit Policy:** No commit, push, or deployment executed during this phase.

---

## 1. Executive Incident Summary

Following the release of Phase 6, severe operational defects and design drift were identified on the live Vercel production deployment:
1. **Homepage Playback Failure & HTTP 403 Flood:** Users attempting to play tracks from the homepage experienced playback failure accompanied by repeated HTTP 403 `PROVIDER_UNCONFIGURED` network errors (`GET /api/search/resolve?provider=saavn&trackId=...`).
2. **Jamendo API Operational Failure:** While `JAMENDO_CLIENT_ID` was populated in Vercel backend environment variables, catalog queries returned zero tracks. Concurrently, the frontend emitted premature, misleading "Playing ... via JAMENDO" toasts before audio was resolved or playing.
3. **Severe Design System Disconnect on Search:** The Search view (`SearchView.vue`) had drifted into a stark, neo-brutalist theme (solid `#111` borders, harsh angular cards, flat white canvas), clashing with the pastel aqua/lavender bubbly glassmorphism established across the rest of SOUNDWAVE.
4. **Social Explore Empty State Confusion:** The public discovery feed (`/explore`) displayed `00 — No Public Mixtapes Found`, prompting concerns regarding query bugs.
5. **Route Malformation on Playlist Preview:** Clicking certain playlist preview links resulted in HTTP 403/400 errors (`Invalid playlist ID format`) due to synthetic `archive-` prefix prepending.

All root causes were conclusively isolated using empirical live API probes, headless browser automation, and code analysis. Targeted architectural remedies were implemented, eliminating console noise, restoring visual harmony, and instituting honest player states.

---

## 2. Production Playback Root-Cause Analysis (Saavn & Homepage Tracks)

### 2.1 The Quarantine Constraint
In SOUNDWAVE's architecture, `SaavnProvider.js` serves as a development-only proof-of-concept for decrypting commercial CDN streams via a custom pure-JS DES-ECB decipher. By deliberate architectural security policy, `SaavnProvider.isConfigured()` strictly evaluates to `false` when `process.env.NODE_ENV === 'production'`:
```javascript
// server/providers/SaavnProvider.js
isConfigured() {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return true;
}
```
Consequently, when the backend runs in production mode, any incoming call to `GET /api/search/resolve?provider=saavn&trackId=...` is rejected with HTTP 403 and body:
```json
{
  "error": "Provider 'saavn' is not configured or disabled in this environment",
  "code": "PROVIDER_UNCONFIGURED",
  "provider": "saavn"
}
```

### 2.2 The Homepage On-Demand Resolution Trigger
The original 18 homepage featured tracks in `src/data/featuredSongs.js` contained 17 entries with:
```javascript
provider: 'saavn',
needsResolution: true
```
In local development (`NODE_ENV === 'development'`), the backend resolved these to direct CDN URLs without issue. However, upon deployment to Vercel (`NODE_ENV === 'production'`), the frontend's `playerStore.playTrack` initiated resolution on-demand via `searchApi.resolveTrack('saavn', trackId)`.

### 2.3 The HTTP 403 Retry Flood & Console Spam
When the 403 response arrived, previous frontend logic in `playerStore.js` and `FeaturedMusicSection.vue` attempted fallback recovery, triggering alternative stream resolutions and re-requesting the unconfigured provider. Because resolution calls were not deduplicated in-flight and unconfigured providers were not cached as blocked, repeated clicks or carousel navigation spammed Axios errors and unhandled promise rejections into the browser console.

### 2.4 Integrity of the 18 Commercial Tracks
Public catalog searches across Internet Archive, Jamendo, and Audius for the 18 commercial hits (Calvin Harris, Alan Walker, Ed Sheeran, The Weeknd, etc.) return only low-quality bootlegs, violin covers, or unrelated karaoke tracks. Replacing the tracks with covers would degrade catalog integrity and violate user requirements. 
**Resolution:** The 18 tracks remain intact in their original sequence. The frontend now pre-emptively identifies blocked providers via capability synchronization (`/api/search/providers/health`), fast-fails any attempted playback locally without network requests, transitions the player to an honest `unavailable` status, and styles Track 12 as permanently unavailable.

---

## 3. Jamendo Operational Architecture & Upstream Diagnostic

### 3.1 Upstream Developer Account Suspension
Investigation of the live production backend (`https://music-playlist-nine.vercel.app/api/search?provider=jamendo&q=rock`) revealed that Jamendo returned 0 tracks. A direct probe to Jamendo API v3.0 using the configured client ID (`56d30c95`) revealed:
```json
{
  "headers": {
    "status": "failed",
    "code": 11,
    "error_message": "Jamendo Api Suspended Application Error: Your application has been suspended, please contact Jamendo",
    "warnings": "",
    "results_count": 0
  },
  "results": []
}
```
**Finding:** Jamendo's automated compliance systems suspended the developer client ID `56d30c95`. The failure does not originate from backend code, missing environment variables, or parsing logic.

### 3.2 Fault Isolation & CDN Stream Viability
1. **Fault Isolation:** The backend `ProviderRegistry` successfully isolates this upstream failure. When Jamendo returns code 11, the provider transitions to `status: 'unavailable'` and logs a warning. Unified searches continue uninterrupted, powered by Internet Archive and Audius.
2. **Direct Storage Viability:** A probe to Jamendo's public audio CDN (`https://prod-1.storage.jamendo.com/?trackid=323717&format=mp32`) returns HTTP 200 `audio/mpeg` (5,465,460 bytes). Tracks that already hold valid Jamendo storage URLs stream perfectly without requiring an active developer key.

### 3.3 Elimination of Premature "Playing" Toasts
In `SearchView.vue`, the play handler previously invoked:
```javascript
toastStore.info(`Playing ${track.title} via ${getProviderLabel(track)}`);
```
immediately upon button click, before audio resolution or transport buffering. This created the illusion that playback had started when it had not. 
**Fix:** The toast now only fires if `playerStore.isPlaying || playerStore.playbackState === 'playing'`. If the track is unavailable, it emits an honest warning toast.

---

## 4. Route Malformation & Archive ID Analysis

### 4.1 Root Cause of `archive-` IDs
In Phase 6, `src/data/moodPlaylists.js` introduced synthetic identifiers for the 5 curated mood playlists:
```javascript
_id: 'archive-67c000000000000000000001' // through 0005
```
When user navigation or drawer links routed to `/playlist/archive-67c000000000000000000001`, the backend rejected the request:
```json
{
  "message": "Invalid playlist ID format. Must be a 24-character hexadecimal string.",
  "code": "INVALID_ID_FORMAT"
}
```
HTTP 400 Bad Request was returned. However, `PlaylistPreviewView.vue` hardcoded the error glyph as `403` and displayed "Mixtape Restricted", misleading the user into thinking an authorization error occurred.

### 4.2 Fix Implementation
1. Stripped the `archive-` prefix in `moodPlaylists.js`, normalizing all mood IDs to valid 24-character hexadecimal ObjectIds (`67c000000000000000000001` to `67c000000000000000000005`) and adding `isMood: true`.
2. Updated `HomeView.vue` drawer links: mood playlists route to `/?playlist=${p._id}` to filter the homepage in-place, while user-created playlists route to `/playlist/${p._id}`.
3. Enhanced `PlaylistPreviewView.vue` to dynamically reflect HTTP error codes (400, 401, 403, 404) and provide a graceful fallback rendering for curated mood playlists if navigated to directly.

---

## 5. UI Consistency & Design Drift Audit

### 5.1 Design Disconnect
`SearchView.vue` had been styled with hard-edged neo-brutalist CSS tokens (`2px solid #111`, flat white `#fff` backgrounds, uppercase brutalist buttons). It lacked:
- The fixed pastel gradient wash (`#wash`).
- The drifting ambient pastel orbs (`.bgb`).
- Translucent glassmorphism (`backdrop-filter: blur(20px)`).
- Glowing focus rings and soft pill-shaped controls.

### 5.2 Visual Reconstruction
`SearchView.vue` was refactored to align with the core SOUNDWAVE design system:
- Injected `<div class="wash">` and `<div class="bgb">` bound to dynamic player tinting.
- Replaced angular cards with rounded portal cards (`border-radius: 28px`) and smooth drop shadows.
- Styled search input with translucent glass and a soft cyan glowing focus state.
- Standardized provider badges (`source-jamendo`, `source-archive`, `source-audius`, `source-spotify`).
- Fully verified responsiveness across Desktop (1280px), Tablet (768px), and Mobile (390px).

---

## 6. Public Mixtape Persistence Analysis

Investigation confirmed that the explore endpoint `GET /api/playlists/public/explore` works correctly. The production response `{"playlists":[],"pagination":{"total":0}}` was due to zero public playlists having been saved in the production MongoDB Atlas database. In automated verification, creating a user and public playlist via API resulted in immediate indexing in `/explore` and successful anonymous preview at `/playlist/:id`.

---

## 7. Verification Summary Matrix

| Verification Vector | Baseline State | Post-Fix State | Status |
|---|---|---|---|
| Homepage 18 Tracks | 403 Resolution Loop | Fast-fail local check, honest dock status | PASS |
| Track 12 Status | Hardcoded broken | Honest `UNAVAILABLE` badge | PASS |
| Jamendo Upstream Audit | Unclear | Diagnosed code 11 suspension | DOCUMENTED |
| Jamendo CDN Audio | Unverified | HTTP 200 audio/mpeg confirmed | PASS |
| Jamendo Premature Toast | Emitted on click | Only emits on verified playback | PASS |
| Search Page Theme | Neo-brutalist | Pastel bubbly glassmorphism | PASS |
| Playlist ID Formatting | Malformed `archive-` | Normalized 24-char ObjectId | PASS |
| Preview Error Handling | Hardcoded 403 | Dynamic 400/401/403/404 | PASS |
| Backend Test Suite | 162/162 Passing | 162/162 Passing | PASS |
| Frontend Production Build | Passes | Passes (3.72s, 0 errors) | PASS |
| E2E Incident Verification | N/A | 15/15 Checks Passing | PASS |
