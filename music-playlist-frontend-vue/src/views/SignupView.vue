<template>
  <div class="auth-page-wrapper">
    <div class="auth-card">
      <!-- Brand Header -->
      <div class="auth-brand">
        <div class="brand-equalizer">
          <span class="eq-bar bar-1"></span>
          <span class="eq-bar bar-2"></span>
          <span class="eq-bar bar-3"></span>
          <span class="eq-bar bar-4"></span>
        </div>
        <div class="brand-text-lockup">
          <span class="brand-title font-display">SOUNDWAVE</span>
          <span class="brand-badge font-mono">PLAYGROUND</span>
        </div>
      </div>

      <div class="auth-intro">
        <h1 class="auth-heading font-display">Create Your Space.</h1>
        <p class="auth-subheading">Build your personal mixtape and audio collection.</p>
      </div>

      <!-- Inline API Error -->
      <div v-if="errorMessage" class="auth-alert error font-mono">
        {{ errorMessage }}
      </div>

      <!-- Signup Form -->
      <form @submit.prevent="handleSignup" class="auth-form" novalidate>
        <AppInput
          label="Username"
          type="text"
          v-model="username"
          placeholder="e.g. tape_curator"
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
            <label class="field-label font-mono">Password <span class="required-star">*</span></label>
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
          <span v-if="fieldErrors.password" class="field-error-text font-mono">{{ fieldErrors.password }}</span>
        </div>

        <AppButton
          type="submit"
          variant="primary"
          size="lg"
          :full-width="true"
          :loading="loading"
        >
          Create Account →
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

const fieldErrors = reactive({
  username: '',
  email: '',
  password: '',
});

const validate = () => {
  let valid = true;
  fieldErrors.username = '';
  fieldErrors.email = '';
  fieldErrors.password = '';
  errorMessage.value = '';

  if (!username.value.trim()) {
    fieldErrors.username = 'Username is required';
    valid = false;
  } else if (username.value.trim().length < 2) {
    fieldErrors.username = 'Username must be at least 2 characters';
    valid = false;
  }

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
  } else if (password.value.length < 6) {
    fieldErrors.password = 'Password must be at least 6 characters';
    valid = false;
  }

  return valid;
};

const handleSignup = async () => {
  if (!validate()) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    await authStore.signup(username.value.trim(), email.value.trim(), password.value);
    router.push('/');
  } catch (err) {
    errorMessage.value = err.response?.data?.message || err.message || 'Registration failed.';
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
  background: var(--pg-bg);
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-xl);
  padding: 44px 38px;
  box-shadow: var(--pg-shadow-solid-lg);
  animation: cardEnter 260ms var(--pg-ease-spring);
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.97);
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

.brand-equalizer {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 22px;
  padding: 2px 4px;
  background: var(--pg-ink);
  border-radius: var(--pg-radius-xs);
}

.eq-bar {
  width: 3.5px;
  background: var(--pg-citron);
  border-radius: 1px;
}

.bar-1 { height: 8px; }
.bar-2 { height: 16px; }
.bar-3 { height: 10px; }
.bar-4 { height: 18px; }

.brand-text-lockup {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--pg-ink);
  letter-spacing: -0.04em;
}

.brand-badge {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 2px 8px;
  background: var(--pg-coral);
  color: #fff;
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
}

.auth-intro {
  text-align: center;
  margin-bottom: 28px;
}

.auth-heading {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--pg-ink);
  letter-spacing: -0.03em;
  margin-bottom: 6px;
}

.auth-subheading {
  font-size: 0.9rem;
  color: var(--pg-ink-secondary);
}

.auth-alert {
  padding: 10px 14px;
  border-radius: var(--pg-radius-md);
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 20px;
  border: 1.5px solid var(--pg-border);
}

.auth-alert.error {
  background: var(--pg-surface-peach);
  color: var(--pg-coral);
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
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--pg-ink);
}

.required-star {
  color: var(--pg-coral);
}

.pw-toggle-btn {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--pg-cobalt);
  cursor: pointer;
  padding: 2px 6px;
}

.sw-password-input {
  width: 100%;
  height: 44px;
  padding: 0 16px;
  background: var(--pg-canvas);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-sm);
  color: var(--pg-ink);
  font-size: 0.92rem;
  outline: none;
  box-shadow: 2px 2px 0px var(--pg-border);
  transition: all var(--pg-transition-spring);
}

.sw-password-input:focus {
  border-color: var(--pg-cobalt);
  box-shadow: 3px 3px 0px var(--pg-cobalt);
}

.sw-password-input.has-error {
  border-color: var(--pg-coral);
  box-shadow: 3px 3px 0px var(--pg-coral);
}

.field-error-text {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--pg-coral);
}

.auth-footer {
  margin-top: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.88rem;
  color: var(--pg-ink-secondary);
}

.switch-link {
  color: var(--pg-cobalt);
  font-weight: 800;
  text-decoration: underline;
}
</style>
