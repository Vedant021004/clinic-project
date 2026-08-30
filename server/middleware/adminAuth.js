import crypto from 'crypto';

// In-memory session store for authenticated admin tokens
const activeSessions = new Map(); // token -> { createdAt, expiresAt }
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Creates a timed, cryptographically random admin session token
 */
export function createAdminSession() {
  const token = `cb_adm_${crypto.randomBytes(24).toString('hex')}`;
  const now = Date.now();
  activeSessions.set(token, {
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  });
  return { token, expiresIn: '2h', expiresAt: now + SESSION_TTL_MS };
}

/**
 * Validates a session token
 */
export function validateAdminSession(token) {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

/**
 * Revokes an admin session token on logout
 */
export function revokeAdminSession(token) {
  if (!token) return false;
  return activeSessions.delete(token);
}

/**
 * Middleware protecting admin routes
 */
export function adminAuth(req, res, next) {
  const adminKey = process.env.ADMIN_API_KEY || 'carebridge_admin_secret_key_2026';

  // Check header 'x-admin-key', Authorization Bearer header, or query param 'key'
  const headerKey = req.headers['x-admin-key'];
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const queryKey = req.query.key || req.query.admin_key;

  // 1. Check if Bearer token is a valid session token
  if (bearerToken && validateAdminSession(bearerToken)) {
    return next();
  }

  // 2. Check if valid admin API key provided
  const providedKey = headerKey || bearerToken || queryKey;
  if (providedKey && providedKey === adminKey) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Admin authorization required. Provide valid x-admin-key header or Bearer session token.'
    }
  });
}
