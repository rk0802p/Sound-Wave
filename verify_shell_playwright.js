const { chromium } = require('./music-playlist-frontend-vue/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.resolve(__dirname, 'docs', 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('--- Starting App Shell Acceptance Verification (Playwright) ---');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const checklist = {};

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    const ts = Date.now();
    const email = `shell_${ts}@example.com`;
    const password = 'Password123!';

    // Sign up user and create two playlists via API
    const authRes = await page.request.post('http://localhost:5000/api/auth/signup', {
      data: { username: 'shell_tester', email, password },
    });
    const authData = await authRes.json();
    const token = authData.token;

    const p1Res = await page.request.post('http://localhost:5000/api/playlists', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'my', description: 'Shell test mixtape', isPublic: false },
    });
    const p1 = await p1Res.json();
    const playlistId = p1._id || p1.id;

    // Add 2 songs so Undo toast + playback can be verified
    await page.request.post(`http://localhost:5000/api/playlists/${playlistId}/songs`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'Romantic acoustic piano',
        artist: 'DopasRec',
        duration: 132,
        provider: 'jamendo',
        providerTrackId: '1884527',
        url: 'https://prod-1.storage.jamendo.com/?trackid=1884527&format=mp31',
      },
    });
    await page.request.post(`http://localhost:5000/api/playlists/${playlistId}/songs`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'Midnight Echo',
        artist: 'Soundwave Studio',
        duration: 185,
        provider: 'jamendo',
        providerTrackId: '1884528',
        url: 'https://prod-1.storage.jamendo.com/?trackid=1884528&format=mp31',
      },
    });

    // Log in via UI
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(400);

    // Checklist 11: /login and /signup render without the shell
    const loginShellCount = await page.locator('.jb-app-shell, .jb-sidebar, .jb-topbar, #dock').count();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'after_login_no_shell_1440.png') });
    await page.goto('http://localhost:5173/signup');
    await page.waitForTimeout(300);
    const signupShellCount = await page.locator('.jb-app-shell, .jb-sidebar, .jb-topbar, #dock').count();
    checklist['11_auth_routes_no_shell'] = loginShellCount === 0 && signupShellCount === 0;

    // Sign in on /login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'after_home_1440.png') });

    // Start playback on Home and tag shell element identity to prove shell does not unmount
    await page.evaluate(() => {
      const dockEl = document.getElementById('dock');
      if (dockEl) dockEl.__shellInstanceTag = 'persistent-shell-v1';
      if (window._soundwavePlayerStore) {
        const s = window._soundwavePlayerStore;
        s.isPlaying = true;
        s.currentTime = 42;
      }
    });

    // Checklist 1 & 2: Home, Search, Explore, Liked, Playlist show same sidebar/topbar/dock & single instances
    const routesToCheck = [
      '/',
      '/search',
      '/explore',
      '/?filter=favorites',
      `/playlist/${playlistId}`,
    ];
    let allShellPresent = true;
    let allSingleDom = true;
    let shellPersisted = true;

    for (const r of routesToCheck) {
      await page.goto(`http://localhost:5173${r}`);
      // Use SPA navigation via router where possible or verify initial route check
      await page.waitForTimeout(500);
      const sidebarCount = await page.locator('.jb-sidebar').count();
      const topbarCount = await page.locator('.jb-topbar').count();
      const dockCount = await page.locator('#dock').count();
      const toastCount = await page.locator('.toast-container').count();
      if (sidebarCount !== 1 || topbarCount !== 1 || dockCount !== 1 || toastCount !== 1) {
        allShellPresent = false;
        allSingleDom = false;
      }
    }

    // Now test SPA navigation (without full browser reload) to verify audio/shell persistence
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const dockEl = document.getElementById('dock');
      if (dockEl) dockEl.__shellInstanceTag = 'spa-persisted';
      if (window._soundwavePlayerStore) {
        window._soundwavePlayerStore.currentTime = 37.5;
        window._soundwavePlayerStore.isPlaying = true;
      }
    });

    await page.locator('a.jb-nav-item:has-text("Explore Mixtapes")').click();
    await page.waitForURL('**/explore');
    await page.waitForTimeout(300);
    await page.locator('a.jb-nav-item:has-text("Search Catalog")').click();
    await page.waitForURL('**/search');
    await page.waitForTimeout(300);
    await page.locator(`.sidebar-playlist-link:has-text("my")`).first().click();
    await page.waitForURL(`**/playlist/${playlistId}`);
    await page.waitForTimeout(700);

    const spaCheck = await page.evaluate(() => {
      const dockEl = document.getElementById('dock');
      const s = window._soundwavePlayerStore;
      return {
        tagIntact: dockEl?.__shellInstanceTag === 'spa-persisted',
        timeIntact: s ? s.currentTime >= 37 : false,
        playingIntact: Boolean(s?.isPlaying),
      };
    });
    shellPersisted = spaCheck.tagIntact && spaCheck.timeIntact && spaCheck.playingIntact;

    checklist['1_all_routes_show_shell'] = allShellPresent;
    checklist['2_single_dock_queue_toast_per_page'] = allSingleDom;
    checklist['3_audio_and_shell_persist_across_navigation'] = shellPersisted;

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'after_playlist_shell_1440.png') });

    // Checklist 4: Playlist page has no Back to Home, no Explore Mixtapes button, and no filter banner
    const backHomeCount = await page
      .locator('.pg-unified-playlist .playlist-nav-bar, .pg-unified-playlist .nav-back-link, .pg-unified-playlist a:has-text("BACK TO HOME")')
      .count();
    const exploreNavCount = await page
      .locator('.pg-unified-playlist .nav-explore-link, .pg-unified-playlist a:has-text("EXPLORE MIXTAPES")')
      .count();
    const filterBannerCount = await page.locator('.jb-filter-banner').count();
    checklist['4_playlist_no_back_explore_or_filter_banner'] =
      backHomeCount === 0 && exploreNavCount === 0 && filterBannerCount === 0;

    // Checklist 5: Queue button opens drawer from playlist page (and only 1 drawer in DOM)
    await page.locator('.jb-queue-toggle-btn').click();
    await page.waitForTimeout(250);
    const drawerVisible = await page.locator('.jb-queue-drawer').isVisible();
    const drawerCount = await page.locator('.jb-queue-drawer').count();
    checklist['5_queue_button_opens_drawer_on_playlist'] = drawerVisible && drawerCount === 1;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'after_playlist_queue_open_1440.png') });
    await page.locator('.jb-drawer-close').click();
    await page.waitForTimeout(200);

    // Checklist 8: Undo toast appears above the dock, not behind it
    await page.locator('.playlist-track-row .btn-track-menu').first().click();
    await page.locator('.menu-item.danger:has-text("Remove from Playlist")').first().click();
    await page.waitForTimeout(400);
    const toastPos = await page.evaluate(() => {
      const undo = document.querySelector('.undo-toast-wrap');
      const dock = document.getElementById('dock');
      if (!undo || !dock) return null;
      const u = undo.getBoundingClientRect();
      const d = dock.getBoundingClientRect();
      return { undoBottom: u.bottom, dockTop: d.top, above: u.bottom <= d.top };
    });
    checklist['8_undo_toast_above_dock'] = Boolean(toastPos && toastPos.above);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'after_playlist_undo_toast_1440.png') });
    await page.locator('.btn-undo').click();
    await page.waitForTimeout(600);

    // Checklist 6: Clicking a collection on playlist page goes to Home with genre applied
    const firstCollectionBtn = page.locator('.jb-sidebar-section:has-text("COLLECTIONS") .jb-collection-row').first();
    const genreLabel = (await firstCollectionBtn.locator('.jb-collection-name').textContent()).trim();
    await firstCollectionBtn.click();
    await page.waitForURL((url) => url.pathname === '/' && url.searchParams.has('genre'));
    await page.waitForTimeout(400);
    const activeBannerText = await page.locator('.jb-filter-banner').textContent();
    checklist['6_collection_from_playlist_navigates_home_with_genre'] = activeBannerText.includes(genreLabel);

    // Return to playlist page and test Checklist 9: Keyboard shortcuts on shell pages (and ignored in inputs)
    await page.locator(`.sidebar-playlist-link:has-text("my")`).first().click();
    await page.waitForURL(`**/playlist/${playlistId}`);
    await page.waitForTimeout(500);

    const mutedBefore = await page.evaluate(() => window._soundwavePlayerStore?.muted);
    await page.keyboard.press('m');
    await page.waitForTimeout(200);
    const mutedAfter = await page.evaluate(() => window._soundwavePlayerStore?.muted);
    await page.keyboard.press('m');

    await page.keyboard.press('Shift+Slash');
    await page.waitForTimeout(300);
    const shortcutsVisible = await page.locator('.sw-modal-panel:has-text("KEYBOARD SHORTCUTS")').isVisible();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);

    // Ensure typing 'm' inside a text field on playlist page does NOT toggle mute
    const playlistFilterInput = page.locator('input[placeholder*="Search in this playlist"]');
    await playlistFilterInput.click();
    await page.keyboard.type('m');
    const mutedAfterInput = await page.evaluate(() => window._soundwavePlayerStore?.muted);
    await playlistFilterInput.fill('');
    await page.locator('.jb-topbar').click();

    checklist['9_keyboard_shortcuts_work_and_ignore_inputs'] =
      mutedAfter !== mutedBefore && shortcutsVisible && mutedAfterInput === mutedBefore;

    // Checklist 7: Sidebar "..." menu rename, duplicate, and delete open playlist redirects to Home
    const myRow = page.locator(`.sidebar-item-container:has(.sidebar-playlist-link .p-name:text-is("my"))`).first();
    await myRow.hover();
    await myRow.locator('.sidebar-menu-btn').click();
    await myRow.locator('.s-menu-item:has-text("Rename")').click();
    await page.locator('#sidebar-rename-input').fill('my-renamed');
    await page.locator('.jb-rename-save').click();
    await page.waitForTimeout(600);
    const renamedInSidebar = (await page.locator(`.sidebar-playlist-link .p-name:text-is("my-renamed")`).count()) === 1;
    const renamedBreadcrumb = await page.locator('.jb-topbar').textContent();

    // Duplicate from sidebar "..." menu
    const renamedRow = page.locator(`.sidebar-item-container:has(.sidebar-playlist-link .p-name:text-is("my-renamed"))`).first();
    await renamedRow.hover();
    await renamedRow.locator('.sidebar-menu-btn').click();
    await renamedRow.locator('.s-menu-item:has-text("Duplicate")').click();
    await page.waitForTimeout(700);
    const duplicatedInSidebar = (await page.locator(`.sidebar-playlist-link .p-name:has-text("my-renamed")`).count()) >= 2;

    // Delete open playlist from sidebar "..." menu -> updates list and redirects to Home
    await renamedRow.hover();
    await renamedRow.locator('.sidebar-menu-btn').click();
    await renamedRow.locator('.s-menu-item.danger:has-text("Delete")').click();
    await page.locator('.btn-confirm').click();
    await page.waitForURL('http://localhost:5173/');
    await page.waitForTimeout(600);
    const deletedStillPresent = (await page.locator(`.sidebar-playlist-link .p-name:text-is("my-renamed")`).count()) > 0;

    console.log('Item 7 subchecks:', {
      renamedInSidebar,
      renamedBreadcrumb,
      duplicatedInSidebar,
      deletedStillPresent,
      pathname: new URL(page.url()).pathname,
    });
    checklist['7_sidebar_menu_rename_dup_delete_redirects_home'] =
      renamedInSidebar &&
      renamedBreadcrumb.includes('my-renamed') &&
      duplicatedInSidebar &&
      !deletedStillPresent &&
      new URL(page.url()).pathname === '/';

    // Navigate back into duplicated playlist for 390px mobile test
    const dupLink = page.locator('.sidebar-playlist-link').first();
    await dupLink.click();
    await page.waitForURL('**/playlist/**');
    await page.waitForTimeout(500);

    // Checklist 10 & 12: 390px mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);

    const mobileOverflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        dockVisible: (() => {
          const d = document.getElementById('dock');
          if (!d) return false;
          const r = d.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.right <= 391;
        })(),
      };
    });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'after_playlist_390.png') });

    // Click hamburger to open mobile drawer
    await page.locator('.jb-hamburger-btn').click();
    await page.waitForTimeout(300);
    const mobileDrawerOpen = await page.locator('.jb-sidebar.mobile-open').isVisible();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'after_mobile_drawer_open_390.png') });

    checklist['10_mobile_390_hamburger_drawer_and_no_clip'] =
      mobileDrawerOpen &&
      mobileOverflow.dockVisible &&
      mobileOverflow.scrollWidth <= mobileOverflow.clientWidth + 1;

    checklist['12_screenshots_saved_1440_and_390'] = fs.existsSync(path.join(SCREENSHOTS_DIR, 'after_playlist_shell_1440.png')) &&
      fs.existsSync(path.join(SCREENSHOTS_DIR, 'after_playlist_390.png'));

    await context.close();
  } catch (err) {
    console.error('Shell verification error:', err);
    checklist['error'] = err.message;
  } finally {
    await browser.close();
  }

  console.log('\n--- App Shell Acceptance Checklist Summary ---');
  console.log(JSON.stringify(checklist, null, 2));

  const allPassed = Object.values(checklist).every((v) => v === true);
  if (!allPassed) {
    console.error('FAILED: One or more checklist items failed!');
    process.exitCode = 1;
  } else {
    console.log('\nALL APP SHELL ACCEPTANCE CHECKS PASSED!');
  }
}

run();
