import express from 'express';
import { processAgentMessage } from '../services/agentService.js';

const router = express.Router();

/**
 * POST /api/ai/chat
 * Primary entry point for AI patient conversation interfacing with the Agent Orchestrator.
 */
router.post('/chat', async (req, res, next) => {
  try {
    const { session_id, message, mode } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MESSAGE',
          message: 'The message parameter is required and cannot be empty.'
        }
      });
    }

    const sessionId = session_id || `session_${Date.now()}`;

    const agentResult = await processAgentMessage({
      sessionId,
      message: message.trim(),
      mode: mode || 'advanced'
    });

    return res.json({
      success: true,
      session_id: sessionId,
      conversation_id: sessionId,
      message: agentResult.message,
      answer: agentResult.message, // for backward compatibility
      intent: agentResult.intent,
      confidence: agentResult.confidence,
      appointment_state: agentResult.appointment_state,
      appointment: agentResult.appointment,
      sources: agentResult.sources || [],
      retrieved_chunks: agentResult.retrieved_chunks || 0,
      timings: agentResult.timings || null
    });

  } catch (error) {
    next(error);
  }
});

export default router;
