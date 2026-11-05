/**
 * SOUNDWAVE Authoritative Provider Policy
 * * Strict compliance and authorization rules for all music providers.
 * SOUNDWAVE is a personal portfolio project demonstrating full-stack engineering
 * and strictly non-commercial music discovery/playback.
 * * Policy rules:
 * - Jamendo: CONDITIONAL_APPROVAL (only verified CC licenses with compliant attribution)
 * - Audius: PENDING_VERIFICATION (disabled pending rights verification)
 * - Archive: PENDING_VERIFICATION (disabled pending collection provenance verification)
 * - Saavn: REJECTED (prohibited in all environments; reverse-engineered API & decryption)
 * - Spotify: PENDING_VERIFICATION (playback disabled pending written confirmation)
 * - YouTube: REJECTED_FOR_DIRECT_AUDIO (audio extraction prohibited)
 * - DirectAudio: REJECTED (arbitrary URL streaming prohibited; verified provider CDN only)
 * - Unknown: UNKNOWN (fails closed)
 */

const CLASSIFICATIONS = Object.freeze({
  APPROVED: 'APPROVED',
  CONDITIONAL_APPROVAL: 'CONDITIONAL_APPROVAL',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  REJECTED: 'REJECTED',
  REJECTED_FOR_DIRECT_AUDIO: 'REJECTED_FOR_DIRECT_AUDIO',
  UNKNOWN: 'UNKNOWN',
});

const providerPolicy = Object.freeze({
  jamendo: Object.freeze({
    classification: CLASSIFICATIONS.CONDITIONAL_APPROVAL,
    displayName: 'Jamendo Music',
    canRegister: true,
    canSearch: true,
    canResolvePlayback: true,
    requiresLicenseVerification: true,
    supportedLicensePrefixes: ['CC0', 'CC BY', 'CC BY-SA', 'CC BY-NC', 'CC BY-NC-SA', 'CC BY-ND', 'CC BY-NC-ND'],
    allowedStreamDomains: ['jamendo.com', '.jamendo.com'],
    termsUrl: 'https://developer.jamendo.com/v3.0/docs',
    notes: 'Free non-commercial streaming permitted for verified Creative Commons tracks with creator and platform attribution.',
  }),
  audius: Object.freeze({
    classification: CLASSIFICATIONS.PENDING_VERIFICATION,
    displayName: 'Audius',
    canRegister: false,
    canSearch: false,
    canResolvePlayback: false,
    notes: 'Public read-only API exists, but per-track creator terms and non-commercial portfolio rights require written verification before activation.',
  }),
  archive: Object.freeze({
    classification: CLASSIFICATIONS.PENDING_VERIFICATION,
    displayName: 'Internet Archive',
    canRegister: false,
    canSearch: false,
    canResolvePlayback: false,
    notes: 'Public domain and open collections exist, but upload provenance and institutional terms require verification before playback activation.',
  }),
  saavn: Object.freeze({
    classification: CLASSIFICATIONS.REJECTED,
    displayName: 'JioSaavn',
    canRegister: false,
    canSearch: false,
    canResolvePlayback: false,
    notes: 'Commercial catalog, unofficial reverse-engineered endpoints, and media URL decryption. Strictly prohibited in all environments (development, test, and production).',
  }),
  spotify: Object.freeze({
    classification: CLASSIFICATIONS.PENDING_VERIFICATION,
    displayName: 'Spotify',
    canRegister: false,
    canSearch: false,
    canResolvePlayback: false,
    notes: 'OAuth profile linking and metadata discovery permitted; full-track streaming and Web Playback SDK playback disabled pending written licensing verification.',
  }),
  youtube: Object.freeze({
    classification: CLASSIFICATIONS.REJECTED_FOR_DIRECT_AUDIO,
    displayName: 'YouTube',
    canRegister: false,
    canSearch: false,
    canResolvePlayback: false,
    notes: 'Direct audio stream extraction, downloading, and scraping are strictly prohibited.',
  }),
  direct: Object.freeze({
    classification: CLASSIFICATIONS.REJECTED,
    displayName: 'Generic Direct Audio',
    canRegister: false,
    canSearch: false,
    canResolvePlayback: false,
    notes: 'Arbitrary external URLs and untrusted audio links prohibited. Playback only authorized via verified provider CDN endpoints.',
  }),
});

/**
 * Normalizes provider name for consistent case-insensitive lookup
 * @param {string} name
 * @returns {string}
 */
function normalizeProviderName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase();
}

/**
 * Retrieves the policy entry for a provider name.
 * Fails closed with UNKNOWN if provider is not defined.
 * @param {string} name
 * @returns {object}
 */
function getProviderPolicy(name) {
  const key = normalizeProviderName(name);
  if (!key || !Object.prototype.hasOwnProperty.call(providerPolicy, key)) {
    return Object.freeze({
      classification: CLASSIFICATIONS.UNKNOWN,
      displayName: name || 'Unknown Provider',
      canRegister: false,
      canSearch: false,
      canResolvePlayback: false,
      notes: 'Unrecognized provider. Fails closed by default.',
    });
  }
  return providerPolicy[key];
}

/**
 * Returns true if provider is permitted to register in ProviderRegistry
 * @param {string} name
 * @returns {boolean}
 */
function isProviderPermittedForRegistration(name) {
  const policy = getProviderPolicy(name);
  return Boolean(
    policy.canRegister &&
    (policy.classification === CLASSIFICATIONS.APPROVED || policy.classification === CLASSIFICATIONS.CONDITIONAL_APPROVAL)
  );
}

/**
 * Returns true if provider is permitted to resolve playback streams
 * @param {string} name
 * @returns {boolean}
 */
function isProviderPermittedForPlayback(name) {
  const policy = getProviderPolicy(name);
  return Boolean(
    policy.canResolvePlayback &&
    (policy.classification === CLASSIFICATIONS.APPROVED || policy.classification === CLASSIFICATIONS.CONDITIONAL_APPROVAL)
  );
}

module.exports = {
  CLASSIFICATIONS,
  providerPolicy,
  normalizeProviderName,
  getProviderPolicy,
  isProviderPermittedForRegistration,
  isProviderPermittedForPlayback,
};
