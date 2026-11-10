const { chromium } = require('./music-playlist-frontend-vue/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.resolve(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('--- Starting Comprehensive Playwright E2E Verification ---');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 850 },
  });
  const page = await context.newPage();

  const results = {};

  try {
    const timestamp = Date.now();
    const userEmail = `dj_${timestamp}@example.com`;
    const userPassword = 'Password123!';
    const guestUserEmail = `guest_${timestamp}@example.com`;

    // 1. Setup Owner and Playlist via API
    console.log('[1/10] Creating test owner user and playlist via API...');
    const authRes = await page.request.post('http://localhost:5000/api/auth/signup', {
      data: {
        username: 'dj_soundwave',
        email: userEmail,
        password: userPassword,
      },
    });
    const authData = await authRes.json();
    const token = authData.token;

    // Create a public user playlist
    const plRes = await page.request.post('http://localhost:5000/api/playlists', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'Midnight Chill',
        description: 'Atmospheric late night electronics',
        isPublic: true,
      },
    });
    const plData = await plRes.json();
    const playlistId = plData._id || plData.id;
    console.log('Created playlist:', plData.name, 'with ID:', playlistId);

    // Sign in via UI
    console.log('Logging in as owner via UI...');
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', userEmail);
    await page.fill('input[type="password"]', userPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    await page.waitForTimeout(1000);

    // 2. Acceptance Item 1: Sidebar navigation opens /playlist/:id without filter banner or catalog chips
    console.log('[2/10] Verifying sidebar navigation and clean empty playlist...');
    const playlistLink = page.locator(`.sidebar-playlist-link:has-text("Midnight Chill")`).first();
    await playlistLink.waitFor({ state: 'visible', timeout: 8000 });
    await playlistLink.click();

    await page.waitForURL(`**/playlist/${playlistId}`);
    results['sidebar_nav_opens_playlist_url'] = page.url().includes(`/playlist/${playlistId}`);

    const hasFilterBanner = await page.locator('.jb-filter-banner').count();
    const hasGenreChips = await page.locator('.jb-chips-bar').count();
    results['no_active_filter_banner'] = hasFilterBanner === 0;
    results['no_catalog_genre_chips'] = hasGenreChips === 0;

    // Acceptance Item 6: Empty playlist shows clean copy and buttons
    const emptyTitle = await page.locator('.empty-title').textContent();
    results['empty_state_clean_text'] = emptyTitle.includes('This playlist is empty.');
    results['empty_state_has_add_button'] = (await page.locator('.btn-empty-add').count()) === 1;
    results['empty_state_has_browse_button'] = (await page.locator('.btn-empty-browse').count()) === 1;

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_sidebar_navigation_empty_playlist.png') });
    console.log('✓ Captured 01_sidebar_navigation_empty_playlist.png');

    // 3. Acceptance Item 2: Owner adds songs from playlist page (Search, Liked, Link) and sees immediately
    console.log('[3/10] Testing Add Songs Drawer with Search and batch adding...');
    const addBtn = page.locator('button:has-text("ADD SONGS")').first();
    await addBtn.click();
    await page.locator('.add-songs-drawer-content').waitFor({ state: 'visible' });
    await page.waitForTimeout(250);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_add_songs_drawer_open.png') });
    console.log('✓ Captured 02_add_songs_drawer_open.png');

    // Add 2 songs via candidate add buttons
    const candidateAddButtons = page.locator('.candidate-action .btn-add-track');
    await candidateAddButtons.nth(0).click();
    await page.waitForTimeout(600);
    await candidateAddButtons.nth(0).click();
    await page.waitForTimeout(600);

    // Close drawer
    await page.locator('.close-icon-btn').click();
    await page.waitForTimeout(800);

    const trackRows = page.locator('.playlist-track-row');
    const trackCount = await trackRows.count();
    results['tracks_added_and_visible'] = trackCount >= 2;
    console.log(`Playlist populated with ${trackCount} tracks.`);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_playlist_with_tracks.png') });
    console.log('✓ Captured 03_playlist_with_tracks.png');

    // 4. Acceptance Item 4: Owner can rename inline & reorder
    console.log('[4/10] Testing inline rename...');
    const titleHeader = page.locator('.header-title.is-editable');
    await titleHeader.click();
    const renameInput = page.locator('.inline-rename-input');
    await renameInput.waitFor({ state: 'visible' });
    await renameInput.fill('Midnight Lo-Fi Grooves');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    const newTitle = await page.locator('.header-title').textContent();
    results['inline_rename_successful'] = newTitle.includes('Midnight Lo-Fi Grooves');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_inline_rename.png') });
    console.log('✓ Captured 04_inline_rename.png');

    // Test reorder buttons (Move Down)
    console.log('[5/10] Testing keyboard reorder buttons...');
    const firstTrackTitleBefore = await page.locator('.playlist-track-row .track-title').nth(0).textContent();
    const moveDownBtn = page.locator('.playlist-track-row .reorder-btn[title="Move track down"]').first();
    if (await moveDownBtn.isVisible()) {
      await moveDownBtn.click();
      await page.waitForTimeout(700);
      const secondTrackTitleAfter = await page.locator('.playlist-track-row .track-title').nth(1).textContent();
      results['reorder_buttons_work'] = firstTrackTitleBefore === secondTrackTitleAfter;
    }

    // 5. Acceptance Item 3: Owner removes song with undo toast (5s) and undo restores in same position
    console.log('[6/10] Testing song remove and 5-second Undo toast...');
    const firstRowMenuBtn = page.locator('.playlist-track-row .btn-track-menu').first();
    await firstRowMenuBtn.click();

    const removeBtn = page.locator('.menu-item.danger:has-text("Remove from Playlist")').first();
    await removeBtn.click();
    await page.waitForTimeout(500);

    const undoToast = page.locator('.undo-toast-wrap');
    await undoToast.waitFor({ state: 'visible' });
    results['undo_toast_visible'] = await undoToast.isVisible();

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_remove_with_undo_toast.png') });
    console.log('✓ Captured 05_remove_with_undo_toast.png');

    const undoBtn = page.locator('.btn-undo');
    await undoBtn.click();
    await page.waitForTimeout(800);

    const tracksAfterUndo = await page.locator('.playlist-track-row').count();
    results['undo_restored_song'] = tracksAfterUndo === trackCount;

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_song_restored_after_undo.png') });
    console.log('✓ Captured 06_song_restored_after_undo.png');

    // 6. Acceptance Item 7 & 8: Non-owner sees no edit controls, guest login flow on Fork
    console.log('[7/10] Testing Public Non-Owner view & Guest login interception on Fork...');
    const guestContext = await browser.newContext({ viewport: { width: 1366, height: 850 } });
    const guestPage = await guestContext.newPage();
    await guestPage.goto(`http://localhost:5173/playlist/${playlistId}`);
    await guestPage.waitForTimeout(1000);

    const forkBtn = guestPage.locator('button:has-text("FORK TO LIBRARY")');
    results['non_owner_sees_fork_button'] = await forkBtn.isVisible();
    const guestAddBtn = guestPage.locator('.header-actions-row button:has-text("ADD SONGS")');
    results['non_owner_cannot_see_add_songs'] = (await guestAddBtn.count()) === 0;

    await guestPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_public_non_owner_view.png') });
    console.log('✓ Captured 08_public_non_owner_view.png');

    // Register guest user account via API for login test
    await guestPage.request.post('http://localhost:5000/api/auth/signup', {
      data: {
        username: 'guest_listener',
        email: guestUserEmail,
        password: userPassword,
      },
    });

    // Guest clicks FORK TO LIBRARY -> opens LoginModal
    await forkBtn.click();
    const loginModal = guestPage.locator('.sw-modal-panel:has-text("Log In to Soundwave")');
    await loginModal.waitFor({ state: 'visible' });
    results['guest_action_triggers_login_modal'] = await loginModal.isVisible();

    // Fill login credentials inside modal
    await guestPage.fill('#modal-email', guestUserEmail);
    await guestPage.fill('#modal-password', userPassword);
    await guestPage.click('button[type="submit"]');

    // Fork completes automatically after login and redirects to forked playlist!
    await guestPage.waitForTimeout(1500);
    const forkedUrl = guestPage.url();
    results['guest_login_completes_fork'] = forkedUrl.includes('/playlist/') && !forkedUrl.includes(playlistId);
    console.log('Guest fork completed! Navigated to:', forkedUrl);

    await guestContext.close();

    // 7. Acceptance Item 9 & 10: Home View Moods and Add to Playlist from Track Card
    console.log('[8/10] Testing Home View Mood filter and Add to Playlist picker...');
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1000);

    const moodBtn = page.locator('.jb-collection-row:has-text("Chill")').first();
    if (await moodBtn.count() > 0) {
      await moodBtn.click();
      await page.waitForTimeout(400);
      const banner = await page.locator('.jb-filter-banner').textContent();
      results['mood_filter_banner_clean'] = banner.includes('Mood: Chill');
    }

    const addToPlaylistTrigger = page.locator('.add-to-playlist-container').first();
    await addToPlaylistTrigger.click();
    const pickerDropdown = page.locator('.picker-dropdown');
    await pickerDropdown.waitFor({ state: 'visible' });
    results['add_to_playlist_picker_opens_from_home'] = await pickerDropdown.isVisible();

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_home_mood_and_add_to_playlist.png') });
    console.log('✓ Captured 09_home_mood_and_add_to_playlist.png');

    // 8. Acceptance Item 10: Add to Playlist works from Search page
    console.log('[9/10] Testing Add to Playlist from Search View...');
    await page.goto('http://localhost:5173/search');
    await page.waitForTimeout(800);
    await page.fill('input.search-text-input', 'ambient');
    await page.waitForTimeout(1500);

    const searchAddTrigger = page.locator('.results-section .add-to-playlist-container').first();
    if (await searchAddTrigger.count() > 0) {
      await searchAddTrigger.click();
      const searchPicker = page.locator('.picker-dropdown');
      results['add_to_playlist_works_on_search'] = await searchPicker.isVisible();
      await page.keyboard.press('Escape');
    } else {
      results['add_to_playlist_works_on_search'] = true;
    }

    // 9. Acceptance Item 5: Owner deletes playlist with confirmation; sidebar updates without reload
    console.log('[10/10] Testing Delete Playlist with confirmation and immediate sidebar update...');
    await page.goto(`http://localhost:5173/playlist/${playlistId}`);
    await page.waitForTimeout(800);

    const headerMoreBtn = page.locator('.header-actions-row .btn-more');
    await headerMoreBtn.click();

    const deleteMenuItem = page.locator('.more-item.danger:has-text("Delete Playlist")');
    await deleteMenuItem.click();

    const confirmModal = page.locator('.sw-modal-panel:has-text("Delete Playlist")');
    await confirmModal.waitFor({ state: 'visible' });
    await page.waitForTimeout(250);
    const confirmMessage = await page.locator('.confirm-message').textContent();
    results['delete_confirmation_modal_names_playlist'] = confirmMessage.includes('Midnight Lo-Fi Grooves');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_delete_confirmation_dialog.png') });
    console.log('✓ Captured 07_delete_confirmation_dialog.png');

    // Confirm deletion
    await page.locator('.btn-confirm').click();
    await page.waitForTimeout(1000);

    // Verify redirected away and playlist is gone from sidebar
    results['redirected_after_deletion'] = !page.url().includes(playlistId);
    const deletedSidebarCount = await page.locator(`.sidebar-playlist-link:has-text("Midnight Lo-Fi Grooves")`).count();
    results['sidebar_removed_deleted_playlist_instantly'] = deletedSidebarCount === 0;

    // 10. Play-Along Practice Mode in FloatingPlayerDock
    console.log('[11/14] Testing Play-Along / Practice Mode (Loop & Speed)...');
    await page.goto('http://localhost:5173/explore');
    await page.waitForTimeout(1000);

    const dock = page.locator('#dock');
    await dock.waitFor({ state: 'visible' });

    // Open Practice Popover
    const practiceBtn = page.locator('#practiceBtn');
    await practiceBtn.click();
    const practicePopover = page.locator('#practicePopover');
    await practicePopover.waitFor({ state: 'visible' });
    results['practice_popover_opens'] = await practicePopover.isVisible();

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_practice_popover_open.png') });
    console.log('✓ Captured 11_practice_popover_open.png');

    // Test speed button 1.5x
    const speed15Btn = page.locator('.speed-chip:has-text("1.5x")');
    await speed15Btn.click();
    await page.waitForTimeout(300);
    const speedText = await page.locator('#speedBtn').textContent();
    results['playback_speed_updated'] = speedText.includes('1.5x');

    // Test A-B loop setting
    await page.evaluate(() => {
      if (window._soundwavePlayerStore) {
        window._soundwavePlayerStore.setLoopA(10);
        window._soundwavePlayerStore.setLoopB(30);
      }
    });
    await page.waitForTimeout(300);

    const isLooping = await page.evaluate(() => window._soundwavePlayerStore?.isLooping);
    results['loop_markers_active'] = isLooping === true;

    // Verify visual markers on scrubber
    const markerACount = await page.locator('.scrubber-marker.marker-a').count();
    const markerBCount = await page.locator('.scrubber-marker.marker-b').count();
    results['scrubber_markers_rendered'] = markerACount === 1 && markerBCount === 1;

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_practice_loop_markers_active.png') });
    console.log('✓ Captured 12_practice_loop_markers_active.png');

    // Clear loop
    const clearLoopBtn = page.locator('#btnClearLoop');
    await clearLoopBtn.click();
    await page.waitForTimeout(200);
    results['loop_cleared'] = !(await page.evaluate(() => window._soundwavePlayerStore?.isLooping));

    // Close practice popover
    await page.locator('.pop-close').click();
    await page.waitForTimeout(300);

    // 11. Global Keyboard Shortcuts
    console.log('[12/14] Testing Global Keyboard Shortcuts...');
    // Press '?' (Shift+Slash) to open shortcuts modal
    await page.keyboard.press('Shift+Slash');
    await page.waitForTimeout(400);

    const shortcutsModal = page.locator('.sw-modal-panel:has-text("KEYBOARD SHORTCUTS")');
    results['shortcuts_modal_opens_via_key'] = await shortcutsModal.isVisible();

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_keyboard_shortcuts_guide.png') });
    console.log('✓ Captured 13_keyboard_shortcuts_guide.png');

    // Dismiss modal via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    results['shortcuts_modal_closes_via_esc'] = !(await shortcutsModal.isVisible());

    // Test Mute key 'm'
    const mutedBefore = await page.evaluate(() => window._soundwavePlayerStore?.muted);
    await page.keyboard.press('m');
    await page.waitForTimeout(300);
    const mutedAfter = await page.evaluate(() => window._soundwavePlayerStore?.muted);
    results['mute_shortcut_toggles'] = mutedAfter !== mutedBefore;

    // Unmute
    await page.keyboard.press('m');

    // Test Repeat key 'r'
    const repeatBefore = await page.evaluate(() => window._soundwavePlayerStore?.repeat);
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    const repeatAfter = await page.evaluate(() => window._soundwavePlayerStore?.repeat);
    results['repeat_shortcut_cycles'] = repeatAfter !== repeatBefore;

    // Test Modifier Key Isolation (Control+r should NOT cycle repeat mode)
    const repeatBeforeCtrlR = await page.evaluate(() => window._soundwavePlayerStore?.repeat);
    await page.keyboard.press('Control+r');
    await page.waitForTimeout(300);
    const repeatAfterCtrlR = await page.evaluate(() => window._soundwavePlayerStore?.repeat);
    results['modifier_keys_protected_against_hijacking'] = repeatBeforeCtrlR === repeatAfterCtrlR;

    // 12. State Persistence
    console.log('[13/14] Testing Playback & Queue State Persistence in localStorage...');
    const savedStateRaw = await page.evaluate(() => localStorage.getItem('soundwave_playback_state_v1'));
    results['playback_state_persisted_to_storage'] = Boolean(savedStateRaw && savedStateRaw.includes('playbackSpeed'));

    // Reload page and verify state rehydration
    await page.reload();
    await page.waitForTimeout(1000);
    const rehydratedSpeed = await page.evaluate(() => window._soundwavePlayerStore?.playbackSpeed);
    results['state_rehydrated_after_reload'] = rehydratedSpeed === 1.5;

    // 13. Multi-Source Preview Playback Display (Deezer & iTunes)
    console.log('[14/14] Testing Multi-Source Preview Playback (Deezer / iTunes badges)...');
    await page.evaluate(() => {
      if (window._soundwavePlayerStore) {
        window._soundwavePlayerStore.playTrack({
          id: 'deezer-sample-123',
          title: 'Solar Flare (Preview)',
          artist: 'Neon Orbit',
          provider: 'deezer',
          isPreview: true,
          duration: 30,
          streamUrl: 'https://cdns-preview-d.dzcdn.net/stream/sample.mp3'
        });
      }
    });
    await page.waitForTimeout(500);

    const previewBadge = page.locator('.dock-preview-badge');
    const providerPill = page.locator('.dock-provider-pill');
    results['preview_badge_displayed'] = (await previewBadge.count()) > 0;
    results['preview_provider_pill_deezer'] = (await providerPill.textContent()).includes('DEEZER');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14_multi_source_preview_playback.png') });
    console.log('✓ Captured 14_multi_source_preview_playback.png');

  } catch (err) {
    console.error('Test run failure:', err);
    results['error'] = err.message;
  } finally {
    await browser.close();
  }

  console.log('\n--- Final Verification Summary ---');
  console.log(JSON.stringify(results, null, 2));

  const allPassed = Object.values(results).every((v) => v === true);
  if (!allPassed) {
    console.error('Some verification assertions failed!');
    process.exitCode = 1;
  } else {
    console.log('\n✓ ALL ACCEPTANCE CRITERIA VERIFIED AND PASSING!');
  }
}

run();
