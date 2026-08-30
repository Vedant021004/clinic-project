/**
 * CareBridge Health Network - Appointment Client Service
 * Interacts directly with the backend API for creating, searching,
 * rescheduling, and cancelling appointment requests.
 */

import { CareBridgeAPI } from './api.js';

export class AppointmentManager {
  constructor() {
    // No longer stores appointments in localStorage
  }

  /**
   * Submit an appointment request to the backend API
   */
  async createRequest(formData) {
    const payload = {
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      patientType: formData.patientType || "New Patient",
      location: formData.location,
      service: formData.service,
      preferredDate: formData.preferredDate,
      preferredTime: formData.preferredTime,
      notes: formData.notes || "",
      source: formData.source || "WEBSITE"
    };

    const result = await CareBridgeAPI.createAppointment(payload);
    return result.appointment || {
      requestId: result.requestId,
      ...formData,
      status: result.status || "PENDING"
    };
  }

  /**
   * Search appointment requests via backend API
   */
  async searchRequests(query) {
    if (!query || !query.trim()) return [];
    return await CareBridgeAPI.searchAppointments(query.trim());
  }

  /**
   * Request rescheduling via backend API
   */
  async requestReschedule(requestId, newDate, newTime) {
    return await CareBridgeAPI.rescheduleAppointment(requestId, newDate, newTime);
  }

  /**
   * Request cancellation via backend API
   */
  async requestCancellation(requestId, reason = "Patient requested cancellation") {
    return await CareBridgeAPI.cancelAppointment(requestId, reason);
  }
}
