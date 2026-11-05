/**
 * SOUNDWAVE Structured Backend Logger & Redaction Engine
 * Generates standardized JSON logs with request correlation, duration,
 * and comprehensive redaction of credentials, tokens, and secrets.
 */

const crypto = require('crypto');

const SENSITIVE_KEY_REGEX = /password|token|secret|authorization|cookie|bearer|credential|client_secret|jwt|mongo_uri|apikey|api_key/i;
const JWT_REGEX = /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g;
const BEARER_REGEX = /Bearer\s+[a-zA-Z0-9_\-\.]+/gi;
const MONGO_URI_CRED_REGEX = /(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/gi;

/**
 * Deeply clone and redact sensitive keys and values from objects, arrays, and strings
 */
function redact(val, depth = 0) {
  if (depth > 6) return '[MAX_DEPTH]';
  if (val === null || val === undefined) return val;

  if (typeof val === 'string') {
    return val
      .replace(BEARER_REGEX, 'Bearer [REDACTED]')
      .replace(JWT_REGEX, '[REDACTED_JWT]')
      .replace(MONGO_URI_CRED_REGEX, '$1[REDACTED_USER]:[REDACTED_PASSWORD]@');
  }

  if (Array.isArray(val)) {
    return val.map((item) => redact(item, depth + 1));
  }

  if (typeof val === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(val)) {
      if (SENSITIVE_KEY_REGEX.test(k)) {
        cleaned[k] = '[REDACTED]';
      } else {
        cleaned[k] = redact(v, depth + 1);
      }
    }
    return cleaned;
  }

  return val;
}

// In-memory ring buffer of recent logs for test inspection & diagnostics
const recentLogsBuffer = [];
const MAX_RECENT_LOGS = 100;

function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: typeof message === 'string' ? redact(message) : redact(JSON.stringify(message)),
    ...(meta.requestId ? { requestId: meta.requestId } : {}),
    ...(meta.method ? { method: meta.method } : {}),
    ...(meta.path ? { path: meta.path } : {}),
    ...(meta.status !== undefined ? { status: meta.status } : {}),
    ...(meta.durationMs !== undefined ? { durationMs: meta.durationMs } : {}),
    ...(meta.provider ? { provider: meta.provider } : {}),
    ...(meta.error ? { error: redact(meta.error instanceof Error ? meta.error.message : meta.error) } : {}),
    meta: redact(
      Object.fromEntries(
        Object.entries(meta).filter(
          ([k]) => !['requestId', 'method', 'path', 'status', 'durationMs', 'provider', 'error'].includes(k)
        )
      )
    ),
  };

  recentLogsBuffer.push(entry);
  if (recentLogsBuffer.length > MAX_RECENT_LOGS) {
    recentLogsBuffer.shift();
  }

  // Write JSON to stdout/stderr unless suppressed in unit test runs
  if (process.env.SUPPRESS_LOGS !== 'true' && process.env.NODE_ENV !== 'test') {
    const jsonStr = JSON.stringify(entry);
    if (level === 'error') {
      console.error(jsonStr);
    } else if (level === 'warn') {
      console.warn(jsonStr);
    } else {
      console.log(jsonStr);
    }
  }

  return entry;
}

const logger = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  redact,
  getRecentLogs: (limit = 20) => recentLogsBuffer.slice(-limit),
  clearRecentLogs: () => {
    recentLogsBuffer.length = 0;
  },

  /**
   * Express middleware for request ID correlation & performance tracking
   */
  requestCorrelationMiddleware: (req, res, next) => {
    let reqId = req.headers['x-request-id'];
    // Validate externally provided ID or generate a cryptographically random UUID
    if (!reqId || typeof reqId !== 'string' || !/^[a-zA-Z0-9_\-]{8,64}$/.test(reqId)) {
      reqId = crypto.randomUUID();
    }

    req.id = reqId;
    res.setHeader('x-request-id', reqId);
    req.startTime = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - req.startTime;
      const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      log(logLevel, `${req.method} ${req.originalUrl || req.url} ${res.statusCode}`, {
        requestId: req.id,
        method: req.method,
        path: req.baseUrl + req.path,
        status: res.statusCode,
        durationMs,
      });
    });

    next();
  },
};

module.exports = logger;
