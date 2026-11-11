<template>
  <header class="playlist-header-root">
    <!-- Left: Artwork Jacket Showcase -->
    <div class="header-cover-stage">
      <div class="cover-wrapper" :class="{ 'is-playing': isPlaying }">
        <img
          v-if="playlist.coverImage && !imgError"
          :src="playlist.coverImage"
          :alt="playlist.name"
          class="cover-img"
          @error="imgError = true"
        />
        <div v-else class="cover-fallback font-display">
          {{ monogram }}
        </div>
      </div>
    </div>

    <!-- Right: Editorial Meta & Actions -->
    <div class="header-meta-stage">
      <!-- Eyebrow & Badges -->
      <div class="header-eyebrow-row font-mono">
        <span class="eyebrow-tag">PLAYLIST</span>
        <span
          class="visibility-pill"
          :class="{ 'pill-public': playlist.isPublic, 'pill-private': !playlist.isPublic }"
        >
          {{ playlist.isPublic ? 'PUBLIC' : 'PRIVATE' }}
        </span>
        <span v-if="playlist.forkedFrom" class="forked-badge">
          🍴 FORKED
        </span>
        <span v-if="isOwner" class="owner-pill">
          YOUR PLAYLIST
        </span>
      </div>

      <!-- Title & Inline Rename -->
      <div class="header-title-container">
        <div v-if="isEditingName && isOwner" class="inline-rename-form">
          <input
            ref="renameInputRef"
            v-model="editedName"
            type="text"
            maxlength="80"
            class="inline-rename-input font-display"
            @keydown.enter="saveInlineRename"
            @keydown.esc="cancelInlineRename"
            @blur="saveInlineRename"
          />
          <button type="button" class="btn-save-inline font-mono" @mousedown.prevent="saveInlineRename">
            SAVE
          </button>
          <button type="button" class="btn-cancel-inline font-mono" @mousedown.prevent="cancelInlineRename">
            CANCEL
          </button>
        </div>

        <div v-else class="title-display-wrap">
          <h1
            class="header-title font-display"
            :class="{ 'is-editable': isOwner }"
            @click="startInlineRename"
            :title="isOwner ? 'Click to rename' : playlist.name"
          >
            {{ playlist.name }}
          </h1>
          <button
            v-if="isOwner"
            type="button"
            class="btn-pencil font-mono"
            @click="startInlineRename"
            title="Rename playlist"
            aria-label="Rename playlist"
          >
            ✎
          </button>
        </div>
      </div>

      <!-- Description -->
      <p v-if="playlist.description" class="header-description font-mono">
        {{ playlist.description }}
      </p>

      <!-- Ledger / Stats -->
      <div class="header-stats font-mono">
        <span class="curator-info">
          CURATOR: <strong>@{{ curatorName }}</strong>
        </span>
        <span class="dot-sep">•</span>
        <span>{{ songsCount }} {{ songsCount === 1 ? 'song' : 'songs' }}</span>
        <span class="dot-sep">•</span>
        <span>{{ formattedTotalDuration }}</span>
      </div>

      <!-- Tactical Action Buttons Row -->
      <div class="header-actions-row font-mono">
        <!-- Play / Pause -->
        <button
          type="button"
          class="btn-action btn-play font-display"
          :disabled="songsCount === 0"
          @click="$emit('play-all')"
        >
          <span class="btn-icon">{{ isPlaying ? '❚❚' : '▶' }}</span>
          <span>{{ isPlaying ? 'PAUSE' : 'PLAY' }}</span>
        </button>

        <!-- Shuffle -->
        <button
          type="button"
          class="btn-action btn-shuffle font-mono"
          :disabled="songsCount === 0"
          @click="$emit('shuffle')"
          title="Shuffle playlist"
        >
          <span>🔀 SHUFFLE</span>
        </button>

        <!-- Add songs (Owner only) -->
        <button
          v-if="isOwner"
          type="button"
          class="btn-action btn-add font-mono"
          @click="$emit('open-add-songs')"
        >
          <span>＋ ADD SONGS</span>
        </button>

        <!-- Fork (Non-owners only) -->
        <button
          v-if="!isOwner"
          type="button"
          class="btn-action btn-fork font-mono"
          @click="$emit('fork')"
        >
          <span>🍴 FORK TO LIBRARY</span>
        </button>

        <!-- Share (Copy Link) -->
        <button
          type="button"
          class="btn-action btn-share font-mono"
          @click="handleShare"
          title="Copy share link"
        >
          <span>🔗 SHARE</span>
        </button>

        <!-- More (...) Menu (Owner Only) -->
        <div v-if="isOwner" class="more-menu-wrapper" ref="moreMenuRef">
          <button
            type="button"
            class="btn-action btn-more font-mono"
            @click="isMoreMenuOpen = !isMoreMenuOpen"
            title="More options"
            :aria-expanded="isMoreMenuOpen"
            aria-haspopup="true"
          >
            •••
          </button>

          <div v-if="isMoreMenuOpen" class="more-dropdown font-mono" @click.stop>
            <button type="button" class="more-item" @click="handleEditDetails">
              <span>✎ Edit Details</span>
            </button>

            <button type="button" class="more-item" @click="handleToggleVisibility">
              <span>{{ playlist.isPublic ? '🔒 Make Private' : '🌐 Make Public' }}</span>
            </button>

            <button type="button" class="more-item" @click="handleDuplicate">
              <span>📄 Duplicate Playlist</span>
            </button>

            <div class="more-divider"></div>

            <button type="button" class="more-item danger" @click="handleDeleteClick">
              <span>🗑️ Delete Playlist</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useToastStore } from '../../stores/toast';

const props = defineProps({
  playlist: {
    type: Object,
    required: true,
  },
  isOwner: {
    type: Boolean,
    default: false,
  },
  isPlaying: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'play-all',
  'shuffle',
  'open-add-songs',
  'fork',
  'rename',
  'edit-details',
  'toggle-visibility',
  'duplicate',
  'delete',
]);

const toastStore = useToastStore();

const imgError = ref(false);
const isEditingName = ref(false);
const editedName = ref('');
const renameInputRef = ref(null);
const isMoreMenuOpen = ref(false);
const moreMenuRef = ref(null);

const monogram = computed(() => {
  const n = props.playlist.name || 'SW';
  return n.substring(0, 2).toUpperCase();
});

const curatorName = computed(() => {
  return props.playlist.creator?.username || props.playlist.userId?.username || 'Soundwave Curator';
});

const songsCount = computed(() => {
  return props.playlist.songs?.length || props.playlist.songCount || 0;
});

const formattedTotalDuration = computed(() => {
  const songs = props.playlist.songs || [];
  const totalSeconds = songs.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return `${hours} hr ${remMin} min`;
});

// Inline Rename
const startInlineRename = () => {
  if (!props.isOwner) return;
  editedName.value = props.playlist.name;
  isEditingName.value = true;
  nextTick(() => {
    renameInputRef.value?.focus();
    renameInputRef.value?.select();
  });
};

const saveInlineRename = () => {
  if (!isEditingName.value) return;
  const trimmed = editedName.value.trim();
  if (trimmed && trimmed !== props.playlist.name) {
    emit('rename', trimmed);
  }
  isEditingName.value = false;
};

const cancelInlineRename = () => {
  isEditingName.value = false;
};

// Actions
const handleShare = () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url)
    .then(() => toastStore.show('Share link copied to clipboard!', 'success'))
    .catch(() => toastStore.show('Link: ' + url, 'info'));
};

const handleEditDetails = () => {
  isMoreMenuOpen.value = false;
  emit('edit-details');
};

const handleToggleVisibility = () => {
  isMoreMenuOpen.value = false;
  emit('toggle-visibility', !props.playlist.isPublic);
};

const handleDuplicate = () => {
  isMoreMenuOpen.value = false;
  emit('duplicate');
};

const handleDeleteClick = () => {
  isMoreMenuOpen.value = false;
  emit('delete');
};

const handleDocumentClick = (e) => {
  if (moreMenuRef.value && !moreMenuRef.value.contains(e.target)) {
    isMoreMenuOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<style scoped>
.playlist-header-root {
  display: flex;
  gap: 32px;
  align-items: flex-end;
  padding: 28px;
  background-color: #FFFFFF;
  border: 3px solid #111111;
  box-shadow: 6px 6px 0 #111111;
  border-radius: 0;
  flex-wrap: wrap;
}

/* Cover */
.header-cover-stage {
  flex-shrink: 0;
}

.cover-wrapper {
  width: 200px;
  height: 200px;
  border: 3px solid #111111;
  box-shadow: 4px 4px 0 #111111;
  background-color: #FFD84A;
  overflow: hidden;
  position: relative;
  border-radius: 0;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 3.5rem;
  font-weight: 900;
  color: #111111;
  background: linear-gradient(135deg, #FFD84A, #FFA23A);
}

/* Meta */
.header-meta-stage {
  flex: 1;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header-eyebrow-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.eyebrow-tag {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  background-color: #111111;
  color: #FFFFFF;
  padding: 3px 8px;
  border: 2px solid #111111;
  border-radius: 0;
  text-transform: uppercase;
}

.visibility-pill,
.owner-pill,
.forked-badge {
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  font-weight: 900;
  padding: 3px 10px;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  border-radius: 0;
  text-transform: uppercase;
}

.pill-public {
  background-color: #5DE3A6;
  color: #111111;
}

.pill-private {
  background-color: #FF6B5E;
  color: #FFFFFF;
}

.owner-pill {
  background-color: #FFD84A;
  color: #111111;
}

.forked-badge {
  background-color: #B9A6FF;
  color: #111111;
}

/* Title & Rename */
.header-title-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-display-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.header-title {
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 2.75rem;
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: #111111;
  margin: 0;
  word-break: break-word;
  text-transform: uppercase;
}

.header-title.is-editable {
  cursor: pointer;
  border-bottom: 2px dashed #111111;
  transition: background-color 0.1s ease;
}

.header-title.is-editable:hover {
  background-color: #FFFDE6;
}

.btn-pencil {
  background: #FFFFFF;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  font-size: 0.9rem;
  font-weight: 900;
  padding: 3px 8px;
  cursor: pointer;
  border-radius: 0;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.btn-pencil:hover {
  background-color: #FFD84A;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
}

.inline-rename-form {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.inline-rename-input {
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 2rem;
  font-weight: 900;
  padding: 6px 12px;
  border: 3px solid #111111;
  box-shadow: 4px 4px 0 #111111;
  background-color: #FFFFFF;
  color: #111111;
  width: 100%;
  max-width: 520px;
  border-radius: 0;
}

.inline-rename-input:focus {
  outline: none;
  background-color: #FFFDE6;
}

.btn-save-inline,
.btn-cancel-inline {
  padding: 8px 16px;
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  font-weight: 900;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  cursor: pointer;
  border-radius: 0;
  text-transform: uppercase;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.btn-save-inline {
  background-color: #5DE3A6;
  color: #111111;
}

.btn-save-inline:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
  background-color: #4BD898;
}

.btn-cancel-inline {
  background-color: #FFFFFF;
  color: #111111;
}

.btn-cancel-inline:hover {
  background-color: #F3EFE8;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
}

/* Description */
.header-description {
  font-family: var(--font-mono, monospace);
  font-size: 0.88rem;
  font-weight: 600;
  color: #333333;
  margin: 0;
  max-width: 640px;
  line-height: 1.45;
  background-color: #FFFDF8;
  padding: 8px 12px;
  border: 1.5px solid #111111;
  border-left: 4px solid #FFD84A;
  box-shadow: 2px 2px 0 #111111;
}

/* Stats */
.header-stats {
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 700;
  color: #111111;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.curator-info strong {
  color: #111111;
  font-weight: 900;
  background-color: #EFEAE1;
  border: 1px solid #111111;
  padding: 2px 6px;
}

.dot-sep {
  color: #111111;
  font-weight: 900;
}

/* Actions Row */
.header-actions-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.btn-action {
  padding: 10px 18px;
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 0;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
}

.btn-action:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #111111;
}

.btn-action:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-play {
  background-color: #FFD84A;
  color: #111111;
  padding: 10px 24px;
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 1rem;
}

.btn-play:hover:not(:disabled) {
  background-color: #FFE066;
}

.btn-shuffle {
  background-color: #FFFFFF;
  color: #111111;
}

.btn-shuffle:hover:not(:disabled) {
  background-color: #FFFDF8;
}

.btn-add {
  background-color: #5DE3A6;
  color: #111111;
}

.btn-add:hover:not(:disabled) {
  background-color: #4BD898;
}

.btn-fork {
  background-color: #B9A6FF;
  color: #111111;
}

.btn-fork:hover:not(:disabled) {
  background-color: #CEBFFF;
}

.btn-share {
  background-color: #FFFFFF;
  color: #111111;
}

.btn-share:hover:not(:disabled) {
  background-color: #FFFDF8;
}

.btn-more {
  background-color: #FFFFFF;
  color: #111111;
  padding: 10px 14px;
  font-weight: 900;
}

.btn-more:hover:not(:disabled) {
  background-color: #FFFDF8;
}

/* More Menu */
.more-menu-wrapper {
  position: relative;
}

.more-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 6px;
  width: 210px;
  background-color: #FFFFFF;
  border: 2px solid #111111;
  box-shadow: 4px 4px 0 #111111;
  z-index: 1000;
  padding: 6px 0;
  border-radius: 0;
}

.more-item {
  width: 100%;
  padding: 8px 14px;
  background: none;
  border: none;
  text-align: left;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 700;
  color: #111111;
  cursor: pointer;
  transition: background-color 0.08s ease;
}

.more-item:hover {
  background-color: #FFFDF8;
  font-weight: 800;
}

.more-item.danger {
  color: #FF6B5E;
}

.more-item.danger:hover {
  background-color: #FFE6EE;
}

.more-divider {
  height: 2px;
  background-color: #111111;
  margin: 4px 0;
}

@media (max-width: 640px) {
  .playlist-header-root {
    flex-direction: column;
    align-items: stretch;
    padding: 18px;
    gap: 16px;
  }
  .header-cover-stage {
    align-self: flex-start;
  }
  .cover-wrapper {
    width: 128px;
    height: 128px;
  }
  .cover-fallback {
    font-size: 2.35rem;
  }
  .header-meta-stage {
    flex: none;
    min-width: 0;
    width: 100%;
  }
  .header-title {
    font-size: 1.85rem;
  }
  .inline-rename-form {
    flex-wrap: wrap;
  }
  .inline-rename-input {
    font-size: 1.35rem;
  }
  .btn-action {
    padding: 8px 12px;
    font-size: 0.78rem;
  }
}
</style>
