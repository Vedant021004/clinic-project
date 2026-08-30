/**
 * In-Memory Sliding Window Rate Limiter Middleware.
 * Provides fine-grained request throttling across public, AI, and authentication endpoints.
 */

export function createRateLimiter({
  windowMs = 60 * 1000,
  max = 60,
  message = 'Too many requests from this IP, please try again later.'
} = {}) {
  const hits = new Map(); // IP -> Array of timestamps

  // Cleanup expired timestamps periodically (every 5 minutes)
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of hits.entries()) {
      const valid = timestamps.filter(t => now - t < windowMs);
      if (valid.length === 0) {
        hits.delete(ip);
      } else {
        hits.set(ip, valid);
      }
    }
  }, 5 * 60 * 1000).unref();

  return function rateLimiter(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    const clientHits = hits.get(ip) || [];
    const recentHits = clientHits.filter(timestamp => now - timestamp < windowMs);

    const remaining = Math.max(0, max - recentHits.length);
    const resetTime = Math.ceil((recentHits[0] ? recentHits[0] + windowMs - now : windowMs) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (recentHits.length >= max) {
      res.setHeader('Retry-After', resetTime);
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfterSeconds: resetTime
        }
      });
    }

    recentHits.push(now);
    hits.set(ip, recentHits);
    next();
  };
}

// Pre-configured rate limiters
export const globalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many requests. Please slow down.'
});

export const chatLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many chat requests. Please wait a moment before sending more messages.'
});

export const appointmentLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many appointment requests submitted. Please try again in a minute.'
});

export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Account temporarily throttled. Try again in 60 seconds.'
});
