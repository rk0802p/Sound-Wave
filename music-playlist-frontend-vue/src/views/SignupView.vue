<template>
  <div class="auth-page">
    

    <div class="auth-card">
      <div class="brand">
        <span class="orb">🎧</span>
        <span>Soundwave</span>
      </div>

      <div class="auth-intro">
        <h2>Join Soundwave.</h2>
        <p>Create your personal profile to save bubbles and playlists.</p>
      </div>

      <div v-if="errorMessage" class="error-banner">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSignup" class="auth-form">
        <div class="form-group">
          <label>Curator Name</label>
          <input
            v-model="username"
            type="text"
            placeholder="Acoustic Explorer"
            required
            autocomplete="username"
            class="neo-input font-mono"
          />
        </div>

        <div class="form-group">
          <label>Email Address</label>
          <input
            v-model="email"
            type="email"
            placeholder="curator@soundwave.io"
            required
            autocomplete="email"
            class="neo-input font-mono"
          />
        </div>

        <div class="form-group">
          <label>Password (min 6 characters)</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="new-password"
            minlength="6"
            class="neo-input font-mono"
          />
        </div>

        <button type="submit" class="neo-submit-btn font-mono" :disabled="loading">
          <span>{{ loading ? 'Creating account...' : 'Create Account' }}</span>
        </button>
      </form>

      <div class="auth-footer">
        <p>Already have an account? <router-link to="/login" class="auth-link">Sign in</router-link></p>
        <router-link to="/" class="back-link">← Back to Soundwave</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';

const router = useRouter();
const authStore = useAuthStore();
const toastStore = useToastStore();

const username = ref('');
const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');

const handleSignup = async () => {
  if (!username.value || !email.value || !password.value) return;
  loading.value = true;
  errorMessage.value = '';

  try {
    await authStore.signup({
      username: username.value.trim(),
      email: email.value.trim(),
      password: password.value,
    });
    toastStore.success('Account created! Welcome to Soundwave.');
    router.push('/');
  } catch (err) {
    errorMessage.value = err.response?.data?.message || err.message || 'Signup failed. Please try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem 1.25rem;
  background-color: var(--bg, #F3EFE8);
  color: var(--ink, #111111);
  font-family: var(--font-body);
}

.auth-card {
  width: min(460px, 100%);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-lg, 8px 8px 0 var(--border, #111111));
  border-radius: var(--r-lg, 18px);
  padding: 2.5rem 2.2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: var(--surface-2, #FFFFFF);
}

.brand {
  font-size: 1.35rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ink, #111111);
  text-transform: uppercase;
}

.auth-intro h2 {
  font-size: 2.2rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  margin-bottom: 0.35rem;
  color: var(--ink, #111111);
  text-transform: uppercase;
}

.auth-intro p {
  color: var(--ink-muted, #4A4740);
  font-size: 0.95rem;
  font-weight: 600;
}

.error-banner {
  padding: 0.75rem 1rem;
  border-radius: var(--r-sm, 8px);
  background: #FFE8E8;
  border: 1.5px solid var(--danger, #E5372B);
  color: var(--danger, #E5372B);
  font-size: 0.88rem;
  font-weight: 700;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--ink-muted, #4A4740);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.neo-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: var(--r-sm, 8px);
  background: #FFFDF8;
  border: var(--bw, 2px) solid var(--border, #111111);
  color: var(--ink, #111111);
  font-size: 0.95rem;
  font-weight: 600;
  outline: none;
  box-sizing: border-box;
}

.neo-input:focus {
  background: #FFFFFF;
  border-color: var(--ink, #111111);
  outline: 2px solid var(--focus, #3B5BFF);
}

.neo-submit-btn {
  width: 100%;
  padding: 0.75rem;
  margin-top: 0.5rem;
  background: var(--yellow, #FFD84A);
  color: var(--ink, #111111);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  border-radius: var(--r-sm, 8px);
  font-size: 0.9rem;
  font-weight: 900;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: transform 0.08s ease;
}

.neo-submit-btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.neo-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-footer {
  text-align: center;
  font-size: 0.88rem;
  color: var(--ink-muted, #4A4740);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-weight: 600;
  border-top: 1.5px solid rgba(17, 17, 17, 0.08);
  padding-top: 1rem;
}

.auth-link {
  color: var(--ink, #111111);
  font-weight: 800;
  text-decoration: underline;
}

.back-link {
  color: var(--ink-muted, #4A4740);
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
}

.back-link:hover {
  color: var(--ink, #111111);
  text-decoration: underline;
}
</style>