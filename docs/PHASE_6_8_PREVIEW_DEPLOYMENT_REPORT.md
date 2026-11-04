# SOUNDWAVE — Phase 6.8 Preview Deployment Report

**Release Branch:** `release/phase-6-incident-fix`  
**Repository:** `https://github.com/rk0802p/music_playlist`  
**Target Environment:** Vercel Preview & Production Backend  
**Date:** November 5, 2026  
**Status:** Ready for User Review

---

## 1. Deployment Context & Scope

When `release/phase-6-incident-fix` is published to GitHub, Vercel automatically detects the branch and creates an isolated Preview Deployment for the frontend project (`music-playlist-frontend-vue`).

### Key Production Stabilizations in this Deployment:
1. **Audio Transport Buffering Fix:**
   - Previous behavior: `onPlay` synchronously set `isPlaying = true`, causing the player dock to show a Pause icon (`❚❚`) while audio was still at `0:00` and buffering from Jamendo's CDN.
   - New behavior: `onPlay` sets `isLoading = true`, showing a `.dock-spinner` / `⏳` until initial bytes are buffered. Only `onPlaying` transitions to `isPlaying = true`.
2. **Vercel SPA Route Rewrites:**
   - Includes `music-playlist-frontend-vue/vercel.json` with rule:
     ```json
     {
       "rewrites": [
         {
           "source": "/(.*)",
           "destination": "/index.html"
         }
       ]
     }
     ```
   - Eliminates Vercel static 404 error pages when users refresh or directly visit `/search`, `/explore`, or `/playlist/:id`.
3. **Jamendo Creative Commons Streaming:**
   - Upstream Jamendo application is confirmed live under a Read & Write plan.
   - Catalog queries for `dandelion`, `electronic`, and `ambient` return active Creative Commons MP3 streams from `prod-1.storage.jamendo.com`.
4. **Honest Commercial Track State:**
   - Homepage's 18 curated commercial master tracks fail fast locally with 0 network calls and 0 HTTP 403 errors, cleanly displaying `• Unavailable`.

---

## 2. Preview Deployment Test Plan

Upon push of `release/phase-6-incident-fix`:

| Test | Action | Expected Result |
|---|---|---|
| **Direct Navigation** | Open Preview URL at `/search` directly | Page renders with bubbly pastel theme; no 404 |
| **Search & Buffer** | Search `dandelion`, click Oleg O. Kachanko | Loading spinner appears in dock; audio buffers |
| **Audible Playback** | Wait ~3 seconds | Spinner transitions to Pause icon; audio starts emitting |
| **Progression** | Observe progress slider | Time advances cleanly past 0:00 |
| **Attribution** | Inspect track pill & attribution | Jamendo badge & CC BY-NC-ND 3.0 pill visible |
| **Homepage Check** | Open `/`, click Track 1 ("One Kiss") | Dock displays `• Unavailable`; 0 console 403 errors |
| **Social Routing** | Open `/explore`, test `/playlist/invalid-id` | Empty state renders cleanly; invalid ID shows 400 |

---

## 3. Production Gate Policy
This branch is maintained as an isolated release branch. Direct promotion to Production is withheld pending review.
