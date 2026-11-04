# SOUNDWAVE — Phase 5.1A: Defect Classification & Fix Authorization Matrix

**Project:** SOUNDWAVE — Multi-Source Music Playlist & Audio Platform  
**Stage:** Stage B — Defect Classification & Fix Authorization  
**Date:** November 4, 2026  
**Auditor:** Antigravity Autonomous Pair Programmer  

---

## 1. Defect Classification Overview

Findings from the Stage A baseline verification and prior stabilization work are classified into the five mandatory categories:

- **Category 1 (Critical Correctness or Security):** Security vulnerabilities, authentication flaws, mass assignment risks, or improper production environment guards.
- **Category 2 (Core Functionality):** Broken core features, playback transport issues, playlist persistence corruption, or licensing non-compliance.
- **Category 3 (Reliability):** Provider timeout handling, unhandled error states, and debounce race conditions.
- **Category 4 (Cosmetic / Usability):** Visual styling, minor spacing, or decorative animations (strictly NOT authorized unless blocking a control).
- **Category 5 (Enhancements):** New product features, additional providers, or redesigns (strictly OUT OF SCOPE).

---

## 2. Fix Authorization Matrix

| ID | Finding | Severity | Evidence | Proposed Fix | Scope | Authorization | Status |
|---|---|---|---|---|---|---|---|
| **F-001** | Silent fake demo token fabrication on auth failure | **Category 1 (Critical)** | `auth.js` lines 48-58 returned `demo-token-soundwave-atelier` on network error | Remove fake demo user fabrication; throw and display real network/auth errors | `music-playlist-frontend-vue/src/stores/auth.js` | **Permitted** | **Implemented & Verified** |
| **F-002** | Hardcoded JWT secret fallback in production | **Category 1 (Critical)** | Hardcoded string `music_playlist_secret_key_2026` across controllers without env check | Enforce fatal error in production if `JWT_SECRET` is missing; provide dev fallback | `server/controllers/authController.js`, `server/middleware/auth.js`, `server/controllers/spotifyController.js` | **Permitted** | **Implemented & Verified** |
| **F-003** | Broad CORS wildcard allowed arbitrary `.vercel.app` domains | **Category 1 (Critical)** | `server/index.js` line 44: `origin.endsWith(".vercel.app")` | Tighten allowlist to exact configured origin + project-specific prefix | `server/index.js` | **Permitted** | **Implemented & Verified** |
| **F-004** | Empty user playlists auto-populated with mood tracks | **Category 2 (Core)** | `playlist.js` line 90: `songs: (p.songs && p.songs.length > 0) ? p.songs : fallbackMood.songs` | Preserve `songs: Array.isArray(p.songs) ? p.songs : []`; display empty state banner | `music-playlist-frontend-vue/src/stores/playlist.js`, `music-playlist-frontend-vue/src/views/HomeView.vue` | **Permitted** | **Implemented & Verified** |
| **F-005** | Fake offline playlist and song creation in normal mode | **Category 2 (Core)** | `playlist.js` created synthetic `custom-*` playlists and `song-*` tracks on backend error | Remove synthetic creation fallbacks; require real backend responses | `music-playlist-frontend-vue/src/stores/playlist.js` | **Permitted** | **Implemented & Verified** |
| **F-006** | Service worker precache failure on dev-only asset paths | **Category 3 (Reliability)** | `public/sw.js` had `/src/main.js` and `/src/assets/styles/global.css` in precache list | Remove non-existent dev paths; precache `['/', '/index.html']` | `music-playlist-frontend-vue/public/sw.js` | **Permitted** | **Implemented & Verified** |
| **F-007** | Auth store parameter signature mismatch | **Category 2 (Core)** | `LoginView`/`SignupView` passed `{ email, password }` object while `auth.js` expected positional args | Normalize `login` and `signup` in `auth.js` to accept both objects and positional arguments | `music-playlist-frontend-vue/src/stores/auth.js` | **Permitted** | **Implemented & Verified** |
| **F-008** | Guest browsing forced 401 redirect to `/login` | **Category 2 (Core)** | `api/index.js` response interceptor redirected on `NO_TOKEN` even on public homepage | Only clear token and redirect if `TOKEN_EXPIRED` or an active session was invalidated | `music-playlist-frontend-vue/src/api/index.js`, `music-playlist-frontend-vue/src/views/HomeView.vue` | **Permitted** | **Implemented & Verified** |
| **F-009** | Search controller query parameter rigidity | **Category 3 (Reliability)** | `searchController.js` only accepted plural `providers` query parameter | Support both `providers` and `provider` query parameters | `server/controllers/searchController.js` | **Permitted** | **Implemented & Verified** |
| **F-010** | Jamendo Creative Commons licensing & attribution compliance | **Category 2 (Core)** | Generic `'Creative Commons'` label without specific CC type or direct Jamendo backlink | Implement `parseLicense()` extracting exact CC license types and rights flags; add `↗ JAMENDO` backlink | `server/providers/JamendoProvider.js`, `music-playlist-frontend-vue/src/views/SearchView.vue` | **Permitted** | **Implemented & Verified** |
| **F-011** | Minor CSS glass blur radius variation on mobile | **Category 4 (Cosmetic)** | Visual difference in glass blur radius between Safari and Edge | Visual polish; controls are 100% accessible | None | **Not Permitted** | Deferred (No visual redesign authorized) |
| **F-012** | Global AI-driven music recommendation engine | **Category 5 (Enhancement)** | Feature request for personalized vector-based recommendations | Unrelated to stabilization; out of current scope | None | **Not Permitted** | Deferred to future phase |

---

## 3. Permitted Fix Summary

All 10 permitted fixes (**F-001** through **F-010**) represent minimal, targeted remediations that:
1. Were directly observed and reproduced with evidence.
2. Address existing correctness, security, or core reliability.
3. Introduce zero unrelated features.
4. Leave the original 18 featured tracks untouched.
5. Require no destructive database operations.
6. Require no deployment or production configuration mutations.
