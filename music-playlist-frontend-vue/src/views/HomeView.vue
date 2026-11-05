<template>
  <div class="jb-app-shell">
    <!-- LEFT PERSISTENT NEO-BRUTALIST SIDEBAR -->
    <aside class="jb-sidebar" :class="{ 'collapsed': isSidebarCollapsed }">
      <!-- Sidebar Header / Brand -->
      <div class="jb-sidebar-header">
        <router-link to="/" class="jb-brand">
          <div class="jb-logo-grid" aria-hidden="true">
            <span class="sq sq-blue"></span>
            <span class="sq sq-coral"></span>
            <span class="sq sq-sun"></span>
            <span class="sq sq-lime"></span>
          </div>
          <span v-if="!isSidebarCollapsed" class="jb-brand-text font-display">SOUNDWAVE</span>
        </router-link>
        <button
          class="jb-collapse-toggle font-mono"
          @click="isSidebarCollapsed = !isSidebarCollapsed"
          :title="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :aria-label="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          {{ isSidebarCollapsed ? '»' : '«' }}
        </button>
      </div>

      <!-- Search in Sidebar -->
      <div class="jb-search-box-wrap">
        <div class="jb-search-box" :class="{ 'collapsed': isSidebarCollapsed }">
          <svg class="jb-search-icon" viewBox="0 0 24 24"><path :d="ICONS.search" /></svg>
          <input
            v-if="!isSidebarCollapsed"
            v-model="searchQuery"
            type="search"
            placeholder="Search tracks, artists..."
            @input="handleSearchInput"
            @keydown.enter="handleSearchSubmit"
            class="jb-search-input font-mono"
          />
          <span v-if="!isSidebarCollapsed && !searchQuery" class="jb-key-cap font-mono">⌘K</span>
          <button v-if="!isSidebarCollapsed && searchQuery" class="jb-clear-search font-mono" @click="searchQuery = ''">✕</button>
        </div>
      </div>

      <!-- Navigation Links -->
      <div class="jb-sidebar-nav">
        <router-link to="/" class="jb-nav-item" :class="{ 'active': activeFilter === '' && !selectedGenreFilter && !activePlaylist }">
          <span class="jb-nav-tile tile-blue">⌂</span>
          <span v-if="!isSidebarCollapsed" class="jb-nav-label">Home</span>
        </router-link>

        <router-link to="/explore" class="jb-nav-item">
          <span class="jb-nav-tile tile-coral">🌐</span>
          <span v-if="!isSidebarCollapsed" class="jb-nav-label">Explore Mixtapes</span>
        </router-link>

        <button
          class="jb-nav-item"
          :class="{ 'active': activeFilter === 'favorites' }"
          @click="handleFilterFavorites"
        >
          <span class="jb-nav-tile tile-pink">♥</span>
          <span v-if="!isSidebarCollapsed" class="jb-nav-label">Liked Tracks</span>
          <span v-if="!isSidebarCollapsed && favoritesList.length" class="jb-nav-count font-mono">{{ favoritesList.length }}</span>
        </button>

        <router-link to="/search" class="jb-nav-item">
          <span class="jb-nav-tile tile-sun">🔍</span>
          <span v-if="!isSidebarCollapsed" class="jb-nav-label">Search Catalog</span>
        </router-link>
      </div>

      <!-- GENRE / COLLECTIONS SECTION -->
      <div class="jb-sidebar-section">
        <div v-if="!isSidebarCollapsed" class="jb-section-label font-mono">COLLECTIONS</div>
        <div class="jb-collections-list">
          <button
            v-for="(genre, idx) in availableGenres"
            :key="genre.name"
            class="jb-collection-row"
            :class="{ 'active': selectedGenreFilter === genre.name }"
            @click="handleSelectGenre(genre.name)"
            :title="genre.name"
          >
            <span class="jb-nav-tile" :style="{ backgroundColor: genre.color }">{{ genre.icon }}</span>
            <span v-if="!isSidebarCollapsed" class="jb-collection-name">{{ genre.name }}</span>
            <span v-if="!isSidebarCollapsed" class="jb-collection-count font-mono">{{ genre.count }}</span>
          </button>
        </div>
      </div>

      <!-- PLAYLISTS SECTION -->
      <div class="jb-sidebar-section">
        <div v-if="!isSidebarCollapsed" class="jb-section-label font-mono jb-split-label">
          <span>PLAYLISTS ({{ playlistStore.playlists.length }})</span>
          <button class="jb-mini-add-btn font-mono" @click="openCreateModal" title="New playlist">+ NEW</button>
        </div>
        <div class="jb-playlists-list">
          <button
            v-for="p in playlistStore.playlists"
            :key="p._id || p.id"
            class="jb-playlist-row"
            :class="{ 'active': activePlaylist && (activePlaylist._id === p._id || activePlaylist.id === p.id) }"
            @click="handleSelectPlaylist(p)"
            :title="p.name"
          >
            <span class="jb-nav-tile tile-lavender">🎵</span>
            <span v-if="!isSidebarCollapsed" class="jb-playlist-name">{{ p.name }}</span>
          </button>
        </div>
      </div>

      <!-- SIDEBAR FOOTER -->
      <div class="jb-sidebar-footer">
        <button
          v-if="!isSidebarCollapsed"
          class="jb-support-btn font-mono"
          @click="showSettingsModal = true"
        >
          ⚙️ AUDIO SETTINGS
        </button>

        <div v-if="!isSidebarCollapsed && authStore.isAuthenticated" class="jb-user-card font-mono">
          <div class="jb-user-info">
            <span class="jb-user-avatar">{{ userInitial }}</span>
            <span class="jb-username">{{ authStore.username }}</span>
          </div>
          <button class="jb-signout-btn font-mono" @click="handleLogout">EXIT</button>
        </div>
        <div v-else-if="!isSidebarCollapsed" class="jb-auth-box">
          <router-link to="/login" class="jb-auth-pill font-mono">LOG IN</router-link>
          <router-link to="/signup" class="jb-auth-pill fill font-mono">SIGN UP</router-link>
        </div>
      </div>
    </aside>

    <!-- RIGHT MAIN WORKSPACE -->
    <div class="jb-main-container">
      <!-- TOP STATUS / BREADCRUMB BAR -->
      <header class="jb-topbar">
        <div class="jb-topbar-left font-mono">
          <span class="jb-breadcrumb-root">SOUNDWAVE</span>
          <span class="jb-breadcrumb-sep">/</span>
          <span class="jb-breadcrumb-active">{{ activeBreadcrumb }}</span>
        </div>

        <div class="jb-topbar-right">
          <button
            class="jb-queue-toggle-btn font-mono"
            @click="handleToggleQueue"
            :title="`Up Next Queue (${playerStore.queue?.length || 0} tracks)`"
          >
            QUEUE ({{ playerStore.queue?.length || 0 }})
          </button>
          
          <div class="jb-status-chip font-mono">
            <span class="jb-status-dot"></span>
            <span>JAMENDO CC</span>
          </div>
        </div>
      </header>

      <!-- SCROLLABLE PAGE BODY -->
      <main class="jb-content-stage">
        <!-- FILTER NOTICE BANNER -->
        <div v-if="activeFilterBadge" class="jb-filter-banner font-mono">
          <span>ACTIVE FILTER: <strong>{{ activeFilterBadge }}</strong></span>
          <button class="jb-filter-clear-btn" @click="clearAllFilters">✕ RESET</button>
        </div>

        <!-- 1. JELLYKIT-INSPIRED CATEGORY HERO -->
        <section class="jb-hero-card" :style="{ backgroundColor: currentCategoryHeroColor }">
          <div class="jb-hero-meta">
            <div class="jb-hero-badge-row font-mono">
              <span class="jb-num-badge">{{ activePlaylist ? 'PLAYLIST' : selectedGenreFilter ? 'COLLECTION' : '01' }}</span>
              <span class="jb-cat-label">{{ activePlaylist ? 'CURATED PLAYLIST' : selectedGenreFilter ? selectedGenreFilter.toUpperCase() : 'VERIFIED AUDIO ARCHIVE' }}</span>
            </div>

            <h1 class="jb-hero-title font-display">
              {{ activePlaylist ? activePlaylist.name : selectedGenreFilter ? selectedGenreFilter.toUpperCase() : 'SOUNDWAVE' }}
            </h1>

            <p class="jb-hero-tagline">
              {{ activePlaylist ? (activePlaylist.description || 'Custom curated music collection.') : selectedGenreFilter ? `Explore curated ${selectedGenreFilter} audio streams.` : 'Open music discovery powered by Jamendo. Fully authorized Creative Commons streaming.' }}
            </p>

            <div class="jb-hero-foot-row font-mono">
              <span class="jb-dark-pill">{{ displayedTracks.length }} TRACKS</span>
              <span class="jb-live-tag">● ZERO-PIRACY CC STREAMING</span>
              <button
                v-if="activePlaylist && !isMoodPlaylist(activePlaylist)"
                class="jb-hero-del-btn font-mono"
                @click="handleDeleteActivePlaylist"
                title="Delete this playlist"
              >
                🗑️ DELETE PLAYLIST
              </button>
            </div>
          </div>

          <div class="jb-hero-watermark" aria-hidden="true">
            {{ heroWatermarkGlyph }}
          </div>
        </section>

        <!-- 2. FEATURED AUDIO RELEASES (3-UP) -->
        <section v-if="featuredSpotlightTracks.length && !selectedGenreFilter && !activePlaylist" class="jb-section">
          <div class="jb-section-head">
            <h2 class="jb-section-title font-display">FEATURED SPOTLIGHT</h2>
            <div class="jb-section-line"></div>
          </div>

          <div class="jb-featured-grid">
            <article
              v-for="(track, idx) in featuredSpotlightTracks"
              :key="track._id || track.id"
              class="jb-featured-card"
              :class="{ 'is-active': isCurrentTrack(track) }"
            >
              <div class="jb-card-eyebrow font-mono">
                <span>{{ (track.genre || 'ELECTRONIC').toUpperCase() }}</span>
                <span class="accent-mono">SPOTLIGHT {{ idx + 1 }}</span>
              </div>

              <!-- Striped Art Box -->
              <div class="jb-card-art-box" @click="handlePlayTrack(track, featuredSpotlightTracks, idx, $event)">
                <img
                  v-if="track.coverImage || track.artwork"
                  :src="track.coverImage || track.artwork"
                  :alt="track.title"
                  class="jb-card-cover"
                />
                <div v-else class="jb-art-fallback font-display">
                  {{ track.title.substring(0, 2).toUpperCase() }}
                </div>
                
                <button
                  class="jb-art-play-btn"
                  :title="isCurrentTrack(track) && playerStore.isPlaying ? 'Pause' : 'Play ' + track.title"
                >
                  {{ isCurrentTrack(track) && playerStore.isPlaying ? '❚❚' : '▶' }}
                </button>
              </div>

              <div class="jb-card-body">
                <h3 class="jb-card-title font-display" :title="track.title">{{ track.title }}</h3>
                <p class="jb-card-artist">{{ track.artist }}</p>

                <div class="jb-card-meta-row font-mono">
                  <span class="jb-mono-chip" @click="openLicenseModal(track)">{{ track.license?.badge || 'CC BY' }}</span>
                  <button
                    class="jb-open-action font-mono"
                    @click="handlePlayTrack(track, featuredSpotlightTracks, idx, $event)"
                  >
                    {{ isCurrentTrack(track) && playerStore.isPlaying ? 'PAUSE ❚❚' : 'PLAY →' }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- 3. MOST PLAYED / POPULAR COMPACT TRACKS -->
        <section v-if="popularTracks.length && !selectedGenreFilter && !activePlaylist" class="jb-section">
          <div class="jb-section-head">
            <h2 class="jb-section-title font-display">POPULAR ROTATION</h2>
            <div class="jb-section-line"></div>
          </div>

          <div class="jb-popular-grid">
            <div
              v-for="(track, idx) in popularTracks"
              :key="track._id || track.id"
              class="jb-popular-row"
              :class="{ 'is-active': isCurrentTrack(track) }"
              @click="handlePlayTrack(track, popularTracks, idx, $event)"
            >
              <div class="jb-pop-tile" :style="{ backgroundColor: getGenreColor(track.genre) }">
                <span v-if="isCurrentTrack(track) && playerStore.isPlaying">❚❚</span>
                <span v-else>▶</span>
              </div>
              <div class="jb-pop-info">
                <span class="jb-pop-title font-display">{{ track.title }}</span>
                <span class="jb-pop-artist font-mono">{{ track.artist }} · {{ formatDuration(track.duration) }}</span>
              </div>
              <span class="jb-pop-badge font-mono">{{ (track.genre || 'JAMENDO').toUpperCase() }}</span>
            </div>
          </div>
        </section>

        <!-- 4. ALL TRACKS CATALOG GRID WITH FILTERS & SORT CHIPS -->
        <section class="jb-section">
          <div class="jb-section-head">
            <div class="jb-head-left">
              <h2 class="jb-section-title font-display">{{ activePlaylist ? activePlaylist.name.toUpperCase() : selectedGenreFilter ? selectedGenreFilter.toUpperCase() : 'ALL TRACKS' }}</h2>
              <span class="jb-head-count font-mono">({{ displayedTracks.length }})</span>
            </div>
            <div class="jb-section-line"></div>
          </div>

          <!-- Sort & Filter Chips Row -->
          <div class="jb-chips-bar font-mono">
            <div class="jb-chips-group">
              <span class="jb-chips-label">SORT:</span>
              <button
                class="jb-filter-chip"
                :class="{ 'active': sortBy === 'default' }"
                @click="sortBy = 'default'"
              >
                CURATED
              </button>
              <button
                class="jb-filter-chip"
                :class="{ 'active': sortBy === 'title' }"
                @click="sortBy = 'title'"
              >
                A–Z
              </button>
              <button
                class="jb-filter-chip"
                :class="{ 'active': sortBy === 'duration' }"
                @click="sortBy = 'duration'"
              >
                SHORTEST
              </button>
            </div>

            <div class="jb-chips-group">
              <span class="jb-chips-label">GENRES:</span>
              <button
                class="jb-filter-chip"
                :class="{ 'active': selectedGenreFilter === '' }"
                @click="handleSelectGenre('')"
              >
                ALL ({{ allCuratedTracks.length }})
              </button>
              <button
                v-for="g in availableGenres.slice(0, 4)"
                :key="g.name"
                class="jb-filter-chip"
                :class="{ 'active': selectedGenreFilter === g.name }"
                @click="handleSelectGenre(g.name)"
              >
                {{ g.name.toUpperCase() }} ({{ g.count }})
              </button>
            </div>
          </div>

          <!-- EMPTY STATE -->
          <div v-if="displayedTracks.length === 0" class="jb-empty-box font-mono">
            <div class="jb-empty-glyph font-display">Ø</div>
            <h3 class="jb-empty-title font-display">NO AUDIO FREQUENCIES FOUND</h3>
            <p class="jb-empty-desc">No tracks match your current filter or search criteria.</p>
            <button class="jb-empty-btn font-mono" @click="clearAllFilters">RESET ALL FILTERS</button>
          </div>

          <!-- 4-COLUMN NEO-BRUTALIST CARDS GRID -->
          <div v-else class="jb-cards-grid">
            <article
              v-for="(track, idx) in displayedTracks"
              :key="track._id || track.id"
              class="jb-track-card"
              :class="{ 'is-active': isCurrentTrack(track) }"
            >
              <div class="jb-tc-top">
                <div class="jb-tc-art-wrap" @click="handlePlayTrack(track, displayedTracks, idx, $event)">
                  <img
                    v-if="track.coverImage || track.artwork"
                    :src="track.coverImage || track.artwork"
                    :alt="track.title"
                    class="jb-tc-img"
                    loading="lazy"
                  />
                  <div v-else class="jb-tc-fallback font-display">
                    {{ track.title.substring(0, 2).toUpperCase() }}
                  </div>
                  <div class="jb-tc-hover-play">
                    {{ isCurrentTrack(track) && playerStore.isPlaying ? '❚❚' : '▶' }}
                  </div>
                </div>

                <div class="jb-tc-badge-column font-mono">
                  <span class="jb-tc-badge" :style="{ backgroundColor: getGenreColor(track.genre) }">
                    {{ (track.genre || 'AUDIO').split('/')[0].trim().toUpperCase() }}
                  </span>
                  <span class="jb-tc-time">{{ formatDuration(track.duration) }}</span>
                </div>
              </div>

              <div class="jb-tc-body">
                <h4 class="jb-tc-title font-display" :title="track.title">{{ track.title }}</h4>
                <p class="jb-tc-artist" :title="track.artist">{{ track.artist }}</p>
              </div>

              <div class="jb-tc-footer font-mono">
                <button
                  class="jb-tc-action-btn"
                  @click="handlePlayTrack(track, displayedTracks, idx, $event)"
                >
                  {{ isCurrentTrack(track) && playerStore.isPlaying ? 'PAUSE' : 'PLAY ▶' }}
                </button>

                <div class="jb-tc-meta-cluster">
                  <button
                    class="jb-tc-fav-btn"
                    :class="{ 'active': favoritesList.includes(track.id || track._id) }"
                    @click.stop="toggleFavorite(track, $event)"
                    title="Favorite track"
                  >
                    ♥
                  </button>

                  <button
                    v-if="activePlaylist && !isMoodPlaylist(activePlaylist)"
                    class="jb-tc-del-btn"
                    @click.stop="handleRemoveSongFromActivePlaylist(track)"
                    title="Remove from playlist"
                  >
                    ✕
                  </button>

                  <a
                    v-if="isJamendoTrack(track) && getTrackSourceUrl(track)"
                    :href="getTrackSourceUrl(track)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="jb-tc-jamendo-link"
                    title="Open on Jamendo"
                    @click.stop
                  >
                    ↗
                  </a>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>

      <!-- JELLYKIT NEO-BRUTALIST BOTTOM PERSISTENT PLAYER BAR -->
      <footer class="jb-player-bar font-mono" role="region" aria-label="Persistent Audio Player">
        <!-- Left: Track info -->
        <div class="jb-pb-track">
          <div class="jb-pb-art">
            <img
              v-if="currentTrackArtwork"
              :src="currentTrackArtwork"
              :alt="currentTrackTitle"
              class="jb-pb-cover"
            />
            <div v-else class="jb-pb-fallback font-display">
              {{ currentTrackTitle.substring(0, 2).toUpperCase() }}
            </div>
          </div>
          <div class="jb-pb-text">
            <div class="jb-pb-title font-display" :title="currentTrackTitle">{{ currentTrackTitle }}</div>
            <div class="jb-pb-artist" :title="currentTrackArtist">{{ currentTrackArtist }}</div>
          </div>
          <button
            class="jb-pb-fav font-mono"
            :class="{ 'active': isFavorite }"
            @click="toggleFavorite(playerStore.currentTrack, $event)"
            title="Like track"
          >
            ♥
          </button>
        </div>

        <!-- Center: Controls & Progress -->
        <div class="jb-pb-controls">
          <div class="jb-pb-buttons">
            <button
              class="jb-btn-icon"
              @click="playerStore.cycleRepeat()"
              :title="'Repeat: ' + playerStore.repeat"
              :class="{ 'on': playerStore.repeat !== 'off' }"
            >
              🔁
            </button>
            <button class="jb-btn-icon" @click="playerStore.prevTrack()" title="Previous track">
              ⏮
            </button>
            <button class="jb-btn-play font-display" @click="handleTogglePlay($event)" title="Play / Pause">
              {{ playerStore.isPlaying ? '❚❚' : '▶' }}
            </button>
            <button class="jb-btn-icon" @click="playerStore.nextTrack()" title="Next track">
              ⏭
            </button>
            <button
              class="jb-btn-icon"
              @click="playerStore.toggleShuffle()"
              :title="'Shuffle: ' + (playerStore.shuffle ? 'On' : 'Off')"
              :class="{ 'on': playerStore.shuffle }"
            >
              🔀
            </button>
          </div>

          <div class="jb-pb-timeline">
            <span class="jb-pb-time">{{ formatDuration(playerStore.currentTime) }}</span>
            <div class="jb-pb-trackbar" @click="handleSeekClick($event)">
              <div class="jb-pb-fill" :style="{ width: playerStore.progressPercentage + '%' }"></div>
            </div>
            <span class="jb-pb-time">{{ formatDuration(playerStore.duration) }}</span>
          </div>
        </div>

        <!-- Right: Volume & Queue -->
        <div class="jb-pb-extras">
          <button class="jb-btn-icon" @click="playerStore.setMuted(!playerStore.muted)" title="Mute toggle">
            {{ playerStore.muted ? '🔇' : '🔊' }}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="playerStore.muted ? 0 : playerStore.volume"
            @input="playerStore.setVolume(Number($event.target.value))"
            class="jb-vol-slider"
            title="Volume"
          />
          <button class="jb-queue-pill font-mono" @click="handleToggleQueue">
            ≡ {{ playerStore.queue?.length || 0 }}
          </button>
        </div>
      </footer>
    </div>

    <!-- UP NEXT QUEUE DRAWER (NEO-BRUTALIST) -->
    <div v-if="isQueueOpen" class="jb-modal-backdrop" @click.self="isQueueOpen = false">
      <aside class="jb-queue-drawer font-mono">
        <div class="jb-drawer-head">
          <h3 class="jb-drawer-title font-display">UP NEXT QUEUE</h3>
          <button class="jb-drawer-close" @click="isQueueOpen = false">✕</button>
        </div>

        <div v-if="!playerStore.queue || playerStore.queue.length === 0" class="jb-empty-queue">
          NO TRACKS IN QUEUE.
        </div>

        <div v-else class="jb-queue-items">
          <div
            v-for="(t, qIdx) in playerStore.queue"
            :key="t._id || t.id || qIdx"
            class="jb-queue-row"
            :class="{ 'is-current': playerStore.trackIndex === qIdx }"
            @click="handlePlayQueueItem(qIdx)"
          >
            <span class="jb-qr-num">{{ qIdx + 1 }}</span>
            <div class="jb-qr-info">
              <span class="jb-qr-title font-display">{{ t.title || t[0] }}</span>
              <span class="jb-qr-artist">{{ t.artist || t[1] }}</span>
            </div>
            <button class="jb-qr-del" @click.stop="playerStore.removeFromQueue(qIdx)" title="Remove from queue">
              ✕
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- MODAL: CREATE PLAYLIST -->
    <CreatePlaylistModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="handlePlaylistCreated"
    />

    <!-- MODAL: LICENSE & ATTRIBUTION -->
    <div v-if="selectedInfoTrack" class="jb-modal-backdrop" @click.self="selectedInfoTrack = null">
      <div class="jb-dialog font-mono">
        <div class="jb-dialog-header">
          <span class="jb-dialog-tag">LEGAL & ATTRIBUTION</span>
          <button class="jb-dialog-close" @click="selectedInfoTrack = null">✕</button>
        </div>
        <div class="jb-dialog-body">
          <h3 class="font-display jb-dialog-title">{{ selectedInfoTrack.title }}</h3>
          <p class="jb-dialog-sub">By {{ selectedInfoTrack.artist }}</p>

          <div class="jb-dialog-field">
            <label>LICENSE</label>
            <div class="jb-dialog-val">{{ selectedInfoTrack.license?.name || 'Creative Commons' }}</div>
          </div>

          <div class="jb-dialog-field" v-if="selectedInfoTrack.license?.attribution">
            <label>ATTRIBUTION</label>
            <div class="jb-dialog-val quote">{{ selectedInfoTrack.license.attribution }}</div>
          </div>

          <div class="jb-dialog-field" v-if="selectedInfoTrack.source?.pageUrl">
            <label>JAMENDO VERIFICATION</label>
            <a :href="selectedInfoTrack.source.pageUrl" target="_blank" rel="noopener" class="jb-dialog-link">
              {{ selectedInfoTrack.source.pageUrl }} ↗
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: SETTINGS & AUDIO -->
    <div v-if="showSettingsModal" class="jb-modal-backdrop" @click.self="showSettingsModal = false">
      <div class="jb-dialog font-mono">
        <div class="jb-dialog-header">
          <span class="jb-dialog-tag">AUDIO ENGINE SETTINGS</span>
          <button class="jb-dialog-close" @click="showSettingsModal = false">✕</button>
        </div>
        <div class="jb-dialog-body">
          <div class="jb-setting-row">
            <strong>Persistent HTML5 Audio Engine</strong>
            <p>Active Provider: <code>DirectAudioProvider</code> (Jamendo CC Stream Only)</p>
          </div>
          <div class="jb-setting-row">
            <strong>Volume Memory</strong>
            <p>{{ Math.round(playerStore.volume * 100) }}% ({{ playerStore.muted ? 'Muted' : 'Unmuted' }})</p>
          </div>
          <div class="jb-setting-row">
            <strong>Playback Policy</strong>
            <p>Strict CC authorization, unverified providers rejected.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { usePlayerStore } from '../stores/player';
import { usePlaylistStore } from '../stores/playlist';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import { FEATURED_SONGS } from '../data/featuredSongs';
import CreatePlaylistModal from '../components/playlists/CreatePlaylistModal.vue';

const router = useRouter();
const route = useRoute();
const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const authStore = useAuthStore();
const toastStore = useToastStore();

// Icons
const ICONS = {
  search: 'M10.5 3a7.5 7.5 0 1 0 4.5 13.500l4.500 4.500 1.500-1.500-4.500-4.500A7.500 7.500 0 0 0 10.500 3zm0 2a5.500 5.500 0 1 1 0 11 5.500 5.500 0 0 1 0-11z',
};

// UI State
const isSidebarCollapsed = ref(false);
const isQueueOpen = ref(false);
const searchQuery = ref('');
const selectedGenreFilter = ref('');
const activeFilter = ref(''); // '' | 'favorites' | 'genre' | 'playlist'
const activePlaylist = ref(null);
const showCreateModal = ref(false);
const showSettingsModal = ref(false);
const selectedInfoTrack = ref(null);
const favoritesList = ref([]);
const sortBy = ref('default');

// Distinct Jellykit Category Colors
const GENRE_MAP = {
  'Electronic / Dance': { color: '#4D6BFF', icon: '⚡' },
  'English Pop': { color: '#FF6B5E', icon: '🌸' },
  'Reggaeton': { color: '#FFD84A', icon: '💃' },
  'Hip-Hop': { color: '#FFA23A', icon: '🔥' },
  'Indie Pop / Rock': { color: '#B8F23C', icon: '🎸' },
  'Latin Dance': { color: '#FF4F9A', icon: '✨' },
  'Latin Pop': { color: '#5DE3A6', icon: '🌴' },
};

const getGenreColor = (genre) => {
  if (!genre) return '#B9A6FF';
  return GENRE_MAP[genre]?.color || '#3FD8EA';
};

// Curated Track Catalog
const allCuratedTracks = computed(() => {
  return FEATURED_SONGS.map((t, idx) => ({
    ...t,
    genreColor: getGenreColor(t.genre),
  }));
});

// Available Genres with count
const availableGenres = computed(() => {
  const counts = {};
  allCuratedTracks.value.forEach((t) => {
    const g = t.genre || 'Electronic / Dance';
    counts[g] = (counts[g] || 0) + 1;
  });
  return Object.keys(counts).map((g) => ({
    name: g,
    count: counts[g],
    color: getGenreColor(g),
    icon: GENRE_MAP[g]?.icon || '🎵',
  }));
});

// Top 3 Spotlight Tracks
const featuredSpotlightTracks = computed(() => {
  return allCuratedTracks.value.slice(0, 3);
});

// Popular rotation (next 4)
const popularTracks = computed(() => {
  return allCuratedTracks.value.slice(3, 7);
});

// Displayed Tracks with filtering & sorting
const displayedTracks = computed(() => {
  let list = [...allCuratedTracks.value];

  // Active Playlist filter
  if (activeFilter.value === 'playlist' && activePlaylist.value) {
    const pSongs = activePlaylist.value.songs || [];
    if (pSongs.length > 0) {
      list = pSongs.map((s) => ({
        ...s,
        genreColor: getGenreColor(s.genre),
      }));
    } else {
      return [];
    }
  }

  // Favorites filter
  if (activeFilter.value === 'favorites') {
    list = list.filter((t) => favoritesList.value.includes(t.id || t._id));
  }

  // Genre filter
  if (selectedGenreFilter.value) {
    list = list.filter((t) => t.genre === selectedGenreFilter.value);
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(
      (t) =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.artist && t.artist.toLowerCase().includes(q)) ||
        (t.genre && t.genre.toLowerCase().includes(q))
    );
  }

  // Sort
  if (sortBy.value === 'title') {
    list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (sortBy.value === 'duration') {
    list.sort((a, b) => (a.duration || 0) - (b.duration || 0));
  }

  return list;
});

// Hero Color & Watermark
const currentCategoryHeroColor = computed(() => {
  if (activePlaylist.value) return '#B9A6FF';
  if (selectedGenreFilter.value) return getGenreColor(selectedGenreFilter.value);
  return '#FFD84A'; // Jellykit Signature Yellow
});

const heroWatermarkGlyph = computed(() => {
  if (activePlaylist.value) return 'PLAYLIST';
  if (selectedGenreFilter.value) return selectedGenreFilter.value.split('/')[0].trim().toUpperCase();
  return 'SOUNDWAVE';
});

const activeBreadcrumb = computed(() => {
  if (activePlaylist.value) return `PLAYLIST: ${activePlaylist.value.name.toUpperCase()}`;
  if (selectedGenreFilter.value) return `COLLECTION: ${selectedGenreFilter.value.toUpperCase()}`;
  if (activeFilter.value === 'favorites') return 'LIKED TRACKS';
  return 'DISCOVER MUSIC';
});

const activeFilterBadge = computed(() => {
  if (activeFilter.value === 'favorites') return 'LIKED TRACKS';
  if (activeFilter.value === 'playlist' && activePlaylist.value) return `PLAYLIST: "${activePlaylist.value.name}"`;
  if (selectedGenreFilter.value) return `GENRE: ${selectedGenreFilter.value}`;
  if (searchQuery.value.trim()) return `SEARCH: "${searchQuery.value.trim()}"`;
  return '';
});

const userInitial = computed(() => (authStore.username?.[0] || 'U').toUpperCase());

// Current Playing Metadata
const currentTrackArtwork = computed(() => {
  const t = playerStore.currentTrack;
  return t?.coverImage || t?.artwork || t?.albumArt || null;
});

const currentTrackTitle = computed(() => playerStore.currentTrack?.title || 'No Track Loaded');
const currentTrackArtist = computed(() => playerStore.currentTrack?.artist || 'Soundwave Jamendo Stream');
const isFavorite = computed(() => {
  const id = playerStore.currentTrack?.id || playerStore.currentTrack?._id;
  return id ? favoritesList.value.includes(id) : false;
});

// Playback Methods
const isCurrentTrack = (track) => {
  if (!playerStore.currentTrack || !track) return false;
  return (
    (track._id && playerStore.currentTrack._id === track._id) ||
    (track.id && playerStore.currentTrack.id === track.id) ||
    playerStore.currentTrack.title === track.title
  );
};

const handlePlayTrack = (track, list, index, event) => {
  if (event) event.stopPropagation();
  if (isCurrentTrack(track)) {
    playerStore.togglePlay();
  } else {
    playerStore.playTrack(track, list, index);
  }
};

const handleTogglePlay = (event) => {
  if (event) event.stopPropagation();
  playerStore.togglePlay();
};

const handleSeekClick = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  if (playerStore.duration) {
    playerStore.seek(pct * playerStore.duration);
  }
};

// Filter actions
const handleSelectGenre = (genreName) => {
  activePlaylist.value = null;
  activeFilter.value = genreName ? 'genre' : '';
  selectedGenreFilter.value = genreName;
};

const handleSelectPlaylist = (p) => {
  selectedGenreFilter.value = '';
  activeFilter.value = 'playlist';
  activePlaylist.value = p;
  if (p.songs && p.songs.length) {
    playerStore.queue = p.songs;
  }
};

const handleFilterFavorites = () => {
  selectedGenreFilter.value = '';
  activePlaylist.value = null;
  activeFilter.value = 'favorites';
};

const clearAllFilters = () => {
  selectedGenreFilter.value = '';
  activePlaylist.value = null;
  activeFilter.value = '';
  searchQuery.value = '';
  sortBy.value = 'default';
};

const handleSearchInput = () => {
  if (searchQuery.value.trim()) {
    activeFilter.value = 'search';
  } else if (activeFilter.value === 'search') {
    activeFilter.value = '';
  }
};

const handleSearchSubmit = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value.trim() } });
  }
};

// Favorite toggle
const toggleFavorite = (track, event) => {
  if (event) event.stopPropagation();
  const id = track?.id || track?._id;
  if (!id) return;
  const idx = favoritesList.value.indexOf(id);
  if (idx === -1) {
    favoritesList.value.push(id);
    toastStore.show('Added to Liked Tracks', 'success');
  } else {
    favoritesList.value.splice(idx, 1);
    toastStore.show('Removed from Liked Tracks', 'info');
  }
  try {
    localStorage.setItem('soundwave_favorites', JSON.stringify(favoritesList.value));
  } catch {}
};

// Queue handling
const handleToggleQueue = () => {
  isQueueOpen.value = !isQueueOpen.value;
};

const handlePlayQueueItem = (idx) => {
  if (!playerStore.queue || !playerStore.queue[idx]) return;
  playerStore.playTrack(playerStore.queue[idx], playerStore.queue, idx);
};

// Playlist Operations
const openCreateModal = () => {
  showCreateModal.value = true;
};

const handlePlaylistCreated = () => {
  showCreateModal.value = false;
  playlistStore.fetchPlaylists();
  toastStore.show('Playlist created!', 'success');
};

const isMoodPlaylist = (p) => {
  if (!p) return false;
  return Boolean(
    p.isMood ||
    p.id?.startsWith('mood-') ||
    p._id?.startsWith('mood-') ||
    p.id?.startsWith('curated-')
  );
};

const handleDeleteActivePlaylist = async () => {
  if (!activePlaylist.value) return;
  const p = activePlaylist.value;
  if (!confirm(`Are you sure you want to permanently delete "${p.name}"?`)) return;

  try {
    await playlistStore.deletePlaylist(p._id || p.id);
    toastStore.show(`Playlist "${p.name}" deleted.`, 'success');
    clearAllFilters();
  } catch (err) {
    toastStore.show(err.response?.data?.message || 'Failed to delete playlist', 'error');
  }
};

const handleRemoveSongFromActivePlaylist = async (track) => {
  if (!activePlaylist.value) return;
  const p = activePlaylist.value;
  const trackId = track?._id || track?.id;
  if (!confirm(`Remove "${track?.title}" from "${p.name}"?`)) return;

  try {
    await playlistStore.removeSong(p._id || p.id, trackId);
    if (activePlaylist.value.songs) {
      activePlaylist.value.songs = activePlaylist.value.songs.filter((s) => (s._id || s.id) !== trackId);
    }
    toastStore.show(`Removed track from "${p.name}"`, 'success');
  } catch (err) {
    toastStore.show(err.response?.data?.message || 'Failed to remove track', 'error');
  }
};

// Info Modal
const openLicenseModal = (track) => {
  selectedInfoTrack.value = track || playerStore.currentTrack;
};

const isJamendoTrack = (t) => {
  return t?.provider === 'jamendo' || t?.source?.provider === 'jamendo';
};

const getTrackSourceUrl = (t) => {
  const extId = t.providerTrackId || t.source?.externalId;
  if (extId) return `https://www.jamendo.com/track/${extId}`;
  return t.source?.pageUrl || t.source?.url || 'https://www.jamendo.com';
};

const formatDuration = (sec) => {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const handleLogout = () => {
  authStore.logout();
  toastStore.show('Logged out', 'info');
};

onMounted(() => {
  try {
    const raw = localStorage.getItem('soundwave_favorites');
    favoritesList.value = raw ? JSON.parse(raw) : [];
  } catch {}
  playlistStore.fetchPlaylists().catch(() => {});
});
</script>

<style scoped>
/* ==========================================================================
   JELLYKIT NEO-BRUTALIST HOMEPAGE STYLES
   ========================================================================== */

.jb-app-shell {
  display: flex;
  min-height: 100vh;
  background-color: var(--bg, #F3EFE8);
  color: var(--ink, #111111);
  font-family: var(--font-body);
}

/* 1. SIDEBAR */
.jb-sidebar {
  width: var(--sidebar-w, 300px);
  background-color: #EFEAE1;
  border-right: var(--bw, 2px) solid var(--border, #111111);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  flex-shrink: 0;
  z-index: 100;
  transition: width 0.15s ease;
  overflow-y: auto;
}

.jb-sidebar.collapsed {
  width: var(--sidebar-w-collapsed, 80px);
}

.jb-sidebar-header {
  padding: 1.25rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  background-color: var(--surface, #FFFDF8);
}

.jb-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
}

.jb-logo-grid {
  display: grid;
  grid-template-columns: 12px 12px;
  grid-template-rows: 12px 12px;
  gap: 3px;
}

.jb-logo-grid .sq {
  width: 12px;
  height: 12px;
  border: 1.5px solid #111111;
  border-radius: 3px;
}

.sq-blue { background-color: var(--c-blue, #4D6BFF); }
.sq-coral { background-color: var(--c-coral, #FF6B5E); }
.sq-sun { background-color: var(--c-sun, #FFD84A); }
.sq-lime { background-color: var(--c-lime, #B8F23C); }

.jb-brand-text {
  font-size: 1.35rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: var(--ink, #111111);
}

.jb-collapse-toggle {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: 2px 2px 0 var(--border, #111111);
  width: 32px;
  height: 32px;
  border-radius: var(--r-sm, 8px);
  cursor: pointer;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.08s ease;
}

.jb-collapse-toggle:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

/* Sidebar Search */
.jb-search-box-wrap {
  padding: 0.9rem 1rem;
}

.jb-search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  border-radius: var(--r-md, 12px);
  padding: 0.55rem 0.75rem;
}

.jb-search-box.collapsed {
  justify-content: center;
  padding: 0.6rem;
}

.jb-search-icon {
  width: 18px;
  height: 18px;
  fill: var(--ink, #111111);
  flex-shrink: 0;
}

.jb-search-input {
  border: none;
  outline: none;
  background: transparent;
  width: 100%;
  font-size: 0.85rem;
  color: var(--ink, #111111);
}

.jb-key-cap {
  border: 1.5px solid var(--border, #111111);
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
  font-size: 0.7rem;
  background: #EFEAE1;
}

.jb-clear-search {
  border: none;
  background: none;
  cursor: pointer;
  font-weight: bold;
}

/* Sidebar Nav */
.jb-sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
}

.jb-nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0.65rem;
  border-radius: var(--r-sm, 8px);
  border: var(--bw, 2px) solid transparent;
  color: var(--ink, #111111);
  font-weight: 700;
  font-size: 0.92rem;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.1s ease;
}

.jb-nav-item:hover {
  background-color: rgba(17, 17, 17, 0.05);
}

.jb-nav-item.active {
  background-color: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
  border-color: var(--border, #111111);
}

.jb-nav-tile {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1.5px solid var(--border, #111111);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.tile-blue { background-color: var(--c-blue, #4D6BFF); color: #fff; }
.tile-coral { background-color: var(--c-coral, #FF6B5E); color: #fff; }
.tile-pink { background-color: var(--c-hotpink, #FF4F9A); color: #fff; }
.tile-sun { background-color: var(--c-sun, #FFD84A); color: #111; }
.tile-lavender { background-color: var(--c-lavender, #B9A6FF); color: #111; }

.jb-nav-count {
  margin-left: auto;
  font-size: 0.75rem;
  border: 1px solid var(--border, #111111);
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: var(--surface-2, #FFFFFF);
  color: var(--ink, #111111);
}

.jb-nav-item.active .jb-nav-count {
  background: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
  border-color: var(--bg, #F3EFE8);
}

/* Sidebar Section Headers */
.jb-sidebar-section {
  padding: 0.75rem 1rem;
  border-top: var(--bw, 2px) solid var(--border, #111111);
}

.jb-section-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--ink-muted, #4A4740);
  margin-bottom: 0.5rem;
}

.jb-split-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.jb-mini-add-btn {
  background: var(--surface-2, #FFFFFF);
  border: 1.5px solid var(--border, #111111);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: bold;
  cursor: pointer;
}

.jb-collections-list,
.jb-playlists-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.jb-collection-row,
.jb-playlist-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.4rem 0.5rem;
  border: 2px solid transparent;
  border-radius: var(--r-sm, 8px);
  background: none;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  text-align: left;
}

.jb-collection-row:hover,
.jb-playlist-row:hover {
  background-color: rgba(17, 17, 17, 0.05);
}

.jb-collection-row.active,
.jb-playlist-row.active {
  background-color: var(--surface-2, #FFFFFF);
  border-color: var(--border, #111111);
  box-shadow: 2px 2px 0 var(--border, #111111);
}

.jb-collection-name,
.jb-playlist-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.jb-collection-count {
  font-size: 0.72rem;
  color: var(--ink-muted, #4A4740);
}

/* Sidebar Footer */
.jb-sidebar-footer {
  margin-top: auto;
  padding: 1rem 1rem calc(var(--player-h, 88px) + 1.25rem);
  border-top: var(--bw, 2px) solid var(--border, #111111);
  background-color: var(--surface, #FFFDF8);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.jb-support-btn {
  background-color: var(--yellow, #FFD84A);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  padding: 0.55rem;
  border-radius: var(--r-md, 12px);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: transform 0.08s ease;
}

.jb-support-btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.jb-user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem;
  background: #EFEAE1;
  border: 1.5px solid var(--border, #111111);
  border-radius: var(--r-sm, 8px);
}

.jb-user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.jb-user-avatar {
  width: 24px;
  height: 24px;
  background: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 0.75rem;
}

.jb-username {
  font-size: 0.82rem;
  font-weight: 700;
}

.jb-signout-btn {
  background: none;
  border: 1px solid var(--border, #111111);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.68rem;
  cursor: pointer;
}

.jb-auth-box {
  display: flex;
  gap: 0.5rem;
}

.jb-auth-pill {
  flex: 1;
  text-align: center;
  padding: 0.45rem;
  border: 1.5px solid var(--border, #111111);
  border-radius: var(--r-sm, 8px);
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  color: var(--ink, #111111);
  background: var(--surface-2, #FFFFFF);
}

.jb-auth-pill.fill {
  background: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
}

/* 2. TOPBAR */
.jb-main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-bottom: 96px; /* player bar offset */
}

.jb-topbar {
  height: var(--topbar-h, 68px);
  background-color: var(--surface, #FFFDF8);
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  position: sticky;
  top: 0;
  z-index: 90;
}

.jb-topbar-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.jb-breadcrumb-sep {
  color: var(--ink-faint, #8A867C);
}

.jb-topbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.jb-queue-toggle-btn {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  padding: 0.4rem 0.85rem;
  border-radius: var(--r-pill, 999px);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.08s ease;
}

.jb-queue-toggle-btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.jb-status-chip {
  background: var(--mint, #5DE3A6);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  padding: 0.35rem 0.85rem;
  border-radius: var(--r-pill, 999px);
  font-size: 0.78rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.jb-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid #111111;
  background: transparent;
}

/* 3. CONTENT STAGE */
.jb-content-stage {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.jb-filter-banner {
  background: var(--yellow, #FFD84A);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  padding: 0.65rem 1.25rem;
  border-radius: var(--r-md, 12px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 700;
}

.jb-filter-clear-btn {
  background: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
  border: none;
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
}

/* JELLYKIT HERO CARD */
.jb-hero-card {
  position: relative;
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-lg, 18px);
  box-shadow: var(--shadow-lg, 8px 8px 0 var(--border, #111111));
  padding: 3rem 2.5rem;
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.jb-hero-meta {
  position: relative;
  z-index: 2;
  max-width: 800px;
}

.jb-hero-badge-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 1rem;
}

.jb-num-badge {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  padding: 0.15rem 0.55rem;
  border-radius: 6px;
  font-weight: 900;
  font-size: 0.78rem;
}

.jb-cat-label {
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
}

.jb-hero-title {
  font-size: clamp(2.8rem, 6vw, 5.2rem);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.045em;
  line-height: 0.92;
  color: #111111;
  margin-bottom: 1.25rem;
}

.jb-hero-tagline {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.4;
  color: #111111;
  margin-bottom: 2rem;
}

.jb-hero-foot-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.jb-dark-pill {
  background: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
  padding: 0.35rem 0.85rem;
  border-radius: var(--r-pill, 999px);
  font-size: 0.8rem;
  font-weight: 800;
}

.jb-live-tag {
  font-size: 0.82rem;
  font-weight: 800;
  color: #111111;
}

.jb-hero-del-btn {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--danger, #E5372B);
  color: var(--danger, #E5372B);
  padding: 0.35rem 0.85rem;
  border-radius: var(--r-pill, 999px);
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.jb-hero-watermark {
  position: absolute;
  right: -2rem;
  bottom: -2.5rem;
  font-size: clamp(6rem, 15vw, 12rem);
  font-weight: 900;
  color: rgba(17, 17, 17, 0.08);
  user-select: none;
  pointer-events: none;
  line-height: 1;
  letter-spacing: -0.06em;
}

/* SECTION HEADINGS WITH RULE */
.jb-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.jb-section-head {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.jb-head-left {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
}

.jb-section-title {
  font-size: 1.85rem;
  font-weight: 900;
  letter-spacing: -0.035em;
  text-transform: uppercase;
  color: var(--ink, #111111);
  white-space: nowrap;
}

.jb-head-count {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ink-muted, #4A4740);
}

.jb-section-line {
  flex: 1;
  height: var(--bw, 2px);
  background-color: var(--border, #111111);
}

/* FEATURED 3-UP CARDS */
.jb-featured-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.jb-featured-card {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-lg, 18px);
  box-shadow: var(--shadow-md, 5px 5px 0 var(--border, #111111));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.jb-featured-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 7px 7px 0 var(--border, #111111);
}

.jb-featured-card.is-active {
  border-color: var(--c-blue, #4D6BFF);
  box-shadow: 6px 6px 0 var(--c-blue, #4D6BFF);
}

.jb-card-eyebrow {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  font-size: 0.75rem;
  font-weight: 800;
  background-color: #FAF8F5;
}

.accent-mono {
  color: var(--c-blue, #4D6BFF);
}

.jb-card-art-box {
  height: 200px;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  background: repeating-linear-gradient(45deg, rgba(17, 17, 17, 0.03) 0 2px, transparent 2px 10px), #FAF8F5;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

.jb-card-cover {
  width: 140px;
  height: 140px;
  object-fit: cover;
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-md, 12px);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
}

.jb-art-fallback {
  width: 140px;
  height: 140px;
  background: var(--c-sun, #FFD84A);
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-md, 12px);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 900;
}

.jb-art-play-btn {
  position: absolute;
  right: 1.25rem;
  bottom: 1.25rem;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--yellow, #FFD84A);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: 2px 2px 0 var(--border, #111111);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.08s ease;
}

.jb-art-play-btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.jb-card-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.jb-card-title {
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-card-artist {
  font-size: 0.95rem;
  color: var(--ink-muted, #4A4740);
  font-weight: 600;
}

.jb-card-meta-row {
  margin-top: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.jb-mono-chip {
  background: #EFEAE1;
  border: 1px solid var(--border, #111111);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
}

.jb-open-action {
  background: none;
  border: none;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  color: var(--ink, #111111);
}

.jb-open-action:hover {
  text-decoration: underline;
}

/* POPULAR ROWS */
.jb-popular-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.jb-popular-row {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-md, 12px);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: transform 0.08s ease;
}

.jb-popular-row:hover {
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--border, #111111);
}

.jb-pop-tile {
  width: 44px;
  height: 44px;
  border-radius: var(--r-sm, 8px);
  border: var(--bw, 2px) solid var(--border, #111111);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1rem;
  flex-shrink: 0;
}

.jb-pop-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.jb-pop-title {
  font-size: 1.05rem;
  font-weight: 900;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-pop-artist {
  font-size: 0.78rem;
  color: var(--ink-muted, #4A4740);
}

.jb-pop-badge {
  font-size: 0.72rem;
  border: 1px solid var(--border, #111111);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  background: #FAF8F5;
  font-weight: 700;
}

/* CHIPS BAR */
.jb-chips-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.jb-chips-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.jb-chips-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--ink-muted, #4A4740);
}

.jb-filter-chip {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-pill, 999px);
  padding: 0.35rem 0.85rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.1s ease;
}

.jb-filter-chip.active {
  background: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
}

/* 4-COLUMN CARDS GRID */
.jb-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.jb-track-card {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-md, 12px);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 0.85rem;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.jb-track-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 var(--border, #111111);
}

.jb-track-card.is-active {
  border-color: var(--c-blue, #4D6BFF);
  box-shadow: 4px 4px 0 var(--c-blue, #4D6BFF);
}

.jb-tc-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.jb-tc-art-wrap {
  width: 72px;
  height: 72px;
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}

.jb-tc-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-sm, 8px);
}

.jb-tc-fallback {
  width: 100%;
  height: 100%;
  background: var(--c-sun, #FFD84A);
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-sm, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 900;
}

.jb-tc-hover-play {
  position: absolute;
  inset: 0;
  background: rgba(17, 17, 17, 0.6);
  color: #fff;
  border-radius: var(--r-sm, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.jb-tc-art-wrap:hover .jb-tc-hover-play {
  opacity: 1;
}

.jb-tc-badge-column {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
}

.jb-tc-badge {
  font-size: 0.68rem;
  font-weight: 800;
  border: 1.5px solid var(--border, #111111);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.jb-tc-time {
  font-size: 0.72rem;
  color: var(--ink-muted, #4A4740);
  font-weight: 600;
}

.jb-tc-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.jb-tc-title {
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-tc-artist {
  font-size: 0.85rem;
  color: var(--ink-muted, #4A4740);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-tc-footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.65rem;
  border-top: 1.5px solid rgba(17, 17, 17, 0.08);
}

.jb-tc-action-btn {
  background: var(--surface, #FFFDF8);
  border: 1.5px solid var(--border, #111111);
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.08s ease;
}

.jb-tc-action-btn:hover {
  background: var(--yellow, #FFD84A);
}

.jb-tc-meta-cluster {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.jb-tc-fav-btn,
.jb-tc-del-btn,
.jb-tc-jamendo-link {
  background: none;
  border: 1.5px solid var(--border, #111111);
  width: 26px;
  height: 26px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  cursor: pointer;
  text-decoration: none;
  color: var(--ink, #111111);
}

.jb-tc-fav-btn.active {
  background: var(--c-hotpink, #FF4F9A);
  color: #fff;
}

.jb-tc-del-btn:hover {
  background: var(--danger, #E5372B);
  color: #fff;
}

/* EMPTY STATE */
.jb-empty-box {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-md, 5px 5px 0 var(--border, #111111));
  border-radius: var(--r-lg, 18px);
  padding: 4rem 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.jb-empty-glyph {
  font-size: 3rem;
  font-weight: 900;
}

.jb-empty-title {
  font-size: 1.5rem;
  font-weight: 900;
}

.jb-empty-desc {
  color: var(--ink-muted, #4A4740);
  max-width: 480px;
}

.jb-empty-btn {
  background: var(--yellow, #FFD84A);
  border: var(--bw, 2px) solid var(--border, #111111);
  padding: 0.65rem 1.25rem;
  border-radius: var(--r-sm, 8px);
  font-weight: 800;
  cursor: pointer;
}

/* 4. BOTTOM PERSISTENT PLAYER BAR */
.jb-player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 88px;
  background: var(--surface, #FFFDF8);
  border-top: var(--bw, 2px) solid var(--border, #111111);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  z-index: 1000;
  box-sizing: border-box;
}

.jb-pb-track {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  width: 280px;
  min-width: 0;
}

.jb-pb-art {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
}

.jb-pb-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: 1.5px solid var(--border, #111111);
  border-radius: 6px;
}

.jb-pb-fallback {
  width: 100%;
  height: 100%;
  background: var(--c-sun, #FFD84A);
  border: 1.5px solid var(--border, #111111);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 900;
}

.jb-pb-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.jb-pb-title {
  font-size: 0.95rem;
  font-weight: 900;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-pb-artist {
  font-size: 0.75rem;
  color: var(--ink-muted, #4A4740);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-pb-fav {
  background: none;
  border: 1.5px solid var(--border, #111111);
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.jb-pb-fav.active {
  background: var(--c-hotpink, #FF4F9A);
  color: #fff;
}

/* Player Center */
.jb-pb-controls {
  flex: 1;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.jb-pb-buttons {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.jb-btn-icon {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
}

.jb-btn-icon.on {
  color: var(--c-blue, #4D6BFF);
}

.jb-btn-play {
  width: 44px;
  height: 44px;
  border-radius: var(--r-sm, 8px);
  background: var(--yellow, #FFD84A);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: 2px 2px 0 var(--border, #111111);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.08s ease;
}

.jb-btn-play:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.jb-pb-timeline {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.jb-pb-time {
  font-size: 0.72rem;
  color: var(--ink-muted, #4A4740);
  width: 40px;
  text-align: center;
}

.jb-pb-trackbar {
  flex: 1;
  height: 10px;
  background: #EFEAE1;
  border: 1.5px solid var(--border, #111111);
  border-radius: 999px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.jb-pb-fill {
  height: 100%;
  background: var(--c-blue, #4D6BFF);
  border-right: 1.5px solid var(--border, #111111);
}

/* Player Extras */
.jb-pb-extras {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  width: 220px;
  justify-content: flex-end;
}

.jb-vol-slider {
  width: 80px;
  accent-color: var(--ink, #111111);
}

.jb-queue-pill {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  padding: 0.35rem 0.75rem;
  border-radius: var(--r-pill, 999px);
  font-weight: 800;
  font-size: 0.75rem;
  cursor: pointer;
}

/* 5. MODALS & QUEUE DRAWER */
.jb-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.6);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.jb-queue-drawer {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 360px;
  max-width: 90vw;
  background: var(--surface, #FFFDF8);
  border-left: var(--bw, 2px) solid var(--border, #111111);
  display: flex;
  flex-direction: column;
  z-index: 2100;
}

.jb-drawer-head {
  padding: 1.25rem;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.jb-drawer-title {
  font-size: 1.15rem;
  font-weight: 900;
}

.jb-drawer-close {
  background: none;
  border: 1.5px solid var(--border, #111111);
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
}

.jb-empty-queue {
  padding: 3rem 1rem;
  text-align: center;
  color: var(--ink-muted, #4A4740);
  font-size: 0.85rem;
}

.jb-queue-items {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.jb-queue-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(17, 17, 17, 0.08);
  cursor: pointer;
}

.jb-queue-row:hover {
  background: rgba(17, 17, 17, 0.04);
}

.jb-queue-row.is-current {
  background: rgba(77, 107, 255, 0.12);
  border-left: 4px solid var(--c-blue, #4D6BFF);
}

.jb-qr-num {
  font-size: 0.75rem;
  color: var(--ink-muted, #4A4740);
}

.jb-qr-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.jb-qr-title {
  font-size: 0.88rem;
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-qr-artist {
  font-size: 0.75rem;
  color: var(--ink-muted, #4A4740);
}

.jb-qr-del {
  background: none;
  border: none;
  cursor: pointer;
  font-weight: bold;
  color: var(--danger, #E5372B);
}

/* DIALOGS */
.jb-dialog {
  background: var(--surface, #FFFDF8);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-lg, 8px 8px 0 var(--border, #111111));
  border-radius: var(--r-lg, 18px);
  width: 100%;
  max-width: 540px;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.jb-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  padding-bottom: 0.75rem;
}

.jb-dialog-tag {
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.jb-dialog-close {
  background: none;
  border: 1.5px solid var(--border, #111111);
  border-radius: 4px;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
}

.jb-dialog-title {
  font-size: 1.6rem;
  font-weight: 900;
}

.jb-dialog-sub {
  color: var(--ink-muted, #4A4740);
  font-weight: 700;
  margin-top: -0.5rem;
}

.jb-dialog-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.jb-dialog-field label {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--ink-muted, #4A4740);
}

.jb-dialog-val {
  background: #EFEAE1;
  border: 1.5px solid var(--border, #111111);
  border-radius: 6px;
  padding: 0.5rem;
  font-size: 0.85rem;
}

.jb-dialog-val.quote {
  font-style: italic;
}

.jb-dialog-link {
  color: var(--c-blue, #4D6BFF);
  text-decoration: underline;
  word-break: break-all;
  font-size: 0.82rem;
}

.jb-setting-row {
  border-bottom: 1px solid rgba(17, 17, 17, 0.1);
  padding: 0.75rem 0;
}

/* RESPONSIVE BREAKPOINTS */
@media (max-width: 1200px) {
  .jb-cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 992px) {
  .jb-cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .jb-featured-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .jb-popular-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .jb-app-shell {
    flex-direction: column;
  }
  .jb-sidebar {
    width: 100%;
    height: auto;
    position: relative;
    border-right: none;
    border-bottom: var(--bw, 2px) solid var(--border, #111111);
  }
  .jb-sidebar.collapsed {
    width: 100%;
  }
  .jb-cards-grid {
    grid-template-columns: 1fr;
  }
  .jb-featured-grid {
    grid-template-columns: 1fr;
  }
  .jb-content-stage {
    padding: 1rem;
  }
  .jb-topbar {
    padding: 0 1rem;
  }
  .jb-player-bar {
    padding: 0 1rem;
  }
  .jb-pb-extras {
    display: none;
  }
  .jb-hero-title {
    font-size: 2.5rem;
  }
}
</style>