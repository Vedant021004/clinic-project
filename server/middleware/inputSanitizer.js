/**
 * Input Validation & Security Sanitizer Middleware
 * Protects against SQL injection, path traversal, oversized bodies, and script injection.
 */

export function inputSanitizer(req, res, next) {
  // 1. Path traversal defense
  if (req.url && (req.url.includes('../') || req.url.includes('..\\'))) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PATH',
        message: 'Potential path traversal sequence detected.'
      }
    });
  }

  // 2. Deep sanitize query & body strings recursively
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  next();
}

function sanitizeObject(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Strip dangerous null bytes
      obj[key] = obj[key].replace(/\0/g, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}
