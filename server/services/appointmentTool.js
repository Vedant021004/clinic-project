import prisma from '../config/db.js';
import { createAppointmentRequest } from './appointmentService.js';

/**
 * Validates that clinic exists and offers the requested service.
 */
export async function validateClinicAndService(locationName, serviceName) {
  if (!locationName || !serviceName) return { valid: true };

  const clinic = await prisma.clinic.findFirst({
    where: {
      OR: [
        { name: { equals: locationName } },
        { slug: { equals: locationName.toLowerCase().replace(/\s+/g, '-') } }
      ]
    },
    include: {
      services: {
        include: { service: true }
      }
    }
  });

  if (!clinic) {
    return {
      valid: false,
      error: `Location '${locationName}' is not recognized. Please choose from Palghar Central, Boisar Care Center, Vasai Care Center, or Nalasopara Care Center.`
    };
  }

  const service = await prisma.service.findFirst({
    where: {
      OR: [
        { name: { equals: serviceName } },
        { slug: { equals: serviceName.toLowerCase().replace(/\s+/g, '-') } }
      ]
    }
  });

  if (!service) {
    return {
      valid: false,
      error: `Service '${serviceName}' is not recognized.`
    };
  }

  const isOffered = clinic.services.some(cs => cs.serviceId === service.id);
  if (!isOffered) {
    const available = clinic.services.map(cs => cs.service.name).join(', ');
    return {
      valid: false,
      clinicName: clinic.name,
      serviceName: service.name,
      availableServices: available,
      error: `The requested service '${service.name}' is not available at ${clinic.name}. Available services at ${clinic.name}: ${available}.`
    };
  }

  return {
    valid: true,
    clinicName: clinic.name,
    serviceName: service.name
  };
}

/**
 * Controlled function tool to execute appointment creation in the database.
 */
export async function executeCreateAppointment(appointmentState) {
  try {
    const payload = {
      fullName: appointmentState.fullName,
      phone: appointmentState.phone,
      email: appointmentState.email,
      patientType: appointmentState.patientType || "New Patient",
      location: appointmentState.location,
      service: appointmentState.service,
      preferredDate: appointmentState.preferredDate,
      preferredTime: appointmentState.preferredTime,
      notes: appointmentState.notes || "Booked via CareBridge AI Conversational Assistant",
      source: "AI_ASSISTANT"
    };

    const result = await createAppointmentRequest(payload);
    return {
      success: true,
      requestId: result.requestId,
      status: result.status,
      appointment: result.appointment
    };
  } catch (error) {
    console.error('[APPOINTMENT_TOOL_ERROR] Failed to create appointment:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
