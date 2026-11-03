const registry = require('../providers/ProviderRegistry');

/**
 * GET /api/search
 * Aggregates multi-source music search with independent provider fault isolation
 */
const search = async (req, res, next) => {
  try {
    const { q, providers, limit } = req.query;

    if (!q || !String(q).trim()) {
      return res.status(400).json({
        message: "Search query parameter 'q' is required",
      });
    }

    const providerList = providers
      ? String(providers).split(',').map((p) => p.trim()).filter(Boolean)
      : null;

    const data = await registry.aggregateSearch(q, {
      providers: providerList,
      limit: parseInt(limit) || 12,
    });

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/search/providers
 * Returns health status and configuration state of all registered music providers
 */
const getProviders = async (req, res, next) => {
  try {
    const list = registry.getAllStatus();
    res.status(200).json({
      providers: list,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/search/resolve
 * Resolves on-demand playback URL from original remote provider
 */
const resolve = async (req, res, next) => {
  try {
    const { provider, trackId } = req.query;

    if (!provider || !trackId) {
      return res.status(400).json({
        message: "Parameters 'provider' and 'trackId' are required",
      });
    }

    const result = await registry.resolveTrack(provider, trackId);

    if (result.error || !result.streamUrl) {
      return res.status(404).json({
        message: result.error || 'Track could not be resolved from remote provider',
      });
    }

    res.status(200).json({
      provider,
      trackId,
      streamUrl: result.streamUrl,
      metadata: result.metadata,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  search,
  getProviders,
  resolve,
};
