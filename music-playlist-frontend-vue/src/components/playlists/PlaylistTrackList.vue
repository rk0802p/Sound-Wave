<template>
  <div class="playlist-tracklist-root font-mono">
    <!-- Search & Sort Bar inside Playlist (Only shown if playlist has tracks or search is active) -->
    <div v-if="songs.length > 0 || searchInsideQuery" class="tracklist-toolbar">
      <div class="search-inside-wrap">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchInsideQuery"
          type="search"
          placeholder="Search in this playlist..."
          class="search-inside-input font-mono"
        />
        <button
          v-if="searchInsideQuery"
          type="button"
          class="clear-search-btn"
          @click="searchInsideQuery = ''"
          title="Clear search"
        >
          ✕
        </button>
      </div>

      <div class="sort-control-group">
        <label for="playlist-sort-select" class="sort-label">SORT:</label>
        <select
          id="playlist-sort-select"
          v-model="sortOrder"
          class="sort-select font-mono"
        >
          <option value="custom">Custom Order</option>
          <option value="title">Title (A–Z)</option>
          <option value="artist">Artist (A–Z)</option>
          <option value="duration">Duration</option>
        </select>
      </div>
    </div>

    <!-- Active Search Filter Banner -->
    <div v-if="searchInsideQuery" class="search-filter-banner font-mono">
      <span>
        Showing {{ filteredTracks.length }} of {{ songs.length }} tracks matching "{{ searchInsideQuery }}"
      </span>
      <button type="button" class="btn-clear-filter font-mono" @click="searchInsideQuery = ''">
        CLEAR
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="songs.length === 0" class="playlist-empty-state">
      <div class="empty-icon font-display">Ø</div>
      <h3 class="empty-title font-display">This playlist is empty.</h3>
      <p class="empty-subtitle font-mono">
        Add songs from search, your liked songs or a link.
      </p>
      <div class="empty-actions font-mono">
        <button
          v-if="isOwner"
          type="button"
          class="btn-empty-add font-mono"
          @click="$emit('open-add-songs')"
        >
          ＋ ADD SONGS
        </button>
        <router-link to="/" class="btn-empty-browse font-mono">
          BROWSE THE CATALOG
        </router-link>
      </div>
    </div>

    <!-- No Search Results Inside Playlist State -->
    <div v-else-if="filteredTracks.length === 0" class="playlist-no-results font-mono">
      <p>No tracks match "{{ searchInsideQuery }}".</p>
      <button type="button" class="btn-clear-filter font-mono" @click="searchInsideQuery = ''">
        RESET SEARCH
      </button>
    </div>

    <!-- Table Header Row -->
    <div v-else class="tracklist-table">
      <div
        class="tracklist-header-row font-mono"
        :class="{ 'has-drag': isOwner && isCustomOrder }"
      >
        <span class="th-drag" v-if="isOwner && isCustomOrder"></span>
        <span class="th-num">#</span>
        <span class="th-cover"></span>
        <span class="th-title">TITLE</span>
        <span class="th-album">ALBUM</span>
        <span class="th-source">SOURCE</span>
        <span class="th-duration">TIME</span>
        <span class="th-like"></span>
        <span class="th-menu"></span>
      </div>

      <!-- Tracks Stream -->
      <div class="track-rows-container">
        <PlaylistTrackRow
          v-for="(track, idx) in filteredTracks"
          :key="track._id || track.id || idx"
          :track="track"
          :index="idx"
          :totalSongs="filteredTracks.length"
          :isOwner="isOwner"
          :isDraggable="isCustomOrder"
          :playlistSongs="songs"
          @play="handlePlay"
          @remove-song="handleRemoveSong"
          @move-up="handleMoveUp"
          @move-down="handleMoveDown"
          @drag-start="handleDragStart"
          @drop="handleDrop"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import PlaylistTrackRow from './PlaylistTrackRow.vue';

const props = defineProps({
  songs: {
    type: Array,
    default: () => [],
  },
  playlist: {
    type: Object,
    default: () => ({}),
  },
  isOwner: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'open-add-songs',
  'play-song',
  'remove-song',
  'reorder-songs',
]);

const searchInsideQuery = ref('');
const sortOrder = ref('custom');
const draggedIndex = ref(null);

const isCustomOrder = computed(() => sortOrder.value === 'custom');

const filteredTracks = computed(() => {
  let list = [...props.songs];

  if (searchInsideQuery.value.trim()) {
    const q = searchInsideQuery.value.toLowerCase().trim();
    list = list.filter(
      (t) =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.artist && t.artist.toLowerCase().includes(q)) ||
        (t.album && t.album.toLowerCase().includes(q))
    );
  }

  if (sortOrder.value === 'title') {
    list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (sortOrder.value === 'artist') {
    list.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
  } else if (sortOrder.value === 'duration') {
    list.sort((a, b) => (a.duration || 0) - (b.duration || 0));
  }

  return list;
});

const handlePlay = (payload) => {
  emit('play-song', {
    track: payload.track,
    index: payload.index,
    songsList: filteredTracks.value,
  });
};

const handleRemoveSong = (payload) => {
  emit('remove-song', payload);
};

// Reorder Logic (Only in custom order)
const handleMoveUp = (index) => {
  if (index <= 0 || !isCustomOrder.value) return;
  const newSongs = [...props.songs];
  const temp = newSongs[index - 1];
  newSongs[index - 1] = newSongs[index];
  newSongs[index] = temp;
  const newIds = newSongs.map((s) => s._id || s.id);
  emit('reorder-songs', newIds);
};

const handleMoveDown = (index) => {
  if (index >= props.songs.length - 1 || !isCustomOrder.value) return;
  const newSongs = [...props.songs];
  const temp = newSongs[index + 1];
  newSongs[index + 1] = newSongs[index];
  newSongs[index] = temp;
  const newIds = newSongs.map((s) => s._id || s.id);
  emit('reorder-songs', newIds);
};

const handleDragStart = (idx) => {
  draggedIndex.value = idx;
};

const handleDrop = (targetIdx) => {
  if (draggedIndex.value === null || draggedIndex.value === targetIdx || !isCustomOrder.value) {
    draggedIndex.value = null;
    return;
  }
  const newSongs = [...props.songs];
  const [draggedItem] = newSongs.splice(draggedIndex.value, 1);
  newSongs.splice(targetIdx, 0, draggedItem);
  draggedIndex.value = null;
  const newIds = newSongs.map((s) => s._id || s.id);
  emit('reorder-songs', newIds);
};
</script>

<style scoped>
.playlist-tracklist-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

/* Toolbar */
.tracklist-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.search-inside-wrap {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 280px;
  flex: 1;
  max-width: 480px;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 0.85rem;
  pointer-events: none;
}

.search-inside-input {
  width: 100%;
  padding: 10px 32px 10px 36px;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  background-color: #FFFFFF;
  color: #111111;
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 0;
  transition: box-shadow 0.08s ease, background-color 0.08s ease;
}

.search-inside-input:focus {
  outline: none;
  background-color: #FFFDE6;
  box-shadow: 4px 4px 0 #111111;
}

.clear-search-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  font-size: 0.85rem;
  font-weight: 900;
  cursor: pointer;
  color: #111111;
}

.sort-control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #111111;
  text-transform: uppercase;
}

.sort-select {
  padding: 9px 12px;
  border: 2px solid #111111;
  background-color: #FFFFFF;
  color: #111111;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 800;
  box-shadow: 3px 3px 0 #111111;
  cursor: pointer;
  border-radius: 0;
}

/* Filter Banner */
.search-filter-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #B9A6FF;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  padding: 10px 16px;
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  font-weight: 800;
  color: #111111;
  border-radius: 0;
}

.btn-clear-filter {
  background: #FFFFFF;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  padding: 4px 10px;
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 900;
  cursor: pointer;
  border-radius: 0;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.btn-clear-filter:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
  background-color: #FFD84A;
}

/* Empty State */
.playlist-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 64px 24px;
  border: 3px solid #111111;
  box-shadow: 6px 6px 0 #111111;
  background-color: #FFFFFF;
  margin: 12px 0;
  border-radius: 0;
}

.empty-icon {
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 2.5rem;
  font-weight: 900;
  color: #111111;
  background-color: #FFD84A;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-title {
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #111111;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.empty-subtitle {
  font-family: var(--font-mono, monospace);
  font-size: 0.95rem;
  font-weight: 500;
  color: #555555;
  margin: 0 0 28px;
  max-width: 500px;
}

.empty-actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-empty-add {
  padding: 12px 24px;
  background-color: #5DE3A6;
  color: #111111;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  font-family: var(--font-mono, monospace);
  font-weight: 900;
  font-size: 0.85rem;
  cursor: pointer;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-radius: 0;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
}

.btn-empty-add:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #111111;
  background-color: #4BD898;
}

.btn-empty-add:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.btn-empty-browse {
  padding: 12px 24px;
  background-color: #FFFFFF;
  color: #111111;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  font-family: var(--font-mono, monospace);
  font-weight: 900;
  font-size: 0.85rem;
  text-decoration: none;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-radius: 0;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
}

.btn-empty-browse:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #111111;
  background-color: #FFFDF8;
}

.btn-empty-browse:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.playlist-no-results {
  text-align: center;
  padding: 40px;
  background-color: #FFFFFF;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
}

/* Table Header */
.tracklist-table {
  border: 3px solid #111111;
  box-shadow: 5px 5px 0 #111111;
  background-color: #FFFFFF;
  overflow: visible;
  border-radius: 0;
}

.tracklist-header-row {
  display: grid;
  grid-template-columns: 36px 44px 1.8fr 1.2fr 130px 60px 36px 40px;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 2px solid #111111;
  background-color: #EFEAE1;
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #111111;
  text-transform: uppercase;
}

.tracklist-header-row.has-drag {
  grid-template-columns: 24px 36px 44px 1.8fr 1.2fr 130px 60px 36px 40px;
}

.th-duration {
  text-align: right;
}

@media (max-width: 900px) {
  .tracklist-header-row {
    grid-template-columns: 32px 40px 1.8fr 110px 50px 32px 36px;
  }
  .tracklist-header-row.has-drag {
    grid-template-columns: 20px 32px 40px 1.8fr 110px 50px 32px 36px;
  }
  .th-album {
    display: none;
  }
}

@media (max-width: 640px) {
  .tracklist-header-row {
    grid-template-columns: 28px 38px 1fr 48px 32px;
    gap: 8px;
    padding: 8px 10px;
  }
  .tracklist-header-row.has-drag {
    grid-template-columns: 18px 28px 38px 1fr 48px 32px;
    gap: 8px;
    padding: 8px 10px;
  }
  .th-source,
  .th-like {
    display: none;
  }
}
</style>
