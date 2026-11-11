# Soundwave: Put the Playlist Page Back Inside the App Shell

Put this in the repo root next to `PLAYLIST_FIX.md`. It fixes one problem: after the playlist rework, the playlist page opens as a standalone page with no sidebar, no top bar and no player. It must look and feel like the rest of the app, with all the new playlist features kept.

## 1. What went wrong

**Screenshots:**
- **Before** (Home in playlist-filter mode): left sidebar, top bar with breadcrumb, Queue button and Jamendo pill, content, and the player dock at the bottom.
- **After** (new `/playlist/:id` page): a "Back to Home" button, a breadcrumb, an "Explore mixtapes" button, the playlist card and the track list. **No sidebar. No player dock. No queue button.**

**Why (verified in the zip snapshot; the agent must confirm on the current branch):**
- There is no shared app shell. `components/layout/AppLayout.vue` is only an empty wrapper (a `<slot>` plus the toast container).
- The sidebar ("drawer": search box, Home, Explore, Liked, Collections, Playlists, Audio Settings, user chip) and the top bar are written **inside `HomeView.vue`**.
- The queue drawer is duplicated inside `HomeView.vue` and `SearchView.vue`.
- `FloatingPlayerDock` is imported separately by each view (Home, Search, Explore, old playlist preview). The new playlist page rendered neither the sidebar nor the dock.
- The "before" look only existed because the old playlist view was Home with a filter, which is why it carried Home's sidebar and dock.

**Consequences visible today:**
- Starting a song and opening a playlist leaves you with no controls on screen.
- Navigation to other sections requires "Back to Home".
- The undo toast sits where the dock would be, and will overlap it once the dock is back.

## 2. Target

One shared **AppShell** wraps every page except login and signup:

```
┌───────────────┬──────────────────────────────────────────┐
│ SideNav       │ TopBar: breadcrumb · Queue (n) · Jamendo │
│  search ⌘K    ├──────────────────────────────────────────┤
│  Home         │                                          │
│  Explore      │   <router-view />  (page content only)   │
│  Liked        │                                          │
│  Collections  │                                          │
│  Playlists +  │                                          │
│  Settings     │                                          │
│  user · Exit  ├──────────────────────────────────────────┤
│               │ FloatingPlayerDock (rendered once)       │
└───────────────┴──────────────────────────────────────────┘
        QueueDrawer (rendered once)   Toasts (above dock)
```

Pages become content only: Home, Search, Explore, Playlist, Library, Liked.

## 3. Requirements

**Shell**
- Sidebar, top bar, player dock, queue drawer, settings modal and toasts are rendered **once**, in the shell, not in individual views.
- Reuse the current sidebar, top bar and dock markup and styles from the "before" screenshot (same look). Do not redesign now.
- Navigating between pages never unmounts the shell, so audio, progress and the queue continue uninterrupted.
- Login and signup stay full-page without the shell.

**Sidebar**
- Search box with ⌘K, Home, Explore Mixtapes, Liked Tracks (count), Search Catalog.
- Collections (genre counts). From any page, clicking a collection goes to Home with that genre applied (`/?genre=Latin`). Genre and mood filters live in the URL or a small store, not in `HomeView` local state.
- Playlists (count) with **+ New**. Each item has a **… menu**: Rename, Duplicate, Share, Delete. The open playlist is highlighted. The list updates immediately after rename, create or delete.
- Audio Settings, user chip with Exit.
- Under about 1100px the sidebar collapses; on mobile it becomes a drawer opened from a hamburger in the top bar.

**Top bar**
- Breadcrumb that follows the route: `SOUNDWAVE / HOME`, `SOUNDWAVE / PLAYLIST / my`, `SOUNDWAVE / SEARCH`.
- Queue (n) button that opens the queue drawer from any page.
- Source pill (Jamendo CC).

**Playlist page content (keep everything from the new version)**
- Header card: cover tile, pills (`PLAYLIST`, `PRIVATE` or `PUBLIC`, `YOUR PLAYLIST`), inline-editable title, curator, song count and total time, buttons Play, Shuffle, Add songs, Share, "…" menu (edit details, public or private, duplicate, delete).
- Empty state ("This playlist is empty"), track rows with the "…" menu, drag or move buttons, Add songs drawer, undo toast, delete confirmation, fork for non-owners.
- **Remove** the "Back to Home" and "Explore mixtapes" buttons (the sidebar replaces them) and the page's own breadcrumb bar.
- Page content scrolls inside the shell; bottom padding equals the dock height so the last row is never hidden.

**Toasts and the undo bar**
- Anchored above the dock: bottom offset equals dock height plus 16px, and they never cover the dock's controls.

**Playback**
- The audio element and player store are independent of any view. Play a song on Home, open a playlist, start another song from it: the dock updates, with no restart and no duplicate audio.
- Keyboard shortcuts work on every page inside the shell, still ignoring text fields.

## 4. Tasks

1. **Audit first.** Confirm on the current branch where the sidebar, top bar, dock and queue drawer live and which views import `FloatingPlayerDock`. Write `SHELL_AUDIT.md` with file and line references.
2. **Create the shell.** Add `components/layout/AppShell.vue` and extract `SideNav.vue`, `TopBar.vue` and `QueueDrawer.vue` from `HomeView.vue` and `SearchView.vue`. Render `FloatingPlayerDock` and the toast container once in the shell. Replace `AppLayout` in `App.vue` with `AppShell` for every non-auth route (or use nested routes with the shell as the parent).
3. **Shell state.** Create a `ui` Pinia store for sidebar open, queue drawer open, settings modal and search palette. Move genre and mood filter state out of `HomeView` into route query parameters or a small store so the sidebar works from any page.
4. **Slim the views.** Remove sidebar, top bar, queue drawer and `FloatingPlayerDock` from `HomeView`, `SearchView`, `ExploreView` and the playlist view. Fix the layout CSS they relied on (`home-root` grid, fixed widths, padding).
5. **Playlist page.** Drop its standalone header and nav buttons, keep the header card and everything below, and make it render only inside the content area.
6. **Sidebar playlist menu.** Wire the "…" actions to the existing store actions and update the list in place.
7. **Responsive.** Sidebar collapse and mobile drawer, dock above content, safe-area padding.
8. **Toast position.** Offset above the dock using a CSS variable (`--dock-height`) set by the shell.
9. **Tests.** Component tests for the shell (renders once, dock present on every route), a router test (auth routes have no shell), and a Playwright run for the checks below.

## 5. Acceptance checklist

- [ ] Home, Search, Explore, Liked and Playlist all show the same sidebar, top bar and player dock.
- [ ] The DOM contains exactly one dock, one queue drawer and one toast container on every page.
- [ ] Playing a song and navigating between pages does not restart or interrupt the audio, and the dock keeps its progress.
- [ ] The playlist page shows no "Back to Home" or "Explore mixtapes" buttons and no filter banner.
- [ ] The Queue button opens the drawer from the playlist page.
- [ ] Clicking a collection on the playlist page goes to Home with that genre applied.
- [ ] Rename, duplicate and delete from the sidebar "…" menu update the list instantly, and deleting the open playlist redirects sensibly (Home).
- [ ] The undo toast appears above the dock, not behind it.
- [ ] Keyboard shortcuts (Space, arrows, M, S, R, ?) work on every shell page.
- [ ] At 390px: hamburger opens the sidebar drawer, the dock is usable, nothing is clipped.
- [ ] `/login` and `/signup` render without the shell.
- [ ] Before and after screenshots at 1440px and 390px are saved to `docs/screenshots/` and visually match the "before" layout plus the new playlist header.
- [ ] All existing playlist features (add songs drawer, undo, inline rename, delete confirm, fork, add-to-playlist menu) still pass their tests.

## 6. Prompts for the agent

### Prompt S0: audit (no code changes)
```
Read PLAYLIST_SHELL_FIX.md section 1. Do not change code. On the current branch, find where the sidebar, top bar, FloatingPlayerDock, queue drawer and toast container are rendered, and which views import them. Confirm why /playlist/:id has no sidebar or dock. Write SHELL_AUDIT.md with file and line references and wait.
```

### Prompt S1: build the shell
```
Do tasks 2 to 4 of PLAYLIST_SHELL_FIX.md: create AppShell, SideNav, TopBar and QueueDrawer by extracting the existing markup and styles (keep the current look), render the dock and toasts once in the shell, add the ui store, move genre and mood filters to the URL or a store, and remove the duplicated chrome from Home, Search and Explore. Do not touch playlist features yet. Show me how to verify, and give me a commit message.
```

### Prompt S2: playlist page and sidebar menu
```
Do tasks 5 to 8 of PLAYLIST_SHELL_FIX.md: make the playlist page content-only inside the shell, remove the Back to Home and Explore buttons, wire the sidebar playlist "…" menu, make it responsive, and anchor toasts above the dock. Keep every playlist feature working. Give me a commit message.
```

### Prompt S3: verify
```
Run task 9 and the acceptance checklist in section 5 of PLAYLIST_SHELL_FIX.md. Report each item as pass or fail with evidence, and save before and after screenshots at 1440px and 390px to docs/screenshots/. Run the backend, frontend and Playwright suites one command at a time and paste the real exit codes and summary lines. Fix failures and give a final commit message.
```

### If something fails
```
Stop. Do not change anything yet. Tell me what failed, the exact error, the most likely cause, and the smallest fix. Then wait for my go-ahead.
```
