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
import AppLayout from './components/layout/AppLayout.vue';
import OfflineBanner from './components/common/OfflineBanner.vue';

const route = useRoute();

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
  color: var(--ink);
}
</style>
