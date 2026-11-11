# Soundwave App Shell Audit (`main` @ `a63f988`)

Audit performed per `PLAYLIST_SHELL_FIX.md` Section 1 & Prompt S0 (no application code modified).

---

## Summary of Findings

Confirmed against the current `main` branch:
1. **`AppLayout.vue` is only a minimal wrapper** (renders `<slot />`, `<ToastContainer />`, and `<KeyboardShortcutsModal />`). It renders no sidebar, no top bar, no player bar/`FloatingPlayerDock`, and no queue drawer.
2. **All neo-brutalist shell chrome lives inside `HomeView.vue`**: the left sidebar (`.jb-sidebar`), sticky top bar (`.jb-topbar`), bottom player bar (`.jb-player-bar`), queue drawer (`.jb-queue-drawer`), audio settings modal, and genre/mood filter state are all defined locally inside `HomeView.vue`.
   - *Important nuance on current branch vs. zip snapshot:* `HomeView.vue` does **not** import `FloatingPlayerDock.vue`; instead, it renders its own neo-brutalist `<footer class="jb-player-bar">` (lines 451–537), which is the player bar shown in the "before" screenshot. Meanwhile, `SearchView.vue` and `ExploreView.vue` still import and render the older glass `FloatingPlayerDock.vue`.
3. **Why `/playlist/:id` has no sidebar or dock:**
   - Previously, clicking a playlist navigated to `/?playlist=<id>`, which was rendered inside `HomeView.vue` (inheriting Home's sidebar, top bar, and player bar).
   - Now `router/index.js` routes `/playlist/:id` directly to `PlayListView.vue` (lines 36–40) and explicitly redirects `/?playlist=<id>` (for non-`mood-` IDs) to `/playlist/${playlistId}` (lines 81–90).
   - `App.vue` wraps non-auth routes in `AppLayout.vue`, which provides only `<slot />`, `ToastContainer`, and `KeyboardShortcutsModal`. `PlayListView.vue` renders its own standalone `.playlist-nav-bar` (`← BACK TO HOME`, breadcrumbs, `EXPLORE MIXTAPES ↗`) and `<UndoToast>`, with no sidebar, top bar queue/status controls, or player bar.

---

## Exact File & Line References

### 1. Root Layout & Router
- **`music-playlist-frontend-vue/src/App.vue`**
  - Lines `15`, `20–26`: `isAuthRoute` checks `route.path === '/login' || route.path === '/signup'`; non-auth routes wrap `<router-view>` in `AppLayout`, auth routes wrap in `'div'`.
  - Lines `4–8`: Renders `<component :is="layout"><router-view ... /></component>`.
- **`music-playlist-frontend-vue/src/components/layout/AppLayout.vue`**
  - Lines `2–9`: Renders `.soundwave-app` containing only `<slot></slot>`, `<ToastContainer />` (line `4`), and `<KeyboardShortcutsModal />` (lines `5–8`).
  - Lines `27–130`: Global `keydown` listener for player shortcuts (`Space`, `ArrowLeft/Right/Up/Down`, `M`, `S`, `R`, `?`).
- **`music-playlist-frontend-vue/src/router/index.js`**
  - Lines `8–57`: Routes for `/` (`HomeView`), `/library` (redirects to `/#lists`), `/search` (`SearchView`), `/explore` (`ExploreView`), `/playlist/:id` (`PlayListView`), `/login` (`LoginView`), `/signup` (`SignupView`).
  - Lines `81–90`: Navigation guard redirecting `/?playlist=<id>` (unless starting with `mood-`) to `/playlist/${playlistId}`.

### 2. Sidebar
- **Rendered ONLY in `music-playlist-frontend-vue/src/views/HomeView.vue`**
  - Lines `4–154`: `<aside class="jb-sidebar" :class="{ 'collapsed': isSidebarCollapsed }">`
    - Lines `6–24`: Brand logo (`SOUNDWAVE`) and collapse toggle (`isSidebarCollapsed`).
    - Lines `27–42`: Search input with `⌘K` badge.
    - Lines `45–70`: Primary nav links (`Home`, `Explore Mixtapes`, `Liked Tracks` count, `Search Catalog`).
    - Lines `73–89`: `COLLECTIONS` (genre counts computed from `FEATURED_SONGS`).
    - Lines `92–111`: `PLAYLISTS (count)` + `+ NEW` button + `<PlaylistSidebarMenu>` items (which emits `rename`, `duplicate`, `delete`).
    - Lines `114–130`: `MOODS` (`MOOD_PLAYLISTS`).
    - Lines `133–153`: Footer with `⚙️ AUDIO SETTINGS` button, authenticated user chip + `EXIT`, or `LOG IN` / `SIGN UP`.
  - Lines `1089–1390`, `2623–2632`: `.jb-sidebar` styles & mobile breakpoint (`@media (max-width: 768px)` collapses to stacked width `100%`; no `<1100px` collapse or mobile hamburger drawer exists yet).
- **Local filter & sidebar state in `HomeView.vue`**:
  - Lines `684–697`: `isSidebarCollapsed`, `isQueueOpen`, `searchQuery`, `selectedGenreFilter`, `activeFilter`, `activeMood`, `showCreateModal`, `showSettingsModal`, `showDeleteConfirm`, `playlistToDelete`.
  - Lines `979–1027`: Sidebar playlist menu handlers (`handleSidebarRename`, `handleSidebarDuplicate`, `confirmSidebarDelete`), currently living inside `HomeView.vue`. Note line `1019` redirects on delete to `/library` (which redirects to `/#lists`).
- **`music-playlist-frontend-vue/src/components/playlists/PlaylistSidebarMenu.vue`**
  - Lines `1–46`: Renders each sidebar playlist row with `•••` menu (`Rename`, `Duplicate`, `Copy Share Link`, `Delete`) and active state check (`lines 72–76`). Currently only imported by `HomeView.vue` (line `666`).

### 3. Top Bar
- **HomeView Top Bar**: `music-playlist-frontend-vue/src/views/HomeView.vue`
  - Lines `159–180`: `<header class="jb-topbar">` with breadcrumb (`SOUNDWAVE / {{ activeBreadcrumb }}`), `QUEUE (n)` toggle button, and `JAMENDO CC` status pill.
  - Lines `1470–1535`: `.jb-topbar` sticky header CSS (`height: 68px`).
- **PlayListView Standalone Nav Bar**: `music-playlist-frontend-vue/src/views/PlayListView.vue`
  - Lines `4–18`: `<nav class="playlist-nav-bar">` with `← BACK TO HOME`, breadcrumbs (`SOUNDWAVE / PLAYLIST / name`), and `EXPLORE MIXTAPES ↗`. No queue button, no Jamendo status pill, no sidebar toggle.
  - Lines `410–507`: `.playlist-nav-bar` styles.
- **SearchView Standalone Top Nav**: `music-playlist-frontend-vue/src/views/SearchView.vue`
  - Lines `12–23`: `<nav class="search-top-nav">` with `← BACK TO HOMEPAGE`, `SOUNDWAVE ONLINE DISCOVERY`, and `UP NEXT QUEUE (n)`.
- **ExploreView Standalone Top Nav**: `music-playlist-frontend-vue/src/views/ExploreView.vue`
  - Lines `4–15`: `<nav class="explore-top-nav">` with `← BACK TO HOMEPAGE`, `SOUNDWAVE SOCIAL DISCOVERY`, and `ONLINE SEARCH ↗`.

### 4. Player Bar / `FloatingPlayerDock`
- **Views importing `FloatingPlayerDock.vue`**:
  - `music-playlist-frontend-vue/src/views/SearchView.vue`: imported at line `467`, rendered at lines `453–455` (`<FloatingPlayerDock @toggle-queue="showQueueDrawer = !showQueueDrawer" />`).
  - `music-playlist-frontend-vue/src/views/ExploreView.vue`: imported at line `228`, rendered at line `218` (`<FloatingPlayerDock />`, without `@toggle-queue` wired).
- **Separate inline player bar in `HomeView.vue`** (does **not** import `FloatingPlayerDock.vue`):
  - `music-playlist-frontend-vue/src/views/HomeView.vue` lines `451–537`: `<footer class="jb-player-bar font-mono" role="region" aria-label="Persistent Audio Player">` (neo-brutalist footer, `height: 88px` at lines `2208–2222`, matches the "before" screenshot).
- **Missing from `PlayListView.vue`**:
  - `PlayListView.vue` neither imports `FloatingPlayerDock.vue` nor renders `.jb-player-bar`, while `AppLayout.vue` has no player component.
- **Standalone/Shared Player Component**:
  - `music-playlist-frontend-vue/src/components/player/FloatingPlayerDock.vue` (glassmorphic `.dock.glass` player). Because it is mounted separately inside `SearchView` and `ExploreView` (and unmounted when navigating away), each view mounts/unmounts its own player UI instead of sharing a persistent dock in the shell (though the underlying HTMLAudioElement/state lives in `src/stores/player.js`).

### 5. Queue Drawer
- **Duplicated in two views**:
  - `music-playlist-frontend-vue/src/views/HomeView.vue`: lines `541–571` (`<aside class="jb-queue-drawer font-mono">`), CSS at lines `2415–2470`, toggled by local `isQueueOpen` ref (line `685`).
  - `music-playlist-frontend-vue/src/views/SearchView.vue`: lines `393–450` (`<aside class="queue-drawer-panel glass">`), toggled by local `showQueueDrawer` ref (line `478`).
- **Absent from `ExploreView.vue`, `PlayListView.vue`, and `AppLayout.vue`**.

### 6. Toast Container & Undo Toast
- **`ToastContainer.vue`**:
  - Imported and rendered once inside `music-playlist-frontend-vue/src/components/layout/AppLayout.vue` (lines `4`, `15`).
  - `music-playlist-frontend-vue/src/components/common/ToastContainer.vue` lines `30–36`: positioned `fixed; bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px)); right: 20px; z-index: 9999;`. Hardcodes `5.5rem` (88px) instead of using a shell-managed `--dock-height` CSS variable (`calc(var(--dock-height, 88px) + 16px)`).
- **`UndoToast.vue`**:
  - Rendered locally inside `music-playlist-frontend-vue/src/views/PlayListView.vue` (lines `110–116`, `142`).
  - `music-playlist-frontend-vue/src/components/playlists/UndoToast.vue` lines `114–120`: positioned `fixed; bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px)); left: 50%; transform: translateX(-50%); z-index: 99999;`. Currently sits near the bottom where the player bar would be because `PlayListView.vue` renders no player dock, and uses hardcoded `5.5rem` instead of `var(--dock-height)`.

### 7. Auth Views
- `music-playlist-frontend-vue/src/views/LoginView.vue` and `SignupView.vue`: Full-page `.auth-page` layouts; `App.vue` lines `20–26` correctly exclude `AppLayout` on `/login` and `/signup`.

---

**Audit complete. Waiting for user instruction to proceed with Prompt S1 (build the shell).**
