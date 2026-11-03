<template>
  <div class="app-root">
    <component :is="layout">
      <router-view v-slot="{ Component }">
        <transition name="sw-page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </component>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from './components/layout/AppLayout.vue';

import { useAuthStore } from './stores/auth';
import { useSpotifyStore } from './stores/spotify';

const route = useRoute();
const authStore = useAuthStore();
const spotifyStore = useSpotifyStore();

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await spotifyStore.checkStatus();
  }
  spotifyStore.handleCallbackParams();
});

const isAuthRoute = computed(() => {
  return route.path === '/login' || route.path === '/signup';
});

const layout = computed(() => {
  return isAuthRoute.value ? 'div' : AppLayout;
});
</script>

<style>
.app-root {
  min-height: 100vh;
  width: 100%;
  background: var(--sw-bg);
  color: var(--sw-text-primary);
}
</style>
