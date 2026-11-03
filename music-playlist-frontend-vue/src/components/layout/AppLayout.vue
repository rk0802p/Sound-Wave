<template>
  <div class="soundwave-app">
    <slot></slot>
    <ToastContainer />
  </div>
</template>

<script setup>
import ToastContainer from '../common/ToastContainer.vue';
</script>

<style scoped>
.soundwave-app {
  min-height: 100vh;
  width: 100%;
  position: relative;
}
</style>
