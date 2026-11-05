const registry = require('../providers/ProviderRegistry');
const {
  CLASSIFICATIONS,
  normalizeProviderName,
  getProviderPolicy,
  isProviderPermittedForRegistration,
  isProviderPermittedForPlayback,
} = require('../config/providerPolicy');

/**
 * GET /api/search
 * Multi-source search with strict provider compliance enforcement
 */
const search = async (req, res, next) => {
  try {
    const { q, providers, provider, limit } = req.query;

    if (!q || !String(q).trim()) {
      return res.status(400).json({
        message: "Search query parameter 'q' is required",
      });
    }

    const providerParam = providers || provider;
    let providerList = null;

    if (providerParam) {
      const requested = String(providerParam)
        .split(',')
        .map((p) => normalizeProviderName(p))
        .filter(Boolean);

      // Filter only providers permitted by authoritative policy
      providerList = requested.filter((p) => isProviderPermittedForRegistration(p));

      // If client only requested rejected/pending providers, return structured empty results immediately
      if (requested.length > 0 && providerList.length === 0) {
        return res.status(200).json({
          query: String(q).trim(),
          results: [],
          providers: {},
          totalResults: 0,
          notice: 'Requested providers are disabled, pending verification, or rejected by compliance policy.',
        });
      }
    }

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
 * Returns health status and policy classification of all active registered music providers
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
 * GET /api/search/providers/health
 * Returns normalized diagnostic telemetry across registered music providers
 */
const getProvidersHealth = async (req, res, next) => {
  try {
    const telemetry = registry.getTelemetry();
    res.status(200).json(telemetry);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/search/resolve
 * Resolves on-demand playback URL with strict provider authorization and license verification
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

    const key = normalizeProviderName(provider);
    const policy = getProviderPolicy(key);

    // Step 1: Reject providers that are rejected by policy
    if (policy.classification === CLASSIFICATIONS.REJECTED) {
      return res.status(403).json({
        message: `Provider '${provider}' is rejected and cannot be used for playback in any environment.`,
        code: 'PROVIDER_REJECTED',
        classification: policy.classification,
      });
    }

    // Step 2: Reject providers that are pending verification
    if (policy.classification === CLASSIFICATIONS.PENDING_VERIFICATION) {
      return res.status(403).json({
        message: `Provider '${provider}' is pending verification and cannot resolve playback.`,
        code: 'PROVIDER_PENDING_VERIFICATION',
        classification: policy.classification,
      });
    }

    // Step 3: Reject providers not permitted for playback
    if (!isProviderPermittedForPlayback(key)) {
      return res.status(403).json({
        message: `Provider '${provider}' is not authorized for playback.`,
        code: 'PROVIDER_UNAUTHORIZED',
        classification: policy.classification,
      });
    }

    const result = await registry.resolveTrack(key, trackId);

    if (result.error || !result.streamUrl) {
      if (result.code === 'PROVIDER_REJECTED' || result.code === 'PROVIDER_PENDING_VERIFICATION' || result.code === 'PROVIDER_UNAUTHORIZED') {
        return res.status(403).json({
          message: result.error,
          code: result.code,
        });
      }
      if (result.code === 'LICENSE_UNVERIFIED' || result.code === 'LICENSE_RESTRICTED') {
        return res.status(403).json({
          message: result.error || 'Track license does not authorize playback',
          code: result.code,
          metadata: result.metadata || null,
        });
      }
      if (result.code === 'PROVIDER_UNCONFIGURED') {
        return res.status(403).json({
          message: result.error || 'Provider is unconfigured or disabled in this environment',
          code: 'PROVIDER_UNCONFIGURED',
        });
      }
      if (result.code === 'INVALID_PARAMETERS' || result.code === 'INVALID_STREAM_URL' || result.code === 'UNAUTHORIZED_STREAM_DOMAIN') {
        return res.status(400).json({
          message: result.error || 'Invalid resolution request',
          code: result.code,
        });
      }
      return res.status(404).json({
        message: result.error || 'Track could not be resolved from remote provider',
        code: result.code || 'RESOLUTION_FAILED',
        metadata: result.metadata || null,
      });
    }

    res.status(200).json({
      trackId: `${key}:${trackId}`,
      provider: key,
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
  getProvidersHealth,
  resolve,
};
