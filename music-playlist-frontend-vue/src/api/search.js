import api from './index';

export const searchApi = {
  /**
   * Search unified multi-source catalog
   */
  async search(query, options = {}) {
    const params = {
      q: query,
      limit: options.limit || 12,
    };
    if (options.providers && options.providers.length) {
      params.providers = options.providers.join(',');
    }
    const response = await api.get('/api/search', { params });
    return response.data;
  },

  /**
   * Get health status of all registered providers
   */
  async getProviders() {
    const response = await api.get('/api/search/providers');
    return response.data;
  },

  /**
   * Resolve fresh stream URL for an online track
   */
  async resolve(provider, trackId) {
    const response = await api.get('/api/search/resolve', {
      params: { provider, trackId },
    });
    return response.data;
  },
};

export default searchApi;
