import crypto from 'crypto';

/**
 * Structured HTTP Request Logger Middleware.
 * Adds unique request ID tracking, computes latency, and logs clean operational metrics.
 */

export function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || `req_${crypto.randomBytes(6).toString('hex')}`;
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = Date.now();

  res.on('finish', () => {
    const latency = Date.now() - start;
    const statusCode = res.statusCode;
    const statusCategory = Math.floor(statusCode / 100);

    // Skip verbose logging for static assets unless error
    if (req.path.startsWith('/css/') || req.path.startsWith('/js/') || req.path.startsWith('/favicon')) {
      return;
    }

    const logEntry = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      latencyMs: latency,
      ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
      timestamp: new Date().toISOString()
    };

    if (statusCategory === 5) {
      console.error(`[HTTP_5XX] ${req.method} ${req.path} -> ${statusCode} (${latency}ms) [${requestId}]`);
    } else if (statusCategory === 4) {
      console.warn(`[HTTP_4XX] ${req.method} ${req.path} -> ${statusCode} (${latency}ms) [${requestId}]`);
    } else {
      console.log(`[HTTP] ${req.method} ${req.path} -> ${statusCode} (${latency}ms) [${requestId}]`);
    }
  });

  next();
}
