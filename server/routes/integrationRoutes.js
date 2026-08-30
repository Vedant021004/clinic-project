import express from 'express';
import { getSalesforceSyncStatus, retrySalesforceSync } from '../services/appointmentService.js';

const router = express.Router();

/**
 * GET /api/integrations/salesforce/status/:requestId
 * Check Salesforce CRM synchronization status for an appointment
 */
router.get('/salesforce/status/:requestId', async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const status = await getSalesforceSyncStatus(requestId);
    return res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/integrations/salesforce/retry/:requestId
 * Retry Salesforce CRM synchronization with idempotency checks
 */
router.post('/salesforce/retry/:requestId', async (req, res, next) => {
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

export default router;
