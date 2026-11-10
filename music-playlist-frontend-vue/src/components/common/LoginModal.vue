<template>
  <AppModal
    :isOpen="isOpen"
    title="Log In to Soundwave"
    description="You need to be signed in to perform this action."
    width="420px"
    @close="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="login-modal-form font-mono">
      <div v-if="errorMessage" class="auth-error-banner font-mono">
        {{ errorMessage }}
      </div>

      <div class="input-field">
        <label for="modal-email" class="field-label">EMAIL</label>
        <input
          id="modal-email"
          v-model="email"
          type="email"
          placeholder="your@email.com"
          required
          autofocus
          class="sw-text-input font-mono"
        />
      </div>

      <div class="input-field">
        <label for="modal-password" class="field-label">PASSWORD</label>
        <input
          id="modal-password"
          v-model="password"
          type="password"
          placeholder="••••••••"
          required
          class="sw-text-input font-mono"
        />
      </div>

      <div class="login-actions">
        <button
          type="submit"
          class="btn-login-submit font-mono"
          :disabled="loading"
        >
          <span v-if="loading">LOGGING IN...</span>
          <span v-else>LOG IN & CONTINUE</span>
        </button>
      </div>

      <div class="login-footer font-mono">
        <span>No account yet? </span>
        <router-link to="/signup" @click="$emit('close')" class="signup-link">SIGN UP</router-link>
      </div>
    </form>
  </AppModal>
</template>

<script setup>
import { ref } from 'vue';
import AppModal from './AppModal.vue';
import { useAuthStore } from '../../stores/auth';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: true,
  },
  onSuccess: {
    type: Function,
    default: null,
  },
});

const emit = defineEmits(['close', 'login-success']);

const authStore = useAuthStore();
const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');

const handleSubmit = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    await authStore.login(email.value.trim(), password.value);
    emit('login-success');
    if (typeof props.onSuccess === 'function') {
      props.onSuccess();
    }
    emit('close');
  } catch (err) {
    errorMessage.value = authStore.error || err.message || 'Login failed';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-error-banner {
  padding: 10px 14px;
  background-color: #FFE6EE;
  border: 2px solid #FF6B5E;
  box-shadow: 3px 3px 0 #FF6B5E;
  color: #111111;
  font-size: 0.85rem;
  font-weight: 800;
}

.input-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #111111;
}

.sw-text-input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #111111;
  background-color: #FFFFFF;
  color: #111111;
  box-shadow: 3px 3px 0 #111111;
  font-family: var(--font-mono, monospace);
  font-size: 0.9rem;
  font-weight: 600;
  box-sizing: border-box;
  border-radius: 0;
  transition: box-shadow 0.08s ease, background-color 0.08s ease;
}

.sw-text-input:focus {
  outline: none;
  background-color: #FFFDE6;
  box-shadow: 4px 4px 0 #111111;
}

.login-actions {
  margin-top: 8px;
}

.btn-login-submit {
  width: 100%;
  padding: 12px 18px;
  background-color: #FFD84A;
  color: #111111;
  border: 2px solid #111111;
  box-shadow: 4px 4px 0 #111111;
  font-family: var(--font-mono, monospace);
  font-weight: 900;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 0;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
}

.btn-login-submit:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 #111111;
  background-color: #FFE066;
}

.btn-login-submit:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.btn-login-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-footer {
  text-align: center;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 600;
  color: #555555;
  margin-top: 8px;
}

.signup-link {
  color: #111111;
  font-weight: 900;
  text-decoration: underline;
  text-underline-offset: 3px;
  padding: 2px 4px;
}

.signup-link:hover {
  background-color: #FFD84A;
}
</style>
