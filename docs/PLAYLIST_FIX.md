# Soundwave: Playlist Page Fix (Frontend + Backend)

Put this in the repo root next to `REPO_FIX_PLAN.md`. It fixes the playlist page shown in the two screenshots and checks the backend routes behind it.

**How this was checked:** by reading the code in `music_playlist-main.zip` and comparing it with the two screenshots from the deployed site. The deployed site looks slightly newer than the zip (for example the screenshot says "Active filter" and the zip says "Filtering by"), so the agent must first confirm which branch is deployed (Phase 0). Nothing was run: no app, no tests, no network calls to the backend.

## 1. Direct answers

| Your question | Answer |
| --- | --- |
| Is this how it should look? | No. The page works as a catalog filter, not as a playlist page. |
| Why no "add song" button? | It does not exist on the playlist page. Songs can only be added from the Search page ("add to mixtape" picker). |
| Why no "delete playlist"? | Missing from the page. The code for it exists but is not reachable. |
| Why no "remove song" on the second screenshot? | The track card has only Play and a heart. No remove, no menu. |
| What is "Active filter"? | The playlist is displayed by reusing the Home page and filtering the 18 catalog songs, so it shows a "filter" banner. Opening your own playlist is not a filter, so this is the wrong design. |

Other problems visible in the screenshots:
- The empty playlist says "No audio frequencies found. No tracks match your current filter or search criteria." The real situation is "this playlist is empty".
- The genre chips (All 18, Electronic / Dance, English Pop, Hip-Hop, Latin) belong to the catalog, not to the user's playlist, and the sort chips (Curated, A-Z, Shortest) are the catalog's.
- The header calls your own playlist "Curated playlist: Custom curated music collection."
- The counter pill says "0 TRACKS" while a filter banner still says "Playlist: my" at the top, which is confusing.

## 2. Root causes found in the code

**Frontend (verified in the zip)**
1. `src/views/PlayListView.vue` is the full editor page with Shuffle, Add Audio Track, Edit, Delete and per-song remove and reorder. It is **not in the router**, so nobody can open it.
2. It also **cannot work as written**: it imports `components/playlists/AcousticTrackStream.vue`, which does **not exist** in the repo, and it calls store actions `fetchPlaylist`, `removeSong`, `deletePlaylist` and `reorderSongs`, which are **not defined**. `stores/playlist.js` has only `selectPlaylist`, `selectPlaylistById`, `fetchPlaylists`, `createPlaylist`, `addSong` and `clearUserCache`.
3. The router sends `/playlist/:id` to `PlaylistPreviewView.vue`, a read‑only page (fork, copy link, tracklist). Its "Edit in library" button goes to `/?playlist=<id>#lists`, which is the Home page in filter mode, with no editing tools.
4. `HomeView.vue` turns `?playlist=<id>` into `activeFilter = 'playlist'` and shows the filter banner and catalog chips. This path is only legitimate for built‑in **mood** playlists, not user playlists.
5. `src/api/playlists.js` already has `updatePlaylist`, `deletePlaylist`, `updateSong`, `deleteSong` and `reorderSongs`. The store just never calls them.
6. The only way to add a song is `SearchView.vue` (`addTrackToSelectedPlaylist`).

**Backend (verified by reading)**
- Routes exist and are protected correctly: `GET /api/playlists/:id` (owner, or public), `PUT` and `DELETE /api/playlists/:id` (owner only), `POST /:id/songs`, `PUT /:id/songs/:songId`, `DELETE /:id/songs/:songId`, `PUT /:id/songs/reorder`.
- `requirePlaylistOwner` checks the owner and returns 403 for others. `deleteSong` removes by the song's `_id` and renumbers positions. `deletePlaylist` deletes by id. `addSong` validates the source URL, detects duplicates by title and artist, external ID or URL, and returns 409 with `isDuplicate` unless `allowDuplicate` is sent.
- So **the backend can already do everything you asked for. The missing pieces are in the frontend.** The issues in section 5 are hardening and consistency, not blockers.

## 3. Target playlist page

One real page at `/playlist/:id`, replacing both `PlayListView.vue` and `PlaylistPreviewView.vue`. The page shows edit controls only when the API says the viewer is the owner.

**Header**
- Eyebrow `PLAYLIST` and a `PUBLIC` or `PRIVATE` pill. No "Curated playlist" wording on user playlists.
- Title (owner can click to rename inline), description, owner name, `N songs · total duration`.
- Buttons: **Play**, **Shuffle**, **Add songs** (owner), **Share** (copy link), and a **More (…)** menu with Edit details, Make public or private, Duplicate, Delete playlist. Non‑owners see Play, Shuffle, Share and **Fork to my library**.
- Delete opens a confirmation dialog naming the playlist ("Delete 'my'? This can't be undone."). After deletion: redirect to Library, remove it from the sidebar immediately, show a toast.

**No filter banner, no genre chips.** A playlist page may have a small "Search in this playlist" box and a sort control (Custom order, Title, Artist, Date added, Duration). Dragging to reorder is only enabled in Custom order. A filter‑style banner appears only when the user has typed a search inside the playlist ("Showing 3 of 12 · Clear").

**Empty state:** "This playlist is empty." Short line: "Add songs from search, your liked songs or a link." Two buttons: **Add songs** and **Browse the catalog**.

**Track rows**
`[drag handle] [#] [cover] [title + artist] [album] [source/license pill] [duration] [like] [… menu]`
- `…` menu: Play next, Add to queue, Add to another playlist, **Remove from this playlist**, Open on provider.
- Remove uses an **Undo toast (5 seconds)** instead of a browser `confirm()`. The undo re‑adds the song at its old position.
- Unavailable songs stay visible, greyed out, with the reason.
- Preview tracks show the `30s PREVIEW` pill.

**Add songs panel (drawer or modal)**
- Tab 1 **Search**: the same search as the Search page; each result has an **Add** button that turns into **Added ✓**; a song already in the playlist shows "Already added" and an "Add anyway" option.
- Tab 2 **Liked songs**: pick from likes.
- Tab 3 **Paste a link**: Jamendo, Audius or Internet Archive link, with the metadata preview before adding (uses the existing resolve route).
- Multi‑select with an "Add N songs" button.

**Everywhere else**
- Every song row on Home, Search, Album and Artist pages gets an **Add to playlist** menu item with a picker that also offers "Create new playlist".
- Sidebar playlist items get a `…` menu: Rename, Duplicate, Share, Delete.
- Built‑in **mood playlists** stay read‑only filters on Home, clearly labelled "Mood" and without edit buttons. They live in a separate "Moods" group, not under "Playlists".
- Guests who try to add, rename or delete get the login modal, and the action completes after login.

## 4. Frontend tasks

1. **Phase 0 audit.** Confirm which branch is deployed, whether its source matches the zip, and list the files behind the screenshots. Write `PLAYLIST_AUDIT.md`.
2. **Store.** Add to `stores/playlist.js`: `fetchPlaylist(id)`, `updatePlaylist`, `deletePlaylist`, `removeSong`, `restoreSong` (for undo), `updateSong`, `reorderSongs`, `duplicatePlaylist`, `forkPlaylist`, `addSongs` (batch). Each action updates `playlists` in place so the sidebar and counts refresh immediately. Remove the `localStorage` playlist mirror or make it a read cache invalidated on every mutation.
3. **Router.** Make `/playlist/:id` the single playlist page. Redirect `/?playlist=<id>` to `/playlist/<id>` unless the id starts with `mood-`. `/playlists/:id` stays as a redirect. Delete the dead `PlayListView.vue` or replace it with the new page.
4. **Components.** Create `PlaylistHeader`, `PlaylistTrackList` (replacing the missing `AcousticTrackStream`), `PlaylistTrackRow`, `AddSongsDrawer`, `ConfirmDialog`, `UndoToast`, `AddToPlaylistMenu`, `PlaylistSidebarMenu`. Reuse `AddSongModal`, `EditPlaylistModal` and `EditSongModal` where they fit.
5. **HomeView.** Remove the user‑playlist filter branch (`activeFilter === 'playlist'` for non‑mood lists). Keep the filter banner for genre, favourites, search and mood only, and reword it to describe the actual filter ("Genre: Latin", "Mood: Chill").
6. **Copy.** Replace "NO AUDIO FREQUENCIES FOUND" and similar jokes in empty and error states with plain text. Replace "Curated playlist" on user playlists with "Playlist" and "Your playlist".
7. **Accessibility.** Buttons labelled, the delete dialog traps focus, drag reorder has move up and move down buttons, the undo toast is announced politely.
8. **Style.** Keep the current look for now so this lands quickly. Build the new components with CSS variables so they can be restyled by `FRONTEND_DESIGN_SPEC.md` later.

## 5. Backend tasks (check first, then harden)

**Check (write a test for each, fix what fails)**
- Owner can create, rename, change visibility, delete a playlist; deleting removes it from `GET /api/playlists`.
- Owner can add, update, remove and reorder songs; non‑owner gets 403; unauthenticated gets 401.
- `DELETE /:id/songs/:songId` works with the song's `_id` and renumbers positions; invalid ids return 400; unknown ids return 404.
- Duplicate add returns 409 with `isDuplicate`; `allowDuplicate: true` adds it.
- `GET /api/playlists` returns a summary (id, name, description, `isPublic`, `songCount`, `totalDurationMs`, cover) and does not need to send every song for sidebar use. If it sends all songs, add a summary mode.

**Fix or add**
1. **Private playlists should return 404 to non‑owners**, not 403 with a message, so playlist existence is not revealed (change `requirePlaylistAccess`; keep 401 only where login would help).
2. **Store `provider` and `providerTrackId` on each song and resolve the stream URL at play time.** Today `addSong` stores the `url` from search results, and that link can go stale. Keep `url` as a fallback only.
3. **Extend the source model** for the planned preview providers: add `deezer` and `itunes` to the `source.provider` enum and to `parseMusicSource`, and add `isPreview` and `previewDurationMs` to the song schema. Remove the `youtube` enum value after checking stored data.
4. **Batch add:** `POST /api/playlists/:id/songs/batch` with up to 50 songs, returning added, duplicates and failures.
5. **Insert at position:** accept an optional `position` in `addSong` so undo can restore a removed song to its old spot.
6. **Duplicate playlist:** `POST /api/playlists/:id/duplicate`.
7. **Limits and validation:** name 1 to 80 characters, description up to 300, up to 100 playlists per user, up to 1,000 songs per playlist, trimmed and sanitized text, rate limits on write routes.
8. **Consistent responses:** every song mutation returns the updated playlist summary plus the changed song; errors use one shape with a `code` (for example `AUTH_REQUIRED`, `NOT_FOUND`, `DUPLICATE_TRACK`, `LIMIT_REACHED`).
9. **Tests:** extend the existing playlist tests for every item above, including cross‑user access.

## 6. Acceptance checklist

- [ ] Clicking a playlist in the sidebar opens `/playlist/<id>` with no "Active filter" banner and no catalog genre chips.
- [ ] An owner can add songs from the playlist page (search, liked songs, link) and sees them immediately.
- [ ] An owner can remove a song from the row menu, sees an undo toast, and undo restores it in the same position.
- [ ] An owner can rename inline, toggle public or private, reorder by drag or buttons.
- [ ] An owner can delete the playlist from the page and from the sidebar menu, with a confirmation, and the sidebar updates without a reload.
- [ ] The empty playlist shows "This playlist is empty" with Add songs and Browse buttons.
- [ ] Non‑owners see no edit controls and the API refuses edits; a private playlist returns 404 to others.
- [ ] Guests get the login modal when they try to add, rename or delete, and the action completes after login.
- [ ] Mood playlists remain read‑only and are labelled as moods.
- [ ] "Add to playlist" works from Home, Search and album rows.
- [ ] Backend tests cover section 5 and pass.

## 7. Prompts for the agent

### Prompt P0: audit (no code changes)
```
Read PLAYLIST_FIX.md. Do not change code. Confirm which branch and build the deployed site uses and whether the repo source matches the screenshots (the "Active filter" text is not in the zip I reviewed). Verify each frontend and backend finding in sections 2 and 5 against the code, with file and line references, and mark each as confirmed, wrong or partly wrong. Run the backend playlist tests and report. Write PLAYLIST_AUDIT.md and wait.
```

### Prompt P1: backend
```
Do the backend part of PLAYLIST_FIX.md section 5 only. First write the "Check" tests and report which fail. Then implement the Fix or add items 1 to 9 in order, with tests, without changing the frontend. Keep existing routes working. Give me a commit message and a short curl script that exercises create, add, batch add, remove, reorder, duplicate and delete.
```

### Prompt P2: store and routing
```
Do tasks 2 and 3 of PLAYLIST_FIX.md section 4: add the missing playlist store actions with in‑place updates, fix the router so /playlist/:id is the single playlist page and /?playlist=<id> redirects unless the id starts with mood‑, and remove the localStorage playlist mirror or make it an invalidated cache. Add unit tests for the store actions. Do not build new UI yet. Give me a commit message.
```

### Prompt P3: the playlist page
```
Do tasks 4 to 7 of PLAYLIST_FIX.md section 4 and the target in section 3: build the new playlist page with header, track list, row menu, undo‑on‑remove, add songs drawer, delete dialog, sidebar menu and the AddToPlaylistMenu on song rows in Home, Search and album views. Remove the user‑playlist filter path from HomeView and fix the filter banner wording. Replace the empty‑state jokes with plain copy. Tell me how to verify each acceptance item by hand and give me a commit message.
```

### Prompt P4: verify
```
Run through the acceptance checklist in PLAYLIST_FIX.md section 6 on the running app and report each item as pass or fail with evidence (steps, screenshot description, network request). Add a Playwright test covering create, add from search, add from the page, remove with undo, rename, delete and the guest login flow. Fix failures and give a final commit message.
```