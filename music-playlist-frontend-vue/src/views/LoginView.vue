<template>
  <div class="auth-page-wrapper">
    <!-- Subtle Ambient Acoustic Glow -->
    <div class="auth-ambient-glow"></div>

    <div class="auth-card">
      <!-- Brand Header -->
      <div class="auth-brand">
        <div class="brand-sound-mark">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="brand-text-lockup">
          <span class="brand-title font-display">SOUNDWAVE</span>
          <span class="brand-badge font-mono">ATELIER</span>
        </div>
      </div>

      <div class="auth-intro">
        <h1 class="auth-heading font-display">Welcome back.</h1>
        <p class="auth-subheading">Enter your personal listening workstation.</p>
      </div>

      <!-- Session Expired Warning -->
      <div v-if="sessionExpired" class="auth-alert warning font-mono">
        Your session expired. Please sign in again.
      </div>

      <!-- Inline API Error -->
      <div v-if="errorMessage" class="auth-alert error">
        {{ errorMessage }}
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="auth-form" novalidate>
        <AppInput
          label="Email address"
          type="email"
          v-model="email"
          placeholder="you@example.com"
          required
          autocomplete="email"
          :error="fieldErrors.email"
        />

        <div class="password-field-group">
          <div class="password-label-row">
            <label class="field-label">Password <span class="required-star">*</span></label>
            <button
              type="button"
              class="pw-toggle-btn font-mono"
              @click="showPassword = !showPassword"
              tabindex="-1"
            >
              {{ showPassword ? 'HIDE' : 'SHOW' }}
            </button>
          </div>
          <div class="pw-input-wrapper">
            <input
              id="login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              required
              autocomplete="current-password"
              class="sw-password-input"
              :class="{ 'has-error': fieldErrors.password }"
            />
          </div>
          <span v-if="fieldErrors.password" class="field-error-text">{{ fieldErrors.password }}</span>
        </div>

        <AppButton
          type="submit"
          variant="primary"
          size="lg"
          :full-width="true"
          :loading="loading"
        >
          Sign In
        </AppButton>
      </form>

      <div class="auth-footer">
        <span class="footer-prompt">Don't have an account?</span>
        <router-link to="/signup" class="switch-link">Create Account</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AppInput from '../components/common/AppInput.vue';
import AppButton from '../components/common/AppButton.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');
const sessionExpired = ref(false);

const fieldErrors = reactive({
  email: '',
  password: '',
});

onMounted(() => {
  if (route.query.expired === 'true') {
    sessionExpired.value = true;
  }
});

const validate = () => {
  let valid = true;
  fieldErrors.email = '';
  fieldErrors.password = '';
  errorMessage.value = '';

  if (!email.value.trim()) {
    fieldErrors.email = 'Email address is required';
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    fieldErrors.email = 'Please provide a valid email';
    valid = false;
  }

  if (!password.value) {
    fieldErrors.password = 'Password is required';
    valid = false;
  }

  return valid;
};

const handleLogin = async () => {
  if (!validate()) return;

  loading.value = true;
  errorMessage.value = '';
  sessionExpired.value = false;

  try {
    await authStore.login(email.value.trim(), password.value);
    router.push('/');
  } catch (err) {
    errorMessage.value = err.response?.data?.message || err.message || 'Login failed. Please verify credentials.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth-page-wrapper {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sw-void);
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.auth-ambient-glow {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%);
  pointer-events: none;
  filter: blur(50px);
}

.auth-card {
  width: 100%;
  max-width: 440px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-xl);
  padding: 40px 36px;
  position: relative;
  z-index: 10;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
  animation: cardEnter 260ms var(--sw-ease-out);
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.auth-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
}

.brand-sound-mark {
  display: flex;
  align-items: center;
  gap: 2.5px;
  height: 20px;
}

.brand-sound-mark span {
  width: 3px;
  background: var(--sw-accent);
  border-radius: 2px;
  animation: markWave 1.4s infinite ease-in-out alternate;
}

.brand-sound-mark span:nth-child(1) { height: 6px; animation-delay: 0.1s; }
.brand-sound-mark span:nth-child(2) { height: 16px; animation-delay: 0.3s; }
.brand-sound-mark span:nth-child(3) { height: 10px; animation-delay: 0.15s; }
.brand-sound-mark span:nth-child(4) { height: 20px; animation-delay: 0.4s; }
.brand-sound-mark span:nth-child(5) { height: 8px; animation-delay: 0.25s; }

@keyframes markWave {
  0% { transform: scaleY(0.4); }
  100% { transform: scaleY(1.1); }
}

.brand-text-lockup {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--sw-text-primary);
}

.brand-badge {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--sw-accent);
  letter-spacing: 0.14em;
}

.auth-intro {
  text-align: center;
  margin-bottom: 28px;
}

.auth-heading {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--sw-text-primary);
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}

.auth-subheading {
  font-size: 0.88rem;
  color: var(--sw-text-secondary);
}

.auth-alert {
  padding: 10px 14px;
  border-radius: var(--sw-radius-sm);
  font-size: 0.82rem;
  margin-bottom: 20px;
}

.auth-alert.warning {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: var(--sw-warning);
}

.auth-alert.error {
  background: rgba(244, 63, 94, 0.12);
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: var(--sw-danger);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.password-field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.password-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--sw-text-secondary);
}

.required-star {
  color: var(--sw-accent);
}

.pw-toggle-btn {
  font-size: 0.72rem;
  color: var(--sw-text-muted);
  cursor: pointer;
  padding: 2px 6px;
}

.pw-toggle-btn:hover {
  color: var(--sw-text-primary);
}

.sw-password-input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  background: var(--sw-surface-hover);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  color: var(--sw-text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: all var(--sw-transition-fast);
}

.sw-password-input:focus {
  border-color: var(--sw-accent);
  background: var(--sw-surface-active);
  box-shadow: 0 0 14px var(--sw-accent-soft);
}

.sw-password-input.has-error {
  border-color: var(--sw-danger);
}

.field-error-text {
  font-size: 0.76rem;
  color: var(--sw-danger);
}

.auth-footer {
  margin-top: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.86rem;
  color: var(--sw-text-secondary);
}

.switch-link {
  color: var(--sw-accent);
  font-weight: 700;
}

.switch-link:hover {
  text-decoration: underline;
}
</style>
