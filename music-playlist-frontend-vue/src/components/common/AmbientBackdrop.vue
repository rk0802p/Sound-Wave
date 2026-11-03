<template>
  <div class="sw-ambient-backdrop" aria-hidden="true">
    <canvas ref="canvasRef" class="ambient-canvas"></canvas>
    <div class="ambient-vignette"></div>
    <div class="ambient-grain"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { usePlayerStore } from '../../stores/player';

const playerStore = usePlayerStore();
const canvasRef = ref(null);
let animationFrameId = null;
let resizeHandler = null;

let width = 0;
let height = 0;
let particles = [];
let wavePhase = 0;

const PARTICLE_COUNT = 48;

const initParticles = () => {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.8,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4,
      baseAlpha: Math.random() * 0.35 + 0.1,
      // Color: 0 = Acid Lime (#ccff00), 1 = Radiant Coral (#ff5722), 2 = Magenta (#e02678)
      type: Math.floor(Math.random() * 3),
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
  const waveIntensity = isPlaying ? 1.5 : 0.45;
  const speedMultiplier = isPlaying ? 1.8 : 0.75;

  wavePhase += 0.009 * speedMultiplier;

  ctx.save();
  ctx.lineWidth = 1.4;

  // 1. Acid Lime Acoustic Harmonic Wave (#ccff00)
  ctx.beginPath();
  for (let x = 0; x <= width; x += 8) {
    const y =
      height * 0.42 +
      Math.sin(x * 0.0022 + wavePhase) * (26 * waveIntensity) +
      Math.sin(x * 0.0065 + wavePhase * 1.4) * (14 * waveIntensity);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = isPlaying ? 'rgba(204, 255, 0, 0.22)' : 'rgba(204, 255, 0, 0.07)';
  ctx.stroke();

  // 2. Radiant Coral Harmonic Wave (#ff5722)
  ctx.beginPath();
  for (let x = 0; x <= width; x += 8) {
    const y =
      height * 0.58 +
      Math.cos(x * 0.0028 + wavePhase * 1.1) * (22 * waveIntensity) +
      Math.sin(x * 0.0042 - wavePhase) * (12 * waveIntensity);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = isPlaying ? 'rgba(255, 87, 34, 0.2)' : 'rgba(255, 87, 34, 0.06)';
  ctx.stroke();

  // 3. Neon Magenta Resonance Line (#e02678)
  ctx.beginPath();
  for (let x = 0; x <= width; x += 10) {
    const y =
      height * 0.5 +
      Math.sin(x * 0.0018 - wavePhase * 0.8) * (18 * waveIntensity);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = isPlaying ? 'rgba(224, 38, 120, 0.16)' : 'rgba(224, 38, 120, 0.04)';
  ctx.stroke();

  ctx.restore();

  // 4. Kinetic Acid & Coral Starlight Particles
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.speedX * speedMultiplier;
    p.y += p.speedY * speedMultiplier;

    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    const pulse = Math.sin(wavePhase * 2 + i) * 0.15;
    const finalAlpha = Math.max(0.06, Math.min(0.85, p.baseAlpha + pulse + (isPlaying ? 0.2 : 0)));

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    if (p.type === 0) {
      ctx.fillStyle = `rgba(204, 255, 0, ${finalAlpha})`; // Acid Lime
    } else if (p.type === 1) {
      ctx.fillStyle = `rgba(255, 87, 34, ${finalAlpha})`; // Radiant Coral
    } else {
      ctx.fillStyle = `rgba(224, 38, 120, ${finalAlpha})`; // Neon Magenta
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
  background: radial-gradient(circle at 50% 0%, rgba(45, 18, 72, 0.45) 0%, rgba(14, 7, 23, 0.95) 70%, rgba(9, 4, 14, 1) 100%);
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
  background: radial-gradient(circle at center, transparent 35%, rgba(9, 4, 14, 0.6) 80%, rgba(9, 4, 14, 0.95) 100%);
}

.ambient-grain {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}
</style>
