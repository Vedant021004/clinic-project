import { z } from 'zod';
import prisma from '../config/db.js';
import { syncAppointmentToSalesforce } from './salesforceService.js';
import { calculateLeadTemperature } from './leadTemperatureService.js';

// Zod Validation Schema for creating an appointment
export const createAppointmentSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().min(7, "Phone number must be at least 7 digits"),
  email: z.string().email("Invalid email address"),
  patientType: z.enum(["New Patient", "Existing Patient", "NEW", "EXISTING"]).default("New Patient"),
  location: z.string().min(1, "Location is required"),
  service: z.string().min(1, "Service is required"),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  preferredTime: z.string().min(1, "Preferred time slot is required"),
  notes: z.string().optional().default(""),
  source: z.enum(["TARS_AI_AGENT", "WEBSITE", "AI_ASSISTANT"]).optional().default("WEBSITE"),
  leadTemperature: z.enum(["HOT", "WARM", "COLD"]).optional().default("WARM")
});

export const rescheduleSchema = z.object({
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  preferredTime: z.string().min(1, "Preferred time slot is required")
});

export const cancelSchema = z.object({
  reason: z.string().optional().default("Patient requested cancellation")
});

/**
 * Generate a collision-free CB-XXXXXX Request ID
 */
export async function generateUniqueRequestId() {
  for (let i = 0; i < 10; i++) {
    const randomSixDigit = Math.floor(100000 + Math.random() * 900000);
    const candidateId = `CB-${randomSixDigit}`;
    const exists = await prisma.appointmentRequest.findUnique({
      where: { requestId: candidateId }
    });
    if (!exists) {
      return candidateId;
    }
  }
  // Fallback with timestamp suffix
  return `CB-${Date.now().toString().slice(-6)}`;
}

/**
 * Normalizes patient type to enum
 */
function normalizePatientType(type) {
  if (!type) return "NEW";
  const upper = type.toString().toUpperCase();
  if (upper.includes("EXIST")) return "EXISTING";
  return "NEW";
}

/**
 * Creates a validated appointment request and synchronizes with Salesforce CRM
 */
export async function createAppointmentRequest(data) {
  const validated = createAppointmentSchema.parse(data);

  // 1. Resolve Clinic by name or slug or id
  const clinic = await prisma.clinic.findFirst({
    where: {
      OR: [
        { name: { equals: validated.location } },
        { slug: { equals: validated.location.toLowerCase().replace(/\s+/g, '-') } },
        { id: { equals: validated.location } }
      ]
    },
    include: {
      services: {
        include: { service: true }
      }
    }
  });

  if (!clinic) {
    const error = new Error(`Clinic location '${validated.location}' not found. Please select Palghar Central, Boisar Care Center, Vasai Care Center, or Nalasopara Care Center.`);
    error.statusCode = 400;
    error.code = 'INVALID_CLINIC';
    throw error;
  }

  // 2. Resolve Service by name or slug
  const service = await prisma.service.findFirst({
    where: {
      OR: [
        { name: { equals: validated.service } },
        { slug: { equals: validated.service.toLowerCase().replace(/\s+/g, '-') } },
        { id: { equals: validated.service } }
      ]
    }
  });

  if (!service) {
    const error = new Error(`Service '${validated.service}' not found.`);
    error.statusCode = 400;
    error.code = 'INVALID_SERVICE';
    throw error;
  }

  // 3. Verify service is offered at this clinic
  const isOffered = clinic.services.some(cs => cs.serviceId === service.id);
  if (!isOffered) {
    const available = clinic.services.map(cs => cs.service.name).join(', ');
    const error = new Error(`The requested service '${service.name}' is not available at ${clinic.name}. Available services at ${clinic.name}: ${available}`);
    error.statusCode = 400;
    error.code = 'SERVICE_NOT_AVAILABLE_AT_CLINIC';
    throw error;
  }

  // 4. Find or Create Patient
  const cleanPhone = validated.phone.trim();
  const cleanEmail = validated.email.trim().toLowerCase();
  const normalizedType = normalizePatientType(validated.patientType);

  let patient = await prisma.patient.findFirst({
    where: {
      OR: [
        { phone: cleanPhone },
        { email: cleanEmail }
      ]
    }
  });

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        fullName: validated.fullName.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        patientType: normalizedType
      }
    });
  } else {
    patient = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        fullName: validated.fullName.trim(),
        patientType: normalizedType
      }
    });
  }

  // 5. Calculate lead temperature
  const leadTemperature = calculateLeadTemperature({
    ...validated,
    isConfirmed: true
  });

  // 6. Generate Request ID and create appointment request
  const requestId = await generateUniqueRequestId();

  let appointment = await prisma.appointmentRequest.create({
    data: {
      requestId,
      patientId: patient.id,
      clinicId: clinic.id,
      serviceId: service.id,
      preferredDate: validated.preferredDate,
      preferredTime: validated.preferredTime,
      status: "PENDING",
      leadTemperature,
      source: validated.source,
      notes: validated.notes,
      salesforceSyncStatus: "PENDING"
    },
    include: {
      patient: true,
      clinic: true,
      service: true
    }
  });

  // 7. Synchronize with Salesforce CRM
  try {
    const sfResult = await syncAppointmentToSalesforce({
      requestId: appointment.requestId,
      fullName: appointment.patient.fullName,
      phone: appointment.patient.phone,
      email: appointment.patient.email,
      patientType: appointment.patient.patientType === "NEW" ? "New Patient" : "Existing Patient",
      location: appointment.clinic.name,
      service: appointment.service.name,
      preferredDate: appointment.preferredDate,
      preferredTime: appointment.preferredTime,
      leadTemperature: appointment.leadTemperature,
      source: appointment.source,
      notes: appointment.notes
    });

    if (sfResult.success) {
      appointment = await prisma.appointmentRequest.update({
        where: { id: appointment.id },
        data: {
          salesforceSyncStatus: "SYNCED",
          salesforceLeadId: sfResult.salesforceLeadId,
          salesforceTaskId: sfResult.salesforceTaskId,
          salesforceSyncedAt: sfResult.syncedAt
        },
        include: {
          patient: true,
          clinic: true,
          service: true
        }
      });
    } else {
      appointment = await prisma.appointmentRequest.update({
        where: { id: appointment.id },
        data: {
          salesforceSyncStatus: "FAILED",
          salesforceLastError: sfResult.error
        },
        include: {
          patient: true,
          clinic: true,
          service: true
        }
      });
    }
  } catch (syncErr) {
    console.error(`[SALESFORCE] Background sync error for ${appointment.requestId}:`, syncErr.message);
    await prisma.appointmentRequest.update({
      where: { id: appointment.id },
      data: {
        salesforceSyncStatus: "FAILED",
        salesforceLastError: syncErr.message
      }
    });
  }

  return {
    success: true,
    requestId: appointment.requestId,
    status: appointment.status,
    salesforceSyncStatus: appointment.salesforceSyncStatus,
    salesforceLeadId: appointment.salesforceLeadId,
    salesforceTaskId: appointment.salesforceTaskId,
    message: "Your appointment request has been submitted. Our clinic team will contact you to confirm the appointment.",
    appointment: {
      requestId: appointment.requestId,
      fullName: appointment.patient.fullName,
      phone: appointment.patient.phone,
      email: appointment.patient.email,
      patientType: appointment.patient.patientType === "NEW" ? "New Patient" : "Existing Patient",
      location: appointment.clinic.name,
      service: appointment.service.name,
      preferredDate: appointment.preferredDate,
      preferredTime: appointment.preferredTime,
      status: appointment.status,
      leadTemperature: appointment.leadTemperature,
      salesforceSyncStatus: appointment.salesforceSyncStatus,
      salesforceLeadId: appointment.salesforceLeadId,
      salesforceTaskId: appointment.salesforceTaskId,
      createdAt: appointment.createdAt
    }
  };
}

/**
 * Retrieve an appointment by Request ID
 */
export async function getAppointmentByRequestId(requestId) {
  const cleanId = requestId.trim().toUpperCase();
  const appointment = await prisma.appointmentRequest.findUnique({
    where: { requestId: cleanId },
    include: {
      patient: true,
      clinic: true,
      service: true
    }
  });

  if (!appointment) {
    const error = new Error(`Appointment request '${requestId}' not found.`);
    error.statusCode = 404;
    error.code = 'APPOINTMENT_NOT_FOUND';
    throw error;
  }

  return {
    requestId: appointment.requestId,
    fullName: appointment.patient.fullName,
    phone: appointment.patient.phone,
    email: appointment.patient.email,
    patientType: appointment.patient.patientType === "NEW" ? "New Patient" : "Existing Patient",
    location: appointment.clinic.name,
    service: appointment.service.name,
    preferredDate: appointment.preferredDate,
    preferredTime: appointment.preferredTime,
    status: appointment.status,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt
  };
}

/**
 * Search appointments by patient phone or request ID
 */
export async function searchAppointments(query) {
  if (!query || query.trim().length === 0) return [];
  const cleanQuery = query.trim();

  // Search by exact/partial Request ID or by Phone Number or Name
  const results = await prisma.appointmentRequest.findMany({
    where: {
      OR: [
        { requestId: { contains: cleanQuery } },
        { patient: { phone: { contains: cleanQuery } } },
        { patient: { fullName: { contains: cleanQuery } } }
      ]
    },
    include: {
      patient: true,
      clinic: true,
      service: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return results.map(app => ({
    requestId: app.requestId,
    fullName: app.patient.fullName,
    phone: app.patient.phone,
    email: app.patient.email,
    patientType: app.patient.patientType === "NEW" ? "New Patient" : "Existing Patient",
    location: app.clinic.name,
    service: app.service.name,
    preferredDate: app.preferredDate,
    preferredTime: app.preferredTime,
    status: app.status,
    createdAt: app.createdAt
  }));
}

/**
 * Reschedule an appointment request
 */
export async function rescheduleAppointment(requestId, data) {
  const validated = rescheduleSchema.parse(data);
  const cleanId = requestId.trim().toUpperCase();

  const existing = await prisma.appointmentRequest.findUnique({
    where: { requestId: cleanId }
  });

  if (!existing) {
    const error = new Error(`Appointment request '${requestId}' not found.`);
    error.statusCode = 404;
    error.code = 'APPOINTMENT_NOT_FOUND';
    throw error;
  }

  const updated = await prisma.appointmentRequest.update({
    where: { requestId: cleanId },
    data: {
      preferredDate: validated.preferredDate,
      preferredTime: validated.preferredTime,
      status: "RESCHEDULE_REQUESTED"
    },
    include: {
      patient: true,
      clinic: true,
      service: true
    }
  });

  return {
    success: true,
    requestId: updated.requestId,
    status: updated.status,
    preferredDate: updated.preferredDate,
    preferredTime: updated.preferredTime,
    message: `Reschedule request submitted for ${updated.requestId}. Our clinic team will contact you to confirm the new time slot.`
  };
}

/**
 * Cancel an appointment request
 */
export async function cancelAppointment(requestId, data = {}) {
  const validated = cancelSchema.parse(data);
  const cleanId = requestId.trim().toUpperCase();

  const existing = await prisma.appointmentRequest.findUnique({
    where: { requestId: cleanId }
  });

  if (!existing) {
    const error = new Error(`Appointment request '${requestId}' not found.`);
    error.statusCode = 404;
    error.code = 'APPOINTMENT_NOT_FOUND';
    throw error;
  }

  const updated = await prisma.appointmentRequest.update({
    where: { requestId: cleanId },
    data: {
      status: "CANCELLED",
      cancellationReason: validated.reason
    }
  });

  return {
    success: true,
    requestId: updated.requestId,
    status: updated.status,
    message: `Appointment request ${updated.requestId} has been cancelled.`
  };
}

/**
 * Retrieve Salesforce CRM synchronization status for an appointment request
 */
export async function getSalesforceSyncStatus(requestId) {
  const cleanId = requestId.trim().toUpperCase();
  const appointment = await prisma.appointmentRequest.findUnique({
    where: { requestId: cleanId },
    include: { patient: true, clinic: true, service: true }
  });

  if (!appointment) {
    const error = new Error(`Appointment request '${requestId}' not found.`);
    error.statusCode = 404;
    error.code = 'APPOINTMENT_NOT_FOUND';
    throw error;
  }

  return {
    requestId: appointment.requestId,
    syncStatus: appointment.salesforceSyncStatus || 'PENDING',
    salesforceLeadId: appointment.salesforceLeadId || null,
    salesforceTaskId: appointment.salesforceTaskId || null,
    lastError: appointment.salesforceLastError || null,
    syncedAt: appointment.salesforceSyncedAt || null
  };
}

/**
 * Retry Salesforce CRM synchronization with idempotency checks
 */
export async function retrySalesforceSync(requestId) {
  const cleanId = requestId.trim().toUpperCase();
  const appointment = await prisma.appointmentRequest.findUnique({
    where: { requestId: cleanId },
    include: { patient: true, clinic: true, service: true }
  });

  if (!appointment) {
    const error = new Error(`Appointment request '${requestId}' not found.`);
    error.statusCode = 404;
    error.code = 'APPOINTMENT_NOT_FOUND';
    throw error;
  }

  // If already synced with both Lead and Task, return immediately (Idempotent)
  if (appointment.salesforceSyncStatus === 'SYNCED' && appointment.salesforceLeadId && appointment.salesforceTaskId) {
    return {
      success: true,
      requestId: appointment.requestId,
      syncStatus: 'SYNCED',
      salesforceLeadId: appointment.salesforceLeadId,
      salesforceTaskId: appointment.salesforceTaskId,
      message: `Appointment ${appointment.requestId} is already synchronized with Salesforce.`
    };
  }

  // Execute sync
  const sfResult = await syncAppointmentToSalesforce({
    requestId: appointment.requestId,
    fullName: appointment.patient.fullName,
    phone: appointment.patient.phone,
    email: appointment.patient.email,
    patientType: appointment.patient.patientType === 'NEW' ? 'New Patient' : 'Existing Patient',
    location: appointment.clinic.name,
    service: appointment.service.name,
    preferredDate: appointment.preferredDate,
    preferredTime: appointment.preferredTime,
    leadTemperature: appointment.leadTemperature,
    source: appointment.source,
    salesforceLeadId: appointment.salesforceLeadId,
    salesforceTaskId: appointment.salesforceTaskId
  });

  const updated = await prisma.appointmentRequest.update({
    where: { id: appointment.id },
    data: {
      salesforceSyncStatus: sfResult.syncStatus,
      salesforceLeadId: sfResult.salesforceLeadId,
      salesforceTaskId: sfResult.salesforceTaskId,
      salesforceSyncedAt: sfResult.syncedAt || appointment.salesforceSyncedAt,
      salesforceLastError: sfResult.error || null
    }
  });

  return {
    success: sfResult.success,
    requestId: updated.requestId,
    syncStatus: updated.salesforceSyncStatus,
    salesforceLeadId: updated.salesforceLeadId,
    salesforceTaskId: updated.salesforceTaskId,
    message: sfResult.success ? `Salesforce CRM synchronized successfully for ${updated.requestId}.` : `Salesforce synchronization failed: ${sfResult.error}`
  };
}

