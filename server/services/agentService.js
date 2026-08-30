import { checkSafety } from './safetyService.js';
import { getSession, addMessage, updateAppointmentState, resetAppointmentState } from './sessionStore.js';
import { extractEntities, isConfirmation, isRejection } from './appointmentExtractor.js';
import { validateClinicAndService, executeCreateAppointment } from './appointmentTool.js';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

const BOOKING_INTENT_REGEX = /\b(?:i\s+(?:want|need|would\s+like)\s+to\s+(?:book|schedule|visit|see)|book\s+(?:an\s+)?appointment|book\s+(?:a\s+)?consultation|schedule\s+(?:an?\s+)?(?:appointment|visit)|reserve\s+(?:a\s+)?slot|take\s+appointment|i\s+want\s+[a-z\s]+(?:next|tomorrow|morning|evening|afternoon|monday|friday))\b/i;

const RESCHEDULE_CANCEL_REGEX = /\b(?:reschedule|cancel\s+appointment|change\s+appointment\s+date)\b/i;

/**
 * CareBridge Agent Orchestrator:
 * Integrates Chat UI, Safety Guardrails, Session State, Advanced RAG, and Appointment Execution.
 */
export async function processAgentMessage({ sessionId, message, mode = 'advanced' }) {
  const cleanMessage = message.trim();
  const session = getSession(sessionId);

  // Record user message in persistent conversation history
  addMessage(sessionId, 'user', cleanMessage);

  // 1. SAFETY FIRST
  const safety = checkSafety(cleanMessage);
  if (safety.isTriggered) {
    addMessage(sessionId, 'assistant', safety.message);
    return {
      message: safety.message,
      intent: safety.intent,
      conversation_id: sessionId,
      appointment_state: session.appointmentState,
      appointment: null,
      sources: safety.sources || [],
      confidence: "HIGH"
    };
  }

  let state = session.appointmentState;

  // 2. Existing Patient Rescheduling / Cancellation Support
  if (!state.active && RESCHEDULE_CANCEL_REGEX.test(cleanMessage)) {
    const existingSupportMsg = "Existing patients can track appointment status, submit a rescheduling request, or cancel an appointment using their Phone Number or Request ID (e.g. CB-XXXXXX) in our **Patient Self-Service Tracker** on this page.";
    addMessage(sessionId, 'assistant', existingSupportMsg);
    return {
      message: existingSupportMsg,
      intent: "EXISTING_PATIENT_SUPPORT",
      conversation_id: sessionId,
      appointment_state: state,
      appointment: null,
      sources: [{ document: "appointment_policy.md", section: "Rescheduling & Cancellation", location: "all" }],
      confidence: "HIGH"
    };
  }

  // 3. Check if user is starting or inside the appointment workflow
  const wantsBooking = BOOKING_INTENT_REGEX.test(cleanMessage);
  const isExplicitPatientType = Boolean(cleanMessage.match(/\b(?:new\s+patient|existing\s+patient)\b/i));

  // Extract entities from user message
  const extracted = extractEntities(cleanMessage, state);

  // Determine if booking workflow should be active
  const isBookingFlowActive = state.active || wantsBooking || isExplicitPatientType;

  if (isBookingFlowActive) {
    if (!state.active) {
      state = updateAppointmentState(sessionId, { active: true, step: 'COLLECTING' });
    }
    if (Object.keys(extracted).length > 0) {
      state = updateAppointmentState(sessionId, extracted);
    }
  }

  // 4. Handle Active Appointment Workflow
  if (state.active) {
    // A. Handle Confirmation Step
    if (state.step === 'AWAITING_CONFIRMATION') {
      if (isConfirmation(cleanMessage)) {
        // Execute tool call to create appointment in database
        const result = await executeCreateAppointment(state);
        if (result.success) {
          const successMsg = `Your appointment request has been submitted successfully.\n\n**Request ID: ${result.requestId}**\n\nOur clinic team will contact you to confirm the appointment.`;
          resetAppointmentState(sessionId);
          updateAppointmentState(sessionId, { lastCreatedRequestId: result.requestId });
          addMessage(sessionId, 'assistant', successMsg);

          return {
            message: successMsg,
            intent: "APPOINTMENT_REQUEST",
            conversation_id: sessionId,
            appointment_state: state,
            appointment: {
              requestId: result.requestId,
              status: result.status,
              ...result.appointment
            },
            sources: [],
            confidence: "HIGH"
          };
        } else {
          const failMsg = `I couldn't submit the appointment request right now: ${result.error}. Please let me know if you would like to edit any details or try again.`;
          addMessage(sessionId, 'assistant', failMsg);
          return {
            message: failMsg,
            intent: "APPOINTMENT_REQUEST",
            conversation_id: sessionId,
            appointment_state: state,
            appointment: null,
            sources: [],
            confidence: "HIGH"
          };
        }
      } else if (isRejection(cleanMessage) && Object.keys(extracted).length === 0) {
        state = updateAppointmentState(sessionId, { step: 'COLLECTING' });
        const editPrompt = "No problem. What details would you like to update? (e.g. location, service, date, time, or name)";
        addMessage(sessionId, 'assistant', editPrompt);
        return {
          message: editPrompt,
          intent: "APPOINTMENT_REQUEST",
          conversation_id: sessionId,
          appointment_state: state,
          appointment: null,
          sources: [],
          confidence: "HIGH"
        };
      }
      // If user provided a new entity while in AWAITING_CONFIRMATION, fall through to re-validate
    }

    // B. Validate Clinic and Service pairing
    if (state.location && state.service) {
      const validation = await validateClinicAndService(state.location, state.service);
      if (!validation.valid) {
        const invalidMsg = `${validation.error}\n\nWould you like to select one of the available services, or switch to a different clinic location?`;
        state = updateAppointmentState(sessionId, { service: null }); // Reset invalid service
        addMessage(sessionId, 'assistant', invalidMsg);
        return {
          message: invalidMsg,
          intent: "APPOINTMENT_REQUEST",
          conversation_id: sessionId,
          appointment_state: state,
          appointment: null,
          sources: [],
          confidence: "HIGH"
        };
      }
    }

    // C. Determine next missing field
    const missing = getNextMissingField(state);

    if (missing) {
      state = updateAppointmentState(sessionId, { step: 'COLLECTING' });
      addMessage(sessionId, 'assistant', missing.prompt);
      return {
        message: missing.prompt,
        intent: "APPOINTMENT_REQUEST",
        conversation_id: sessionId,
        appointment_state: state,
        appointment: null,
        sources: [],
        confidence: "HIGH"
      };
    }

    // D. All fields are complete -> Show confirmation summary
    state = updateAppointmentState(sessionId, { step: 'AWAITING_CONFIRMATION' });
    const summaryCard = buildConfirmationSummary(state);
    const confirmPrompt = `${summaryCard}\n\nWould you like me to submit this appointment request?`;
    addMessage(sessionId, 'assistant', confirmPrompt);

    return {
      message: confirmPrompt,
      intent: "APPOINTMENT_REQUEST",
      conversation_id: sessionId,
      appointment_state: state,
      appointment: null,
      sources: [],
      confidence: "HIGH"
    };
  }

  // 5. Default: Information Request via Python Advanced RAG
  try {
    const historyPayload = session.history.slice(-6).map(h => ({
      role: h.role,
      message: h.message
    }));

    const ragRes = await fetch(`${RAG_SERVICE_URL}/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: cleanMessage,
        conversation_history: historyPayload,
        mode
      })
    });

    if (!ragRes.ok) {
      throw new Error(`RAG microservice responded with status ${ragRes.status}`);
    }

    const ragData = await ragRes.json();

    // Preserve any extracted location/service in session state for seamless transition to booking
    if (extracted.location || extracted.service) {
      updateAppointmentState(sessionId, {
        location: extracted.location || state.location,
        service: extracted.service || state.service
      });
    }

    addMessage(sessionId, 'assistant', ragData.answer);

    return {
      message: ragData.answer,
      intent: ragData.intent || "INFORMATION_REQUEST",
      conversation_id: sessionId,
      appointment_state: session.appointmentState,
      appointment: null,
      sources: ragData.sources || [],
      confidence: ragData.confidence || "HIGH",
      retrieved_chunks: ragData.retrieved_chunks || 0,
      timings: ragData.timings || null
    };

  } catch (error) {
    console.error(`[AGENT_ERROR] Failed to query RAG microservice:`, error.message);
    const fallbackMsg = "I'm having trouble retrieving knowledge at this moment. Please try asking again or contact CareBridge support directly.";
    addMessage(sessionId, 'assistant', fallbackMsg);
    return {
      message: fallbackMsg,
      intent: "INFORMATION_REQUEST",
      conversation_id: sessionId,
      appointment_state: session.appointmentState,
      appointment: null,
      sources: [],
      confidence: "LOW"
    };
  }
}

function getNextMissingField(state) {
  if (!state.patientType) {
    return {
      field: 'patientType',
      prompt: "Are you a **New Patient** or an **Existing Patient** with CareBridge Health Network?"
    };
  }
  if (!state.fullName) {
    return {
      field: 'fullName',
      prompt: "Could you please share your **Full Name**?"
    };
  }
  if (!state.location) {
    return {
      field: 'location',
      prompt: "Which CareBridge clinic location would you like to visit? We have care centers in **Palghar Central**, **Boisar**, **Vasai**, and **Nalasopara**."
    };
  }
  if (!state.service) {
    return {
      field: 'service',
      prompt: "What **clinical specialty or service** do you need? (e.g. Cardiology, Pediatrics, Neurology, Women's Health, General Medicine, Preventive Health Checkups)"
    };
  }
  if (!state.preferredDate) {
    return {
      field: 'preferredDate',
      prompt: "What is your **preferred date** for the visit? (e.g., tomorrow, next Friday, or a specific date like September 5)"
    };
  }
  if (!state.preferredTime) {
    return {
      field: 'preferredTime',
      prompt: "What time of day works best for you? (**Morning 9 AM - 12 PM**, **Afternoon 1 PM - 4 PM**, or **Evening 5 PM - 8 PM**)"
    };
  }
  if (!state.phone) {
    return {
      field: 'phone',
      prompt: "Please provide your **10-digit phone number** so our clinic team can reach you."
    };
  }
  if (!state.email) {
    return {
      field: 'email',
      prompt: "Lastly, what is your **email address** to receive the request details?"
    };
  }
  return null;
}

function buildConfirmationSummary(state) {
  return [
    "--------------------------------",
    "📋 **APPOINTMENT REQUEST SUMMARY**",
    "--------------------------------",
    `👤 **Patient Name**: ${state.fullName}`,
    `🏷️ **Patient Type**: ${state.patientType}`,
    `🏥 **Location**: ${state.location}`,
    `🩺 **Service**: ${state.service}`,
    `📅 **Preferred Date**: ${state.preferredDate}`,
    `⏰ **Preferred Time**: ${state.preferredTime}`,
    `📱 **Phone**: ${state.phone}`,
    `✉️ **Email**: ${state.email}`,
    "--------------------------------"
  ].join("\n");
}
