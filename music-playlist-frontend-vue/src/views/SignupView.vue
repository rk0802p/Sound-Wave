<template>
  <div class="auth-page">
    <div class="wash"></div>

    <div class="glass auth-card">
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
            class="glass-input"
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
            class="glass-input"
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
            class="glass-input"
          />
        </div>

        <button type="submit" class="cta submit-btn" :disabled="loading">
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
  position: relative;
}

.auth-card {
  width: min(440px, 100%);
  border-radius: 40px;
  padding: 2.8rem 2.2rem;
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 25px 60px rgba(43, 29, 90, 0.2);
}

.brand {
  font: 800 1.5rem "Bricolage Grotesque", sans-serif;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ink);
}

.brand .orb {
  width: 32px;
  height: 32px;
  font-size: 0.95rem;
}

.auth-intro h2 {
  font-size: 2.2rem;
  margin-bottom: 0.3rem;
  color: var(--ink);
}

.auth-intro p {
  color: var(--muted);
  font-size: 0.95rem;
}

.error-banner {
  padding: 0.75rem 1rem;
  border-radius: 16px;
  background: rgba(255, 79, 154, 0.15);
  border: 1px solid rgba(255, 79, 154, 0.4);
  color: #ff2b7d;
  font-size: 0.88rem;
  font-weight: 600;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.glass-input {
  width: 100%;
  padding: 0.85rem 1.2rem;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.7);
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  color: var(--ink);
  font-size: 1rem;
  font-weight: 500;
  outline: none;
  transition: all 0.2s;
}

.glass-input:focus {
  background: #ffffff;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(43, 29, 90, 0.1);
}

.submit-btn {
  width: 100%;
  justify-content: center;
  margin-top: 0.6rem;
}

.auth-footer {
  text-align: center;
  font-size: 0.9rem;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.auth-link {
  color: var(--ink);
  font-weight: 700;
  text-decoration: underline;
}

.back-link {
  color: var(--muted);
  font-size: 0.85rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--ink);
}
</style>
