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
    const provider = req.query.provider;
    const trackId = req.query.trackId || req.query.id;

    if (!provider || !trackId) {
      return res.status(400).json({
        message: "Parameters 'provider' and 'trackId' are required",
      });
    }

    const result = await registry.resolveTrack(provider, trackId);

    if (result.error || !result.streamUrl) {
      if (result.code === 'PROVIDER_UNCONFIGURED') {
        return res.status(403).json({
          message: result.error || 'Provider is unconfigured or disabled in this environment',
          code: 'PROVIDER_UNCONFIGURED',
        });
      }
      if (result.code === 'INVALID_PARAMETERS' || result.code === 'INVALID_STREAM_URL') {
        return res.status(400).json({
          message: result.error || 'Invalid resolution request',
          code: result.code,
        });
      }
      return res.status(404).json({
        message: result.error || 'Track could not be resolved from remote provider',
        code: result.code || 'RESOLUTION_FAILED',
      });
    }

    res.status(200).json({
      trackId: `${provider}:${trackId}`,
      provider,
      providerTrackId: trackId,
      streamUrl: result.streamUrl,
      playback: {
        available: true,
        kind: 'direct',
        url: result.streamUrl,
        mimeType: result.mimeType || 'audio/mpeg',
        expiresAt: result.expiresAt || null,
      },
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
