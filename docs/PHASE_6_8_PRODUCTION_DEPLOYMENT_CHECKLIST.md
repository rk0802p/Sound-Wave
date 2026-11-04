# SOUNDWAVE — Phase 6.8 Production Deployment Checklist

**Release Target:** `main`  
**Source Branch:** `release/phase-6-incident-fix`  
**Date:** November 5, 2026  
**Status:** Certified locally & on Preview — Awaiting User Approval to Promote to Production

---

## 1. Release Identification

- **Release Branch:** `release/phase-6-incident-fix`
- **Base Commit:** `abbfc582a23fafc4ef42c7ceebf613c468f80dce`
- **Target Deployment:** Production (`https://music-playlist-pp8l.vercel.app/` & `https://music-playlist-nine.vercel.app/`)

---

## 2. Pre-Promotion Verification Checklist

| Gate | Requirement | Verified Result | Sign-off |
|---|---|---|---|
| **Gate 1: Backend Integrity** | 162/162 Jest tests passing across 9 suites | 162/162 passed in 35.21s | APPROVED |
| **Gate 2: Frontend Production Build** | Vite production bundle builds without errors | 134 modules transformed, 1.91s | APPROVED |
| **Gate 3: Secret Protection** | No API keys, JWT secrets, or DB credentials committed | 0 leaks detected by regex scanner | APPROVED |
| **Gate 4: Jamendo Live Audio** | Live playback of Jamendo CC tracks in browser | Confirmed in Edge: audio advances to 7.81s | APPROVED |
| **Gate 5: 18 Homepage Tracks** | Original tracklist preserved; 0 HTTP 403 loops | Fast-fail verified with 0 network calls | APPROVED |
| **Gate 6: Search Theme** | Bubbly pastel theme and glowing inputs intact | Preserved across 390px, 768px, 1280px | APPROVED |
| **Gate 7: Social Discovery** | Valid 24-char ObjectId routing and mood fallback | Verified: empty explore, 400 for invalid ID | APPROVED |
| **Gate 8: SPA Route Rewrites** | Vercel client-side routing on hard refresh | `vercel.json` rewrite rule added | APPROVED |

---

## 3. Deployment Procedure for Production

When the user authorizes promoting this release branch to `main`:

1. **Review Preview Deployment:**
   - Verify the Vercel Preview URL generated from `release/phase-6-incident-fix`.
   - Test `/search` with query `dandelion` and ensure the loading spinner smoothly transitions to audible playback.
   - Refresh the page while on `/search` to confirm that the SPA rewrite serves the application instead of a 404.

2. **Merge Branch:**
   ```bash
   git checkout main
   git merge release/phase-6-incident-fix --ff-only
   git push origin main
   ```

3. **Verify Production Deployment:**
   - Vercel automatically deploys the latest `main` commit to `https://music-playlist-pp8l.vercel.app/`.
   - Production backend is already active with `hasJamendoClient: true`.
   - Test live website to confirm incident closure.
