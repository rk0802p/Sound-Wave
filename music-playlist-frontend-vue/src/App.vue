<template>
  <div class="app-root">
    <OfflineBanner />
    <component :is="layout">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </component>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from './components/layout/AppShell.vue';
import OfflineBanner from './components/common/OfflineBanner.vue';

const route = useRoute();

const isAuthRoute = computed(() => {
  return route.path === '/login' || route.path === '/signup';
});

const layout = computed(() => {
  return isAuthRoute.value ? 'div' : AppShell;
});
</script>

<style>
.app-root {
  min-height: 100vh;
  width: 100%;
  color: var(--ink);
}
</style>
