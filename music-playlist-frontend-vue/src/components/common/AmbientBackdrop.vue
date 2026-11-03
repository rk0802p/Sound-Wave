<template>
  <div class="sw-ambient-backdrop" aria-hidden="true">
    <canvas ref="canvasRef" class="ambient-canvas"></canvas>
    <div class="ambient-vignette"></div>
    <div class="ambient-noise"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { usePlayerStore } from '../../stores/player';

const playerStore = usePlayerStore();
const canvasRef = ref(null);
let animationFrameId = null;
let resizeHandler = null;

// Particle and harmonic wave configuration
let width = 0;
let height = 0;
let particles = [];
let wavePhase = 0;

const PARTICLE_COUNT = 45;

const initParticles = () => {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.8,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: (Math.random() - 0.5) * 0.35,
      baseAlpha: Math.random() * 0.3 + 0.1,
      hue: Math.random() > 0.7 ? 38 : 199, // Amber (38) or Cyan (199)
    });
  }
};

const handleResize = () => {
  if (!canvasRef.value) return;
  width = window.innerWidth;
  height = window.innerHeight;
  canvasRef.value.width = width * window.devicePixelRatio;
  canvasRef.value.height = height * window.devicePixelRatio;
  canvasRef.value.style.width = `${width}px`;
  canvasRef.value.style.height = `${height}px`;

  const ctx = canvasRef.value.getContext('2d');
  if (ctx) {
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  if (particles.length === 0) {
    initParticles();
  }
};

const render = () => {
  if (!canvasRef.value) return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);

  const isPlaying = playerStore.isPlaying;
  const waveIntensity = isPlaying ? 1.4 : 0.4;
  const speedMultiplier = isPlaying ? 1.6 : 0.8;

  wavePhase += 0.008 * speedMultiplier;

  // 1. Subtle Harmonic Resonance Wave Lines (Fluid Sound Physics)
  ctx.save();
  ctx.lineWidth = 1.2;

  // Cyan Acoustic Wave
  ctx.beginPath();
  for (let x = 0; x <= width; x += 8) {
    const y =
      height * 0.45 +
      Math.sin(x * 0.002 + wavePhase) * (24 * waveIntensity) +
      Math.sin(x * 0.006 + wavePhase * 1.5) * (14 * waveIntensity);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = isPlaying ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.06)';
  ctx.stroke();

  // Amber Harmonics Wave
  ctx.beginPath();
  for (let x = 0; x <= width; x += 8) {
    const y =
      height * 0.55 +
      Math.cos(x * 0.0025 + wavePhase * 1.2) * (20 * waveIntensity) +
      Math.sin(x * 0.004 - wavePhase) * (12 * waveIntensity);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = isPlaying ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.04)';
  ctx.stroke();

  ctx.restore();

  // 2. Slow Kinetic Starlight / Acoustic Particles
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.speedX * speedMultiplier;
    p.y += p.speedY * speedMultiplier;

    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    const pulse = Math.sin(wavePhase * 2 + i) * 0.15;
    const finalAlpha = Math.max(0.05, Math.min(0.8, p.baseAlpha + pulse + (isPlaying ? 0.15 : 0)));

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    if (p.hue === 38) {
      ctx.fillStyle = `rgba(245, 158, 11, ${finalAlpha})`;
    } else {
      ctx.fillStyle = `rgba(56, 189, 248, ${finalAlpha})`;
    }
    ctx.fill();
  }

  animationFrameId = requestAnimationFrame(render);
};

onMounted(() => {
  handleResize();
  resizeHandler = () => handleResize();
  window.addEventListener('resize', resizeHandler, { passive: true });
  animationFrameId = requestAnimationFrame(render);
});

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
});
</script>

<style scoped>
.sw-ambient-backdrop {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  background: radial-gradient(circle at 50% 0%, rgba(20, 30, 48, 0.4) 0%, rgba(6, 7, 9, 0.95) 75%);
}

.ambient-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.ambient-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 30%, rgba(6, 7, 9, 0.6) 80%, rgba(6, 7, 9, 0.9) 100%);
}

.ambient-noise {
  position: absolute;
  inset: 0;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}
</style>
