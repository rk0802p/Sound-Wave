# SOUNDWAVE — Production Playback Fix Log & Code Diffs

**Document ID:** SW-FIX-LOG-2026-11-05  
**Baseline Commit:** `2af1513d167ecc98a963cccd5e927f2cfbe87132`  
**Modified Files Count:** 7 files in `music-playlist-frontend-vue/`  
**Backend Modifications:** 0 files (backend architecture already provides 100% compliant isolation and validation)

---

## 1. File Changes Summary

| File | Subsystem | Nature of Modification |
|---|---|---|
| `src/stores/player.js` | Audio Engine Store | In-flight resolution deduplication, blocked providers set, fast-fail without 403 network spam, honest `unavailable` state. |
| `src/components/player/FloatingPlayerDock.vue` | UI Player Controls | Display honest `• Unavailable` status badge when track provider is quarantined. |
| `src/components/featured/FeaturedMusicSection.vue` | Homepage Catalog | Provide honest toast feedback when playing unavailable tracks in production. |
| `src/data/moodPlaylists.js` | Library Architecture | Strip `archive-` synthetic prefix from mood identifiers to restore valid 24-char ObjectId format. |
| `src/views/HomeView.vue` | Navigation & Home | Distinguish mood playlists (`/?playlist=:id`) from user mixtape preview routes (`/playlist/:id`). |
| `src/views/PlaylistPreviewView.vue` | Social Mixtape Preview | Dynamic HTTP status code rendering (400, 401, 403, 404), mood playlist fallback handler, eliminate false toasts. |
| `src/views/SearchView.vue` | Search & Discovery | Complete bubbly pastel glassmorphic reconstruction; eliminate premature false playing toasts; wire player states. |

---

## 2. Detailed Technical Diffs & Rationale

### 2.1 `src/stores/player.js`
* **Rationale:** Prevent repeated Axios 403 errors and unhandled promise rejections when users attempt to play tracks from quarantined or unconfigured providers (e.g. JioSaavn in production).
* **Changes:**
  - Added module-level `activeResolutions` map to deduplicate concurrent resolution requests for the same track.
  - Added `blockedProviders` set to track providers returned as unconfigured or 403.
  - Implemented `syncProviderCapabilities()` to proactively query `/api/search/providers/health` on initial load.
  - In `resolveWithDedup(provider, trackId)`: Fast-fails immediately if provider is in `blockedProviders` without dispatching HTTP requests.
  - On receiving 403 `PROVIDER_UNCONFIGURED`, automatically adds the provider to `blockedProviders` and sets `playbackState = 'unavailable'`.
  - Blocked providers are excluded from alternative fallback loops (`tryAlternativeFallback`), eliminating infinite retry cycles.

```javascript
// Excerpt from src/stores/player.js
const activeResolutions = new Map();
const blockedProviders = new Set();

function isProviderBlocked(provider) {
  return blockedProviders.has(provider);
}

async function resolveWithDedup(provider, trackId) {
  if (isProviderBlocked(provider)) {
    return {
      streamUrl: null,
      error: `Provider '${provider}' is disabled or unconfigured in this environment`,
      code: 'PROVIDER_UNCONFIGURED'
    };
  }
  const key = `${provider}:${trackId}`;
  if (activeResolutions.has(key)) {
    return activeResolutions.get(key);
  }
  const promise = searchApi.resolveTrack(provider, trackId)
    .then(res => {
      activeResolutions.delete(key);
      return res;
    })
    .catch(err => {
      activeResolutions.delete(key);
      if (err.response?.status === 403 && err.response?.data?.code === 'PROVIDER_UNCONFIGURED') {
        blockedProviders.add(provider);
      }
      return {
        streamUrl: null,
        error: err.response?.data?.message || err.message,
        code: err.response?.data?.code || 'RESOLUTION_FAILED'
      };
    });
  activeResolutions.set(key, promise);
  return promise;
}
```

---

### 2.2 `src/components/player/FloatingPlayerDock.vue`
* **Rationale:** Allow the persistent floating player dock to honestly reflect when a track cannot be played due to environment-level provider quarantine.
* **Changes:**
  - Updated computed property `isUnavailable` to include `playerStore.playbackState === 'unavailable'`.
  - Dock indicator displays `• Unavailable` with dimmed track title instead of remaining stuck in "Loading..." or "Playing".

```javascript
// Excerpt from src/components/player/FloatingPlayerDock.vue
const isUnavailable = computed(() => {
  return (
    playerStore.playbackState === 'unavailable' ||
    Boolean(
      playerStore.currentTrack?.isUnavailable ||
      (playerStore.currentTrack?.needsResolution === false &&
        !playerStore.currentTrack?.url &&
        !playerStore.currentTrack?.streamUrl)
    )
  );
});
```

---

### 2.3 `src/components/featured/FeaturedMusicSection.vue`
* **Rationale:** Give users explicit, non-crashing feedback when a homepage track cannot be streamed in the current deployment environment.
* **Changes:**
  - Added honest toast message in `handlePlayTrack`:
    `toastStore.warn(`"${track.title}" is currently unavailable for playback in this environment.`);`

---

### 2.4 `src/data/moodPlaylists.js`
* **Rationale:** The synthetic `archive-` prefix previously prepended to mood playlist IDs broke MongoDB ObjectId schema validation (`24-character hexadecimal string required`).
* **Changes:**
  - Stripped `archive-` prefix from `_id` on all 5 mood definitions:
    - `archive-67c000000000000000000001` → `67c000000000000000000001`
    - `archive-67c000000000000000000002` → `67c000000000000000000002`
    - `archive-67c000000000000000000003` → `67c000000000000000000003`
    - `archive-67c000000000000000000004` → `67c000000000000000000004`
    - `archive-67c000000000000000000005` → `67c000000000000000000005`
  - Added `isMood: true` flag to allow instant classification.

---

### 2.5 `src/views/HomeView.vue`
* **Rationale:** In the navigation drawer, clicking a mood playlist previously routed to `/playlist/:id` as if it were a server-stored user mixtape, leading to 404/400 errors.
* **Changes:**
  - Created `getPlaylistLink(p)` helper:
    - If `p.isMood || p._id?.startsWith('67c00000000000000000000')`, routes to `/?playlist=${p._id || p.id}` to activate the mood filter directly on the homepage.
    - If user-created server playlist, routes to `/playlist/${p._id}`.

---

### 2.6 `src/views/PlaylistPreviewView.vue`
* **Rationale:** Prevent false 403 errors when viewing invalid IDs or curated mood playlists, and ensure error states reflect reality.
* **Changes:**
  - Replaced hardcoded `403` glyph with dynamic `errorCode` (400, 401, 403, 404).
  - In `loadPlaylist`: If the requested ID matches a curated mood definition, it renders the playlist locally as a curated public mixtape fallback without displaying an error.
  - Differentiated error descriptions for 400 (Invalid Mixtape Link), 401 (Login Required), 403 (Private Mixtape), and 404 (Mixtape Not Found).
  - Removed premature "Playing mixtape..." toast from `playAll()`.

---

### 2.7 `src/views/SearchView.vue`
* **Rationale:** Reconcile visual design drift with the rest of the application and eliminate premature "playing" toasts.
* **Changes:**
  - Injected background wash `<div class="wash">` and pastel blobs `<div class="bgb">` bound to dynamic player tinting.
  - Replaced neo-brutalist CSS tokens (`2px solid #111`, sharp corners) with rounded glassmorphic elements (`border-radius: 28px`, `backdrop-filter: blur(20px)`).
  - Restyled search input container with translucent glass and cyan glowing focus state.
  - Fixed play handler to only emit informational toasts when `playerStore.isPlaying` is confirmed or report an honest unavailable warning.
