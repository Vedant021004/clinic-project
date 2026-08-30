import express from 'express';
import { adminAuth, createAdminSession, revokeAdminSession, validateAdminSession } from '../middleware/adminAuth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  getDashboardMetrics,
  getAppointmentsList,
  getAppointmentDetails,
  updateAppointmentStatusByAdmin,
  getLocationAnalytics,
  getServiceAnalytics,
  getRecentActivity
} from '../services/adminService.js';
import { retrySalesforceSync } from '../services/appointmentService.js';

const router = express.Router();

/**
 * POST /api/admin/login
 * Authenticates admin staff with key/password and issues a timed session token
 */
router.post('/login', authLimiter, (req, res) => {
  const { key, password } = req.body || {};
  const expectedKey = process.env.ADMIN_API_KEY || 'carebridge_admin_secret_key_2026';
  const provided = key || password;

  if (!provided || provided !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid administrative key or password.'
      }
    });
  }

  const session = createAdminSession();
  return res.json({
    success: true,
    data: {
      message: 'Admin authentication successful.',
      token: session.token,
      expiresIn: session.expiresIn,
      expiresAt: session.expiresAt
    }
  });
});

/**
 * POST /api/admin/logout
 * Revokes active session token
 */
router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (token) {
    revokeAdminSession(token);
  }
  return res.json({
    success: true,
    data: { message: 'Logged out successfully.' }
  });
});

// Protect all subsequent admin routes
router.use(adminAuth);

/**
 * GET /api/admin/verify
 * Checks if current session is active and valid
 */
router.get('/verify', (req, res) => {
  return res.json({
    success: true,
    data: { authenticated: true, message: 'Admin session is active.' }
  });
});

/**
 * GET /api/admin/dashboard
 * Aggregated KPI metrics for CareBridge Operations
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const metrics = await getDashboardMetrics();
    return res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/appointments
 * Paginated, searchable, filterable appointment list
 */
router.get('/appointments', async (req, res, next) => {
  try {
    const result = await getAppointmentsList(req.query);
    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/appointments/:requestId
 * Full appointment details with patient, clinic, service, Salesforce CRM sync, and conversation context
 */
router.get('/appointments/:requestId', async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const details = await getAppointmentDetails(requestId);
    return res.json({
      success: true,
      data: details
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/appointments/:requestId
 * Update appointment status by authorized clinic staff
 */
router.patch('/appointments/:requestId', async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const result = await updateAppointmentStatusByAdmin(requestId, req.body);
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/appointments/:requestId/salesforce-retry
 * Retry Salesforce synchronization
 */
router.post('/appointments/:requestId/salesforce-retry', async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const result = await retrySalesforceSync(requestId);
    return res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics/locations
 * Location performance and appointment breakdown
 */
router.get('/analytics/locations', async (req, res, next) => {
  try {
    const analytics = await getLocationAnalytics();
    return res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics/services
 * Service request volume breakdown
 */
router.get('/analytics/services', async (req, res, next) => {
  try {
    const analytics = await getServiceAnalytics();
    return res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/analytics/rag
 * RAG evaluation benchmarks and model comparison
 */
router.get('/analytics/rag', async (req, res, next) => {
  try {
    const { getRagBenchmarkMetrics } = await import('../services/adminService.js');
    const metrics = await getRagBenchmarkMetrics();
    return res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/activity
 * Recent activity feed
 */
router.get('/activity', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const activity = await getRecentActivity(limit);
    return res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    next(error);
  }
});

export default router;

