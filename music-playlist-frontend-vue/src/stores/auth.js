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
    async login(payloadOrEmail, maybePassword) {
      const email = typeof payloadOrEmail === 'object' && payloadOrEmail !== null ? payloadOrEmail.email : payloadOrEmail;
      const password = typeof payloadOrEmail === 'object' && payloadOrEmail !== null ? payloadOrEmail.password : maybePassword;
      this.isLoading = true;
      this.error = null;
      try {
        const data = await authApi.login({ email, password });
        this.setSession(data.token, data.user);
        return data;
      } catch (err) {
        const msg = err.response?.data?.message || (err.code === 'ERR_NETWORK' ? 'Unable to reach SOUNDWAVE server. Please check your connection.' : err.message) || 'Login failed';
        this.error = msg;
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async signup(payloadOrUsername, maybeEmail, maybePassword) {
      let username, email, password;
      if (typeof payloadOrUsername === 'object' && payloadOrUsername !== null) {
        username = payloadOrUsername.username;
        email = payloadOrUsername.email;
        password = payloadOrUsername.password;
      } else {
        username = payloadOrUsername;
        email = maybeEmail;
        password = maybePassword;
      }
      this.isLoading = true;
      this.error = null;
      try {
        const data = await authApi.signup({ username, email, password });
        this.setSession(data.token, data.user);
        return data;
      } catch (err) {
        const msg = err.response?.data?.message || (err.code === 'ERR_NETWORK' ? 'Unable to reach SOUNDWAVE server. Please check your connection.' : err.message) || 'Signup failed';
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
