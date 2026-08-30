import express from 'express';
import {
  createAppointmentRequest,
  getAppointmentByRequestId,
  searchAppointments,
  rescheduleAppointment,
  cancelAppointment
} from '../services/appointmentService.js';

const router = express.Router();

/**
 * POST /api/appointments
 * Creates an appointment request with Zod validation
 */
router.post('/', async (req, res, next) => {
  try {
    const result = await createAppointmentRequest(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/appointments/search?phone=... or ?query=...
 * Searches appointment requests
 */
router.get('/search', async (req, res, next) => {
  try {
    const query = (req.query.phone || req.query.query || '').toString();
    const results = await searchAppointments(query);
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/appointments/:requestId
 * Retrieves appointment details by Request ID
 */
router.get('/:requestId', async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const appointment = await getAppointmentByRequestId(requestId);
    res.json({
      success: true,
      data: appointment
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/appointments/:requestId/reschedule
 * Submits a rescheduling request
 */
router.patch('/:requestId/reschedule', async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const result = await rescheduleAppointment(requestId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/appointments/:requestId/cancel
 * Submits a cancellation request
 */
router.patch('/:requestId/cancel', async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const result = await cancelAppointment(requestId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
