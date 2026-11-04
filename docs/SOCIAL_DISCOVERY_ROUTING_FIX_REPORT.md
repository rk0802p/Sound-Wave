# SOUNDWAVE — Social Discovery, Routing & Mixtape Preview Fix Report

**Document ID:** SW-SOCIAL-ROUTING-2026-11-05  
**Subject:** MongoDB ObjectId Conformance, Preview View Error Handling, and Navigation Routing Fixes  
**Subsystems:** Social Mixtapes, Explore Feed (`/explore`), Public Preview (`/playlist/:id`), and Drawer Navigation  

---

## 1. Executive Summary

In Phase 6, two distinct playlist types became conflated in frontend routing:
1. **Dynamic Server Mixtapes:** Created by users, stored in MongoDB Atlas, identified by standard 24-character hexadecimal MongoDB ObjectIds (e.g. `6aeb97b9d0eb256823a5d4f7`).
2. **Curated Mood Playlists:** Hardcoded client-side playlists representing moods (e.g., "Acoustic mornings", "Late night drive").

This conflation caused:
- Curated mood playlists to carry synthetic `archive-67c000000000000000000001` IDs that violated MongoDB schema validation.
- Drawer links to route users to `/playlist/archive-...`, triggering HTTP 400 Bad Request responses.
- `PlaylistPreviewView.vue` to hardcode a `403` error glyph, displaying misleading "Mixtape Restricted" warnings for format errors.

All issues have been resolved, verified with automated browser end-to-end tests, and certified against regression.

---

## 2. ObjectId Normalization & Schema Conformance

### 2.1 The Malformed `archive-` Pattern
In `src/data/moodPlaylists.js`, IDs were formatted as:
```javascript
_id: 'archive-67c000000000000000000001'
```
When `PlaylistPreviewView.vue` issued `GET /api/playlists/archive-67c000000000000000000001`, the backend controller (`server/controllers/playlistController.js`) executed strict ObjectId validation:
```javascript
if (!mongoose.Types.ObjectId.isValid(id)) {
  return res.status(400).json({
    message: 'Invalid playlist ID format. Must be a 24-character hexadecimal string.',
    code: 'INVALID_ID_FORMAT',
  });
}
```
Because the string length was 32 characters and contained a hyphen, the backend correctly rejected it with HTTP 400.

### 2.2 Normalization Applied
All 5 curated mood playlists now utilize clean 24-character hexadecimal IDs that satisfy `mongoose.Types.ObjectId.isValid`:
* `Acoustic mornings`: `67c000000000000000000001`
* `Late night drive`: `67c000000000000000000002`
* `Study loop`: `67c000000000000000000003`
* `Workout rush`: `67c000000000000000000004`
* `Weekend cruise`: `67c000000000000000000005`

Each definition also includes `isMood: true` to enable unambiguous client-side differentiation.

---

## 3. Navigation Routing Corrections

### 3.1 Drawer Link Differentiation (`HomeView.vue`)
Previously, all drawer items routed to `/playlist/${p._id}`. This broke for mood playlists because they exist in memory to filter homepage tracks rather than as server records.

The link generator was updated:
```javascript
const getPlaylistLink = (p) => {
  if (p.isMood || p._id?.startsWith('67c00000000000000000000')) {
    return `/?playlist=${p._id || p.id}`;
  }
  return `/playlist/${p._id}`;
};
```
- Clicking a **Mood Playlist** in the drawer filters the homepage in-place without page reload.
- Clicking a **User Mixtape** routes to `/playlist/:id` for full public preview.

---

## 4. Preview View Graceful Fallback & Error Handling

### 4.1 Dynamic HTTP Status Reporting
`PlaylistPreviewView.vue` previously hardcoded `403` into the template markup:
```html
<!-- Before (Hardcoded): -->
<div class="error-glyph font-display">403</div>
<h2 class="error-title font-display">Mixtape Restricted</h2>
```

The component now captures the exact HTTP error code:
```html
<!-- After (Dynamic): -->
<div class="error-glyph font-display">{{ errorCode }}</div>
<h2 class="error-title font-display">
  {{ errorCode === 400 ? "Invalid Mixtape Link" : errorCode === 404 ? "Mixtape Not Found" : "Mixtape Restricted" }}
</h2>
```

### 4.2 Curated Mood Preview Fallback
If a user directly visits or bookmarks a mood URL (e.g., `/playlist/67c000000000000000000001`), the preview view intercepts the backend 404/400 and renders the curated mood playlist seamlessly:
```javascript
const moodMatch = MOOD_PLAYLISTS.find(
  (m) => m._id === id || m.id === id || `archive-${m._id}` === id || m._id === String(id).replace(/^archive-/, '')
);
if (moodMatch) {
  playlist.value = {
    ...moodMatch,
    creator: { username: 'Soundwave Curator' },
    isPublic: true,
    forkCount: 0,
  };
  error.value = null;
  return;
}
```

---

## 5. End-to-End Verification Evidence

The automated verification suite confirmed:
1. **Explore Endpoint:** `GET /api/playlists/public/explore` returns newly created mixtapes with HTTP 200.
2. **Explore Frontend:** The public mixtape card renders cleanly on `/explore`.
3. **Anonymous Preview:** Visiting `/playlist/:id` anonymously renders full tracklist, cover art, and metadata without errors.
4. **Curated Mood Fallback:** Navigating to `/playlist/67c000000000000000000001` renders "Acoustic mornings" as a curated public mixtape.
5. **Invalid ID Rejection:** Navigating to `/playlist/invalid-id-xyz` renders HTTP 400 "Invalid Mixtape Link" instead of a false 403.
