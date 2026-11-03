<template>
  <div class="auth-page-wrapper">
    <div class="auth-ambient-glow"></div>

    <div class="auth-card">
      <!-- Brand Header -->
      <div class="auth-brand">
        <div class="brand-frequency">
          <span></span><span></span><span></span><span></span>
        </div>
        <span class="brand-title">SOUNDWAVE</span>
      </div>

      <div class="auth-intro">
        <h1 class="auth-heading">Create your space.</h1>
        <p class="auth-subheading">Build a library that sounds like you.</p>
      </div>

      <!-- Inline API Error -->
      <div v-if="errorMessage" class="auth-alert error">
        {{ errorMessage }}
      </div>

      <!-- Signup Form -->
      <form @submit.prevent="handleSignup" class="auth-form" novalidate>
        <AppInput
          label="Username"
          type="text"
          v-model="username"
          placeholder="e.g. nocturnal_listener"
          required
          autocomplete="username"
          :error="fieldErrors.username"
        />

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
              class="pw-toggle-btn"
              @click="showPassword = !showPassword"
              tabindex="-1"
            >
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="pw-input-wrapper">
            <input
              id="signup-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="At least 6 characters"
              required
              autocomplete="new-password"
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
          Create Account
        </AppButton>
      </form>

      <div class="auth-footer">
        <span class="footer-prompt">Already have an account?</span>
        <router-link to="/login" class="switch-link">Sign In</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AppInput from '../components/common/AppInput.vue';
import AppButton from '../components/common/AppButton.vue';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');
const fieldErrors = reactive({ username: '', email: '', password: '' });

const validateForm = () => {
  fieldErrors.username = '';
  fieldErrors.email = '';
  fieldErrors.password = '';
  let valid = true;

  if (!username.value.trim()) {
    fieldErrors.username = 'Username is required';
    valid = false;
  } else if (username.value.trim().length < 3) {
    fieldErrors.username = 'Username must be at least 3 characters';
    valid = false;
  }

  if (!email.value.trim()) {
    fieldErrors.email = 'Email address is required';
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    fieldErrors.email = 'Please enter a valid email address';
    valid = false;
  }

  if (!password.value) {
    fieldErrors.password = 'Password is required';
    valid = false;
  } else if (password.value.length < 6) {
    fieldErrors.password = 'Password must be at least 6 characters';
    valid = false;
  }

  return valid;
};

const handleSignup = async () => {
  if (!validateForm()) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    await authStore.signup(username.value, email.value, password.value);
    router.push('/');
  } catch (err) {
    errorMessage.value = err.response?.data?.message || err.message || 'Failed to create account';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth-page-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sw-bg);
  position: relative;
  overflow: hidden;
  padding: 24px;
}

.auth-ambient-glow {
  position: absolute;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(121, 104, 255, 0.08) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: 22px;
  padding: 40px 36px;
  position: relative;
  z-index: 1;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  animation: cardFadeUp 0.35s ease;
}

@keyframes cardFadeUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.auth-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 24px;
}

.brand-frequency {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 20px;
}

.brand-frequency span {
  width: 3px;
  background: var(--sw-accent);
  border-radius: 2px;
  animation: barPulse 1.2s infinite ease-in-out alternate;
}

.brand-frequency span:nth-child(1) { height: 10px; animation-delay: 0.1s; }
.brand-frequency span:nth-child(2) { height: 20px; animation-delay: 0.3s; }
.brand-frequency span:nth-child(3) { height: 14px; animation-delay: 0.2s; }
.brand-frequency span:nth-child(4) { height: 18px; animation-delay: 0.4s; }

@keyframes barPulse {
  0% { transform: scaleY(0.4); }
  100% { transform: scaleY(1); }
}

.brand-title {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: var(--sw-text-primary);
}

.auth-intro {
  text-align: center;
  margin-bottom: 28px;
}

.auth-heading {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--sw-text-primary);
  margin-bottom: 6px;
  letter-spacing: -0.5px;
}

.auth-subheading {
  font-size: 0.88rem;
  color: var(--sw-text-secondary);
}

.auth-alert {
  padding: 10px 14px;
  border-radius: var(--sw-radius-sm);
  font-size: 0.84rem;
  margin-bottom: 20px;
}

.auth-alert.error {
  background: rgba(237, 116, 125, 0.12);
  border: 1px solid rgba(237, 116, 125, 0.3);
  color: var(--sw-danger);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
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
  font-weight: 500;
  color: var(--sw-text-secondary);
}

.required-star {
  color: var(--sw-accent);
}

.pw-toggle-btn {
  font-size: 0.78rem;
  color: var(--sw-text-muted);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color var(--sw-transition-fast);
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
  border-radius: var(--sw-radius-sm);
  color: var(--sw-text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: all var(--sw-transition-fast);
}

.sw-password-input:focus {
  border-color: var(--sw-accent);
  box-shadow: 0 0 0 1px var(--sw-accent);
}

.sw-password-input.has-error {
  border-color: var(--sw-danger);
}

.field-error-text {
  font-size: 0.78rem;
  color: var(--sw-danger);
}

.auth-footer {
  margin-top: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--sw-text-secondary);
}

.switch-link {
  color: var(--sw-accent);
  font-weight: 600;
  transition: color var(--sw-transition-fast);
}

.switch-link:hover {
  color: var(--sw-accent-hover);
  text-decoration: underline;
}
</style>
