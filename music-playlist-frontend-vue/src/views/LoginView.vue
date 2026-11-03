<template>
  <div class="auth-page-wrapper">
    <div class="auth-card">
      <div class="auth-brand">
        <div class="logo-bars">
          <span></span><span></span><span></span><span></span>
        </div>
        <h1 class="brand-title">SOUNDWAVE</h1>
      </div>

      <div class="auth-header">
        <h2>Sign In</h2>
        <p>Access your curated music library and playlists</p>
      </div>

      <div v-if="sessionExpiredNotice" class="auth-alert warning">
        Your session has expired. Please log in again.
      </div>

      <div v-if="errorMessage" class="auth-alert error">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label>Email Address</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="you@example.com"
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label>Password</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            autocomplete="current-password"
          />
        </div>

        <button type="submit" class="btn-auth-submit" :disabled="loading">
          <span v-if="loading">Signing In...</span>
          <span v-else>Sign In</span>
        </button>
      </form>

      <div class="auth-footer">
        <span>Don't have an account?</span>
        <router-link to="/signup" class="auth-switch-link">Create Account</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const loading = ref(false);

const sessionExpiredNotice = computed(() => route.query.expired === 'true');

const handleLogin = async () => {
  errorMessage.value = '';
  loading.value = true;

  try {
    await authStore.login(email.value, password.value);
    router.push('/');
  } catch (err) {
    errorMessage.value = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
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
  padding: 24px;
  background: radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
              radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 40%),
              #0a0b10;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: rgba(18, 19, 29, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 40px 32px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  color: #fff;
}

.auth-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
}

.logo-bars {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 24px;
}

.logo-bars span {
  width: 3px;
  background: #6366f1;
  border-radius: 2px;
}

.logo-bars span:nth-child(1) { height: 12px; }
.logo-bars span:nth-child(2) { height: 24px; }
.logo-bars span:nth-child(3) { height: 16px; }
.logo-bars span:nth-child(4) { height: 10px; }

.brand-title {
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  background: linear-gradient(135deg, #fff, #a5b4fc);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  margin: 0;
}

.auth-header {
  text-align: center;
  margin-bottom: 28px;
}

.auth-header h2 {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0 0 6px 0;
}

.auth-header p {
  font-size: 0.88rem;
  color: #9ca3af;
  margin: 0;
}

.auth-alert {
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.85rem;
  margin-bottom: 20px;
  text-align: center;
}

.auth-alert.error {
  background: rgba(248, 113, 113, 0.12);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.25);
}

.auth-alert.warning {
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.25);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #9ca3af;
}

.form-group input {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.25);
}

.btn-auth-submit {
  margin-top: 8px;
  padding: 13px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(99, 102, 241, 0.4);
  transition: all 0.2s;
}

.btn-auth-submit:hover:not(:disabled) {
  background: #4f46e5;
  transform: translateY(-2px);
}

.btn-auth-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 0.88rem;
  color: #9ca3af;
  display: flex;
  justify-content: center;
  gap: 6px;
}

.auth-switch-link {
  color: #818cf8;
  text-decoration: none;
  font-weight: 600;
}

.auth-switch-link:hover {
  text-decoration: underline;
}
</style>
