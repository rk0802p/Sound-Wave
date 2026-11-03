import { defineStore } from 'pinia';
import { authApi } from '../api/auth';
import { jwtDecode } from 'jwt-decode';

export const useAuthStore = defineStore('auth', {
  state: () => {
    const token = localStorage.getItem('token') || '';
    let user = null;
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        user = JSON.parse(storedUser);
      } else if (token) {
        const decoded = jwtDecode(token);
        user = {
          id: decoded.id,
          username: decoded.username || 'Music Lover',
          email: decoded.email || '',
        };
      }
    } catch {
      user = null;
    }

    return {
      token,
      user,
      isLoading: false,
      error: null,
    };
  },

  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.user),
    username: (state) => state.user?.username || 'User',
    userEmail: (state) => state.user?.email || '',
  },

  actions: {
    async login(email, password) {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await authApi.login({ email, password });
        this.setSession(data.token, data.user);
        return data;
      } catch (err) {
        // If backend server is unreachable (offline / standalone demo mode)
        if (!err.response || err.code === 'ERR_NETWORK') {
          const demoUser = {
            id: 'demo-user-67c000000000000000000001',
            username: (email && email.split('@')[0]) || 'Acoustic Curator',
            email: email || 'curator@soundwave.internal',
          };
          const demoToken = 'demo-token-soundwave-atelier';
          this.setSession(demoToken, demoUser);
          return { token: demoToken, user: demoUser };
        }
        const msg = err.response?.data?.message || err.message || 'Login failed';
        this.error = msg;
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async signup(username, email, password) {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await authApi.signup({ username, email, password });
        this.setSession(data.token, data.user);
        return data;
      } catch (err) {
        // If backend server is unreachable (offline / standalone demo mode)
        if (!err.response || err.code === 'ERR_NETWORK') {
          const demoUser = {
            id: 'demo-user-67c000000000000000000001',
            username: username || 'Acoustic Curator',
            email: email || 'curator@soundwave.internal',
          };
          const demoToken = 'demo-token-soundwave-atelier';
          this.setSession(demoToken, demoUser);
          return { token: demoToken, user: demoUser };
        }
        const msg = err.response?.data?.message || err.message || 'Signup failed';
        this.error = msg;
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    setSession(token, user) {
      this.token = token;
      this.user = user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },

    async checkAuth() {
      if (!this.token) return false;
      try {
        const data = await authApi.getMe();
        if (data.user) {
          this.user = data.user;
          localStorage.setItem('user', JSON.stringify(data.user));
          return true;
        }
      } catch {
        this.logout();
        return false;
      }
    },

    logout() {
      this.token = '';
      this.user = null;
      this.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});
