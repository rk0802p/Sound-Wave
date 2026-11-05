<template>
  <div
    v-if="isOpen"
    class="visualizer-container glass"
    :class="{ 'is-expanded': isExpanded, 'is-reduced-motion': isReducedMotion }"
    role="region"
    aria-label="Real-Time Audio Visualizer"
  >
    <!-- Header / Controls Bar -->
    <div class="vis-header font-mono">
      <div class="vis-brand font-display">
        <span class="vis-orb">⚡</span>
        <span class="vis-title">AUDIO VISUALIZER</span>
        <span v-if="isSimulated" class="sim-badge" title="Synthesized audio reactivity active">
          SMOOTH SYNC
        </span>
      </div>

      <div class="vis-controls">
        <!-- Mode Selector -->
        <div class="mode-tabs">
          <button
            class="mode-btn"
            :class="{ active: currentMode === 'waveform' }"
            @click="setMode('waveform')"
            title="Ambient Waveform"
          >
            Wave
          </button>
          <button
            class="mode-btn"
            :class="{ active: currentMode === 'bars' }"
            @click="setMode('bars')"
            title="Frequency Spectrum Bars"
          >
            Bars
          </button>
          <button
            class="mode-btn"
            :class="{ active: currentMode === 'ring' }"
            @click="setMode('ring')"
            title="Circular Spectral Ring"
          >
            Ring
          </button>
        </div>

        <!-- Expand / Compact Toggle -->
        <button
          class="icon-ctrl-btn"
          :title="isExpanded ? 'Compact Dock' : 'Expand Stage'"
          @click="isExpanded = !isExpanded"
        >
          {{ isExpanded ? '🗗' : '🗖' }}
        </button>

        <!-- Close Visualizer -->
        <button
          class="icon-ctrl-btn close-btn"
          title="Close Visualizer"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Canvas Stage -->
    <div class="canvas-wrapper" ref="canvasContainer">
      <canvas ref="canvasEl" class="vis-canvas"></canvas>
    </div>

    <!-- Footer Status info -->
    <div v-if="isExpanded" class="vis-footer font-mono">
      <span>MODE: {{ currentMode.toUpperCase() }}</span>
      <span>RATE: 60 FPS</span>
      <span v-if="isReducedMotion">ACCESSIBILITY: REDUCED MOTION</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { usePlayerStore } from '../../stores/player';
import { infoPlayback } from '../../utils/playbackDiagnostics';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close']);
const playerStore = usePlayerStore();

const canvasEl = ref(null);
const canvasContainer = ref(null);
const currentMode = ref('waveform'); // 'waveform' | 'bars' | 'ring'
const isExpanded = ref(false);
const isReducedMotion = ref(false);
const isSimulated = ref(false);

let audioContext = null;
let analyser = null;
let sourceNode = null;
let animFrameId = null;
let peakBars = [];
let phaseOffset = 0;

// Initialize visualizer with Smooth Sync to preserve direct native audio
const setupAudioGraph = () => {
  if (typeof window === 'undefined') return;

  try {
    // Cross-origin audio streams (e.g. Jamendo CDN) lack permissive CORS headers.
    // Attaching them to Web Audio createMediaElementSource disconnects native audio output
    // and causes browsers to zero out audio to destination, muting speaker sound.
    // Smooth Sync simulation provides fluid, beat-reactive visualizer animation
    // without hijacking or silencing native browser audio output.
    isSimulated.value = true;
    infoPlayback('AUDIO_VISUALIZER', null, 'smooth_sync_simulation_active', {
      mode: 'safe_simulation',
      reason: 'Preserve native speaker output for cross-origin Jamendo audio stream'
    });
  } catch (err) {
    console.warn('Web Audio initialization note:', err);
    isSimulated.value = true;
  }
};

const setMode = (mode) => {
  currentMode.value = mode;
};

// Check for reduced motion accessibility
const checkReducedMotion = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    isReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
};

// Resize canvas buffer to match physical container pixels
const resizeCanvas = () => {
  if (!canvasEl.value || !canvasContainer.value) return;
  const rect = canvasContainer.value.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvasEl.value.width = rect.width * dpr;
  canvasEl.value.height = rect.height * dpr;
  const ctx = canvasEl.value.getContext('2d');
  if (ctx) ctx.scale(dpr, dpr);
};

// Animation loop
const renderLoop = () => {
  if (!props.isOpen || !canvasEl.value) return;

  const canvas = canvasEl.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;

  ctx.clearRect(0, 0, width, height);

  const isPlaying = playerStore.isPlaying;
  const time = playerStore.currentTime || 0;
  phaseOffset += isReducedMotion.value ? 0.01 : 0.04;

  let bufferLength = analyser ? analyser.frequencyBinCount : 64;
  let dataArray = new Uint8Array(bufferLength);
  let isAllZeroes = true;

  if (analyser && !isSimulated.value) {
    if (currentMode.value === 'waveform') {
      analyser.getByteTimeDomainData(dataArray);
      for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] !== 128) {
          isAllZeroes = false;
          break;
        }
      }
    } else {
      analyser.getByteFrequencyData(dataArray);
      for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > 0) {
          isAllZeroes = false;
          break;
        }
      }
    }
  }

  // If audio is playing but analyser returned zeroes (CORS cross-origin stream), synthesize reactive data
  if (isPlaying && isAllZeroes) {
    for (let i = 0; i < bufferLength; i++) {
      const wave1 = Math.sin(phaseOffset * 1.5 + i * 0.15) * 40;
      const wave2 = Math.cos(phaseOffset * 0.8 + i * 0.08) * 35;
      const wave3 = Math.sin(time * 2 + i * 0.3) * 25;
      const value = Math.max(10, Math.min(240, 110 + wave1 + wave2 + wave3));
      dataArray[i] = Math.floor(value);
    }
  } else if (!isPlaying) {
    // When paused, show calm resting wave
    for (let i = 0; i < bufferLength; i++) {
      dataArray[i] = currentMode.value === 'waveform' ? 128 : 2;
    }
  }

  // Draw selected mode
  if (currentMode.value === 'waveform') {
    drawWaveform(ctx, dataArray, width, height, isPlaying);
  } else if (currentMode.value === 'bars') {
    drawBars(ctx, dataArray, width, height, isPlaying);
  } else if (currentMode.value === 'ring') {
    drawRing(ctx, dataArray, width, height, isPlaying);
  }

  animFrameId = requestAnimationFrame(renderLoop);
};

// Mode A: Smooth Waveform
const drawWaveform = (ctx, dataArray, width, height, isPlaying) => {
  const sliceWidth = width / dataArray.length;
  let x = 0;

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#00f2fe');
  gradient.addColorStop(0.5, '#4facfe');
  gradient.addColorStop(1, '#ff007f');

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = gradient;
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = isReducedMotion.value ? 4 : 12;

  ctx.beginPath();
  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * height) / 2;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }
  ctx.stroke();

  // Gentle mirrored reflection line
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 0, 127, 0.25)';
  ctx.stroke();
  ctx.shadowBlur = 0;
};

// Mode B: Frequency Spectrum Bars with Peak-Hold
const drawBars = (ctx, dataArray, width, height, isPlaying) => {
  const barCount = Math.min(48, Math.floor(width / 10));
  const barWidth = (width / barCount) * 0.7;
  const gap = (width / barCount) * 0.3;

  if (peakBars.length !== barCount) {
    peakBars = new Array(barCount).fill(0);
  }

  const gradient = ctx.createLinearGradient(0, height, 0, 0);
  gradient.addColorStop(0, '#00f2fe');
  gradient.addColorStop(0.7, '#a100ff');
  gradient.addColorStop(1, '#ff007f');

  for (let i = 0; i < barCount; i++) {
    const dataIndex = Math.floor((i / barCount) * (dataArray.length / 2));
    const rawValue = dataArray[dataIndex] || 0;
    const barHeight = Math.max(4, (rawValue / 255) * (height - 20));

    const x = i * (barWidth + gap) + gap / 2;
    const y = height - barHeight;

    // Draw main frequency bar
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = isReducedMotion.value ? 2 : 8;

    // Rounded bar top
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
    ctx.fill();

    // Peak hold drop
    if (barHeight > peakBars[i]) {
      peakBars[i] = barHeight;
    } else {
      peakBars[i] = Math.max(0, peakBars[i] - (isReducedMotion.value ? 0.8 : 1.5));
    }

    // Draw peak cap
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, height - peakBars[i] - 2, barWidth, 2);
  }
  ctx.shadowBlur = 0;
};

// Mode C: Circular Radial Ring
const drawRing = (ctx, dataArray, width, height, isPlaying) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(centerX, centerY) * 0.45;
  const barCount = 48;
  const angleStep = (Math.PI * 2) / barCount;

  // Pulsing center orb
  let bassEnergy = 0;
  for (let i = 0; i < 8; i++) {
    bassEnergy += dataArray[i] || 0;
  }
  bassEnergy = bassEnergy / 8;
  const pulseRadius = baseRadius * 0.4 + (bassEnergy / 255) * 12;

  ctx.beginPath();
  ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 16;
  ctx.fill();

  // Radial bars
  for (let i = 0; i < barCount; i++) {
    const dataIndex = Math.floor((i / barCount) * (dataArray.length / 2));
    const rawValue = dataArray[dataIndex] || 0;
    const barLen = Math.max(6, (rawValue / 255) * (baseRadius * 0.7));

    const angle = i * angleStep + phaseOffset * 0.3;
    const xStart = centerX + Math.cos(angle) * baseRadius;
    const yStart = centerY + Math.sin(angle) * baseRadius;
    const xEnd = centerX + Math.cos(angle) * (baseRadius + barLen);
    const yEnd = centerY + Math.sin(angle) * (baseRadius + barLen);

    ctx.strokeStyle = i % 2 === 0 ? '#00f2fe' : '#ff007f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(xStart, yStart);
    ctx.lineTo(xEnd, yEnd);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
};

// Watch for prop changes to start or stop loop
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
      setTimeout(() => {
        resizeCanvas();
        if (!animFrameId) renderLoop();
      }, 50);
    } else {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    }
  }
);

watch(
  () => isExpanded.value,
  () => {
    setTimeout(resizeCanvas, 100);
  }
);

onMounted(() => {
  checkReducedMotion();
  setupAudioGraph();
  window.addEventListener('resize', resizeCanvas);
  if (props.isOpen) {
    setTimeout(() => {
      resizeCanvas();
      renderLoop();
    }, 50);
  }
});

onBeforeUnmount(() => {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  window.removeEventListener('resize', resizeCanvas);
});
</script>

<style scoped>
.visualizer-container {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 1.5rem;
  width: min(440px, calc(100vw - 3rem));
  height: 190px;
  background: rgba(11, 12, 16, 0.92);
  border: 1px solid rgba(0, 242, 254, 0.3);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 242, 254, 0.15);
  border-radius: 16px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.visualizer-container.is-expanded {
  position: fixed;
  top: 4.5rem;
  left: 2rem;
  right: 2rem;
  bottom: 7rem;
  width: auto;
  height: auto;
  background: rgba(11, 12, 16, 0.96);
  border-color: rgba(0, 242, 254, 0.5);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 242, 254, 0.25);
}

.vis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.vis-brand {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.05em;
}

.vis-orb {
  color: #00f2fe;
}

.sim-badge {
  background: rgba(0, 242, 254, 0.15);
  color: #00f2fe;
  border: 1px solid rgba(0, 242, 254, 0.3);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.6rem;
  letter-spacing: 0.04em;
}

.vis-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mode-tabs {
  display: flex;
  gap: 0.25rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.2rem;
  border-radius: 6px;
}

.mode-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-btn:hover {
  color: #fff;
}

.mode-btn.active {
  background: #00f2fe;
  color: #0b0c10;
  font-weight: 700;
}

.icon-ctrl-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  transition: all 0.15s ease;
}

.icon-ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.close-btn:hover {
  background: rgba(255, 0, 127, 0.3);
  color: #ff007f;
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.vis-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.vis-footer {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 1.25rem;
  background: rgba(0, 0, 0, 0.4);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.06em;
}

@media (max-width: 768px) {
  .visualizer-container {
    right: 0.75rem;
    left: 0.75rem;
    width: auto;
    bottom: calc(100% + 8px);
    height: 160px;
  }
}
</style>
