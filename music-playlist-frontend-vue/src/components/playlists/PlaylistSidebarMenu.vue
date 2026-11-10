<template>
  <div class="sidebar-item-container font-mono" ref="rootRef">
    <router-link
      :to="`/playlist/${playlist._id || playlist.id}`"
      class="sidebar-playlist-link"
      :class="{ 'is-active': isActive }"
      :title="playlist.name"
    >
      <span class="p-icon">🎵</span>
      <span v-if="!isCollapsed" class="p-name">{{ playlist.name }}</span>
    </router-link>

    <button
      v-if="!isCollapsed"
      type="button"
      class="sidebar-menu-btn font-mono"
      @click.stop="isMenuOpen = !isMenuOpen"
      title="Playlist options"
      :aria-expanded="isMenuOpen"
      aria-haspopup="true"
    >
      •••
    </button>

    <!-- Dropdown Menu -->
    <div v-if="isMenuOpen && !isCollapsed" class="sidebar-dropdown font-mono" @click.stop>
      <button type="button" class="s-menu-item" @click="handleRename">
        <span>✎ Rename</span>
      </button>

      <button type="button" class="s-menu-item" @click="handleDuplicate">
        <span>📄 Duplicate</span>
      </button>

      <button type="button" class="s-menu-item" @click="handleShare">
        <span>🔗 Copy Share Link</span>
      </button>

      <div class="s-divider"></div>

      <button type="button" class="s-menu-item danger" @click="handleDelete">
        <span>🗑️ Delete</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useToastStore } from '../../stores/toast';

const props = defineProps({
  playlist: {
    type: Object,
    required: true,
  },
  isCollapsed: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['rename', 'duplicate', 'delete']);

const route = useRoute();
const toastStore = useToastStore();

const isMenuOpen = ref(false);
const rootRef = ref(null);

const isActive = computed(() => {
  const currentId = route.params.id;
  const pId = props.playlist._id || props.playlist.id;
  return route.path.startsWith('/playlist/') && currentId === pId;
});

const handleRename = () => {
  isMenuOpen.value = false;
  emit('rename', props.playlist);
};

const handleDuplicate = () => {
  isMenuOpen.value = false;
  emit('duplicate', props.playlist);
};

const handleShare = () => {
  isMenuOpen.value = false;
  const origin = window.location.origin;
  const id = props.playlist._id || props.playlist.id;
  const url = `${origin}/playlist/${id}`;
  navigator.clipboard.writeText(url)
    .then(() => toastStore.show('Share link copied to clipboard!', 'success'))
    .catch(() => toastStore.show('Link: ' + url, 'info'));
};

const handleDelete = () => {
  isMenuOpen.value = false;
  emit('delete', props.playlist);
};

const handleOutsideClick = (e) => {
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    isMenuOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<style scoped>
.sidebar-item-container {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  margin: 2px 0;
}

.sidebar-playlist-link {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  text-decoration: none;
  color: #111111;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 700;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 6px;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
}

.sidebar-playlist-link:hover {
  background-color: #FFFFFF;
  border-color: #111111;
  box-shadow: 2px 2px 0 #111111;
  transform: translate(-1px, -1px);
}

.sidebar-playlist-link.is-active {
  background-color: #FFD84A;
  border-color: #111111;
  box-shadow: 2px 2px 0 #111111;
  font-weight: 800;
}

.p-icon {
  font-size: 0.85rem;
  flex-shrink: 0;
}

.p-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-menu-btn {
  background: #FFFFFF;
  border: 1.5px solid transparent;
  padding: 2px 6px;
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 900;
  color: #111111;
  cursor: pointer;
  opacity: 0;
  border-radius: 4px;
  transition: opacity 0.1s ease, border-color 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
  margin-left: 2px;
}

.sidebar-item-container:hover .sidebar-menu-btn,
.sidebar-menu-btn:focus {
  opacity: 1;
  border-color: #111111;
  box-shadow: 1.5px 1.5px 0 #111111;
}

.sidebar-menu-btn:hover {
  background-color: #FFD84A;
  color: #111111;
}

.sidebar-dropdown {
  position: absolute;
  top: 100%;
  right: 4px;
  width: 180px;
  background-color: #FFFFFF;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  border-radius: 0;
  z-index: 1000;
  padding: 4px 0;
}

.s-menu-item {
  width: 100%;
  padding: 7px 12px;
  background: none;
  border: none;
  text-align: left;
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 700;
  color: #111111;
  cursor: pointer;
  transition: background-color 0.08s ease;
}

.s-menu-item:hover {
  background-color: #FFFDF8;
  font-weight: 800;
}

.s-menu-item.danger {
  color: #FF6B5E;
}

.s-menu-item.danger:hover {
  background-color: #FFE6EE;
}

.s-divider {
  height: 2px;
  background-color: #111111;
  margin: 4px 0;
}
</style>
