/**
 * SOUNDWAVE Playback Diagnostics Utility
 * 
 * Provides structured, contextual, traceable diagnostics across the playback pipeline.
 * Consistent prefix: [SOUNDWAVE:PLAYBACK]
 * Standard fields: timestamp, attemptId, stage, event, trackId, provider, details.
 * Redacts any sensitive tokens/credentials.
 */

let attemptCounter = 0;

/**
 * Generate a unique playback attempt ID for tracing a single click/action across pipeline stages
 */
export const createPlaybackAttemptId = () => {
  attemptCounter += 1;
  const ts = Date.now().toString(36);
  return `play-${ts}-${attemptCounter}`;
};

/**
 * Redact sensitive query parameters or secrets from strings and URLs
 */
export const sanitizeForLogging = (input) => {
  if (!input) return input;
  if (typeof input === 'string') {
    return input
      .replace(/(client_id|token|secret|key|authorization)=([^&]+)/gi, '$1=REDACTED')
      .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1REDACTED');
  }
  if (typeof input === 'object') {
    try {
      const copy = Array.isArray(input) ? [...input] : { ...input };
      for (const k in copy) {
        if (/secret|token|key|password|authorization/i.test(k)) {
          copy[k] = 'REDACTED';
        } else if (typeof copy[k] === 'object' && copy[k] !== null) {
          copy[k] = sanitizeForLogging(copy[k]);
        }
      }
      return copy;
    } catch {
      return '[Object]';
    }
  }
  return input;
};

const formatMessage = (level, stage, attemptId, event, data) => {
  const ts = new Date().toISOString();
  const aid = attemptId ? `[#${attemptId}]` : '[-]';
  const stg = stage ? `[${stage}]` : '';
  const evt = event ? ` (${event})` : '';
  return `[SOUNDWAVE:PLAYBACK] ${ts} ${level} ${aid} ${stg}${evt}`;
};

export const debugPlayback = (stage, attemptId, event, data = null) => {
  if (process.env.NODE_ENV === 'test' || window.__SOUNDWAVE_DEBUG_PLAYBACK === true || localStorage.getItem('soundwave_debug') === 'true') {
    const msg = formatMessage('DEBUG', stage, attemptId, event);
    if (data !== null) console.debug(msg, sanitizeForLogging(data));
    else console.debug(msg);
  }
};

export const infoPlayback = (stage, attemptId, event, data = null) => {
  const msg = formatMessage('INFO', stage, attemptId, event);
  if (data !== null) console.info(msg, sanitizeForLogging(data));
  else console.info(msg);
};

export const warnPlayback = (stage, attemptId, event, data = null) => {
  const msg = formatMessage('WARN', stage, attemptId, event);
  if (data !== null) console.warn(msg, sanitizeForLogging(data));
  else console.warn(msg);
};

export const errorPlayback = (stage, attemptId, event, error = null, data = null) => {
  const msg = formatMessage('ERROR', stage, attemptId, event);
  const errDetails = error ? {
    name: error.name || 'Error',
    message: error.message || String(error),
    code: error.code,
    stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : undefined,
  } : null;
  
  console.error(msg, { error: errDetails, context: sanitizeForLogging(data) });
};
