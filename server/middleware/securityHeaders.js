/**
 * Production Security Headers Middleware
 * Configures CSP, HSTS, Frame protection, Referrer Policy, and MIME type sniffing protection.
 */

export function securityHeaders(req, res, next) {
  // 1. Content Security Policy
  // Allows self-hosted assets, Google Fonts, and inline styles for UI
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https: http://localhost:5000 http://localhost:8000; " +
    "frame-ancestors 'self'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );

  // 2. Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 3. Prevent Clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // 4. Cross-site Scripting Filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 5. Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 6. Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // 7. Strict-Transport-Security in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  next();
}
