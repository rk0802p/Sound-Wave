/**
 * In-memory rate limiter for write operations (POST, PUT, DELETE)
 * Zero external dependencies, safe for serverless and testing.
 * Automatically bypassed when NODE_ENV === "test".
 */
const writeRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute
  const maxRequests = options.maxRequests || 120; // 120 writes / min
  const bypassInTest = options.bypassInTest !== undefined ? options.bypassInTest : true;
  const requestCounts = new Map();

  return (req, res, next) => {
    if (process.env.NODE_ENV === "test" && bypassInTest) {
      return next();
    }

    const key = (req.user && req.user.id) || req.ip || "unknown";
    const now = Date.now();
    let record = requestCounts.get(key);

    if (!record || now - record.startTime > windowMs) {
      record = { startTime: now, count: 1 };
      requestCounts.set(key, record);
    } else {
      record.count += 1;
    }

    if (record.count > maxRequests) {
      return res.status(429).json({
        message: "Too many write requests. Please try again later.",
        code: "LIMIT_REACHED",
      });
    }

    // Clean up expired entries periodically
    if (requestCounts.size > 10000) {
      for (const [k, v] of requestCounts.entries()) {
        if (now - v.startTime > windowMs) {
          requestCounts.delete(k);
        }
      }
    }

    next();
  };
};

module.exports = writeRateLimiter;
