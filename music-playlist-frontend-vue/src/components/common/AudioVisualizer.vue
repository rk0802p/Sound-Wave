<template>
  <div class="sw-visualizer-container" ref="containerRef">
    <canvas ref="canvasRef" class="visualizer-canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  isPlaying: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: 'bars', // 'bars' | 'wave' | 'particles'
  },
  barCount: {
    type: Number,
    default: 28,
  },
  accentColor: {
    type: String,
    default: '#38bdf8',
  },
  secondaryColor: {
    type: String,
    default: '#f59e0b',
  },
});

const containerRef = ref(null);
const canvasRef = ref(null);
let animationFrameId = null;
let resizeObserver = null;

// Bar animation state variables
let barHeights = [];
let targetHeights = [];

// Particle state variables
let particles = [];

const initBars = () => {
  barHeights = Array.from({ length: props.barCount }, () => 4);
  targetHeights = Array.from({ length: props.barCount }, () => 4);
};

const initParticles = (width, height) => {
  particles = Array.from({ length: 32 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 2.5 + 1,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8,
    alpha: Math.random() * 0.6 + 0.2,
  }));
};

const resizeCanvas = () => {
  if (!canvasRef.value || !containerRef.value) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = containerRef.value.getBoundingClientRect();
  canvasRef.value.width = rect.width * dpr;
  canvasRef.value.height = rect.height * dpr;

  const ctx = canvasRef.value.getContext('2d');
  ctx.scale(dpr, dpr);

  if (props.mode === 'particles') {
    initParticles(rect.width, rect.height);
  }
};

const renderLoop = (timestamp) => {
  if (!canvasRef.value || !containerRef.value) return;
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;

  ctx.clearRect(0, 0, width, height);

  if (props.mode === 'bars') {
    renderBars(ctx, width, height, timestamp);
  } else if (props.mode === 'particles') {
    renderParticles(ctx, width, height);
  } else {
    renderWave(ctx, width, height, timestamp);
  }

  animationFrameId = requestAnimationFrame(renderLoop);
};

const renderBars = (ctx, width, height, timestamp) => {
  const count = props.barCount;
  const gap = 3;
  const totalGap = (count - 1) * gap;
  const barWidth = Math.max(2, (width - totalGap) / count);

  const grad = ctx.createLinearGradient(0, height, 0, 0);
  grad.addColorStop(0, props.accentColor);
  grad.addColorStop(0.7, props.secondaryColor);
  grad.addColorStop(1, '#ffffff');

  for (let i = 0; i < count; i++) {
    if (props.isPlaying) {
      // Dynamic acoustic oscillation simulated via harmonic frequency sines
      const wave1 = Math.sin((timestamp * 0.005) + (i * 0.35));
      const wave2 = Math.cos((timestamp * 0.003) + (i * 0.2));
      const wave3 = Math.sin((timestamp * 0.008) + (i * 0.5));
      const normalized = Math.max(0.1, (wave1 + wave2 + wave3 + 3) / 6);
      targetHeights[i] = normalized * (height * 0.85);
    } else {
      // Gentle breathing idle wave
      const idleWave = Math.sin((timestamp * 0.002) + (i * 0.2));
      targetHeights[i] = 4 + (idleWave + 1) * 3;
    }

    // Smooth lerp
    barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.18;

    const h = Math.max(2, barHeights[i]);
    const x = i * (barWidth + gap);
    const y = height - h;

    ctx.fillStyle = grad;
    // Draw rounded top bar
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, h, [2, 2, 0, 0]);
    ctx.fill();
  }
};

const renderParticles = (ctx, width, height) => {
  particles.forEach((p) => {
    if (props.isPlaying) {
      p.x += p.vx * 1.8;
      p.y += p.vy * 1.8;
    } else {
      p.x += p.vx * 0.4;
      p.y += p.vy * 0.4;
    }

    // Wrap around boundaries
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = props.accentColor;
    ctx.globalAlpha = p.alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  });
};

const renderWave = (ctx, width, height, timestamp) => {
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = props.accentColor;

  const sliceWidth = width / 60;
  let x = 0;

  for (let i = 0; i <= 60; i++) {
    const wave = props.isPlaying
      ? Math.sin((i * 0.2) + (timestamp * 0.006)) * (height * 0.35)
      : Math.sin((i * 0.1) + (timestamp * 0.001)) * 4;
    const y = height / 2 + wave;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }
  ctx.stroke();
};

onMounted(() => {
  initBars();
  resizeCanvas();

  if (window.ResizeObserver && containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(containerRef.value);
  }

  animationFrameId = requestAnimationFrame(renderLoop);
});

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

watch(() => props.mode, () => {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    if (props.mode === 'particles') {
      initParticles(rect.width, rect.height);
    } else {
      initBars();
    }
  }
});
</script>

<style scoped>
.sw-visualizer-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  pointer-events: none;
}

.visualizer-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
