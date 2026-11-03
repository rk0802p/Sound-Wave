<template>
  <div class="auth-split-wrapper">
    <!-- Left Visual Artwork Panel (Desktop) -->
    <div class="auth-visual-panel">
      <div class="visual-overlay"></div>
      <div class="visual-content">
        <div class="visual-brand">
          <div class="brand-bars">
            <span></span><span></span><span></span><span></span>
          </div>
          <span class="brand-text">SOUNDWAVE</span>
        </div>
        <div class="visual-hero-text">
          <span class="hero-tag">CREATE YOUR SPACE</span>
          <h2>Build a library that sounds like you.</h2>
          <p>Curate tracks, organize soundscapes, and listen without distractions in an immersive audio workstation.</p>
        </div>
        <div class="visual-footer">
          <span>Personal Music Workstation</span>
        </div>
      </div>
    </div>

    <!-- Right Form Panel -->
    <div class="auth-form-panel">
      <div class="form-container">
        <!-- Mobile Brand -->
        <div class="mobile-brand">
          <div class="brand-bars">
            <span></span><span></span><span></span><span></span>
          </div>
          <span class="brand-text">SOUNDWAVE</span>
        </div>

        <div class="form-header">
          <h1>Create your space.</h1>
          <p>Sign up to start organizing your playlists.</p>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="auth-message error">
          {{ errorMessage }}
        </div>

        <form @submit.prevent="handleSignup" class="auth-form">
          <div class="form-group">
            <label for="signup-username">Username</label>
            <input
              id="signup-username"
              v-model="username"
              type="text"
              required
              minlength="2"
              placeholder="e.g. Audiophile"
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label for="signup-email">Email address</label>
            <input
              id="signup-email"
              v-model="email"
              type="email"
              required
              placeholder="you@example.com"
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <div class="label-row">
              <label for="signup-password">Password</label>
              <button
                type="button"
                class="pw-toggle-btn"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
            <div class="pw-input-wrapper">
              <input
                id="signup-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                minlength="6"
                placeholder="At least 6 characters"
                autocomplete="new-password"
              />
            </div>
          </div>

          <button type="submit" class="btn-primary" :disabled="loading">
            <span v-if="loading">Creating account...</span>
            <span v-else>Create Account</span>
          </button>
        </form>

        <div class="form-footer">
          <span>Already have an account?</span>
          <router-link to="/login" class="switch-link">Sign In</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMessage = ref('');
const loading = ref(false);

const handleSignup = async () => {
  if (password.value.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters.';
    return;
  }

  errorMessage.value = '';
  loading.value = true;

  try {
    await authStore.signup(username.value, email.value, password.value);
    router.push('/');
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || err.message || 'Signup failed. Please try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth-split-wrapper {
  display: flex;
  min-height: 100vh;
  width: 100vw;
  background-color: var(--bg-app);
}

/* Left Visual Panel */
.auth-visual-panel {
  flex: 1.1;
  position: relative;
  background-image: url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  display: flex;
  flex-direction: column;
  padding: 48px;
}

.visual-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(9, 9, 12, 0.75) 0%, rgba(9, 9, 12, 0.92) 100%);
  backdrop-filter: blur(2px);
}

.visual-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

.visual-brand,
.mobile-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-bars {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 20px;
}

.brand-bars span {
  width: 3px;
  background: var(--accent-primary);
  border-radius: 2px;
}

.brand-bars span:nth-child(1) { height: 10px; }
.brand-bars span:nth-child(2) { height: 20px; }
.brand-bars span:nth-child(3) { height: 14px; }
.brand-bars span:nth-child(4) { height: 8px; }

.brand-text {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: var(--text-primary);
}

.visual-hero-text {
  max-width: 480px;
}

.hero-tag {
  display: inline-block;
  font-size: 0.75rem;
  letter-spacing: 2px;
  color: var(--accent-primary);
  font-weight: 700;
  margin-bottom: 12px;
}

.visual-hero-text h2 {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.15;
  margin-bottom: 16px;
  letter-spacing: -0.5px;
}

.visual-hero-text p {
  font-size: 1.05rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.visual-footer {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Right Form Panel */
.auth-form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background-color: var(--bg-app);
}

.form-container {
  width: 100%;
  max-width: 420px;
}

.mobile-brand {
  display: none;
  margin-bottom: 28px;
}

.form-header {
  margin-bottom: 28px;
}

.form-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-header p {
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.auth-message {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  margin-bottom: 20px;
}

.auth-message.error {
  background: rgba(240, 113, 120, 0.12);
  color: var(--danger);
  border: 1px solid rgba(240, 113, 120, 0.25);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.pw-toggle-btn {
  background: transparent;
  border: none;
  color: var(--accent-primary);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
}

.form-group input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--border-focus);
  background: var(--bg-elevated);
}

.btn-primary {
  height: 46px;
  margin-top: 8px;
  background: var(--accent-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-footer {
  margin-top: 28px;
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
  display: flex;
  justify-content: center;
  gap: 6px;
}

.switch-link {
  color: var(--accent-primary);
  font-weight: 600;
}

.switch-link:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .auth-visual-panel {
    display: none;
  }
  .mobile-brand {
    display: flex;
  }
  .auth-form-panel {
    padding: 32px 20px;
  }
}
</style>
