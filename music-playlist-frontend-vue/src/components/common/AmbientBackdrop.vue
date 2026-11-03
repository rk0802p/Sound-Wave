<template>
  <div class="pg-ambient-backdrop" aria-hidden="true">
    <!-- Soft organic editorial aura blobs in warm peach, butter, lavender, and mint -->
    <div class="aura-blob aura-coral" :class="{ 'is-pulsing': playerStore.isPlaying }"></div>
    <div class="aura-blob aura-cobalt" :class="{ 'is-pulsing': playerStore.isPlaying }"></div>
    <div class="aura-blob aura-butter" :class="{ 'is-pulsing': playerStore.isPlaying }"></div>
    <div class="aura-blob aura-mint" :class="{ 'is-pulsing': playerStore.isPlaying }"></div>
  </div>
</template>

<script setup>
import { usePlayerStore } from '../../stores/player';

const playerStore = usePlayerStore();
</script>

<style scoped>
.pg-ambient-backdrop {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  background-color: var(--pg-bg);
}

.aura-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.45;
  transition: transform 1200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 800ms ease;
  will-change: transform, opacity;
}

.aura-coral {
  top: -10%;
  right: -5%;
  width: 550px;
  height: 550px;
  background: radial-gradient(circle, #FFD9C7 0%, rgba(255, 217, 199, 0) 70%);
}

.aura-cobalt {
  bottom: 5%;
  left: -10%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, #E8DFFF 0%, rgba(232, 223, 255, 0) 70%);
}

.aura-butter {
  top: 35%;
  left: 20%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, #FFF5C2 0%, rgba(255, 245, 194, 0) 70%);
  opacity: 0.55;
}

.aura-mint {
  bottom: 20%;
  right: 15%;
  width: 480px;
  height: 480px;
  background: radial-gradient(circle, #E7FAF2 0%, rgba(231, 250, 242, 0) 70%);
  opacity: 0.4;
}

.aura-blob.is-pulsing {
  opacity: 0.65;
  transform: scale(1.08);
}
</style>
