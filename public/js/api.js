/**
 * CareBridge Health Network - Centralized API Client
 * Interfaces with the Express REST API for clinics, services, FAQs, and appointments.
 */

const API_BASE = '/api';

export const CareBridgeAPI = {
  /**
   * Check API health
   */
  async checkHealth() {
    try {
      const res = await fetch('/health');
      return await res.json();
    } catch (e) {
      console.warn("API health check failed:", e);
      return { status: "error", message: e.message };
    }
  },

  /**
   * Fetch all clinics with server-calculated IST live status
   */
  async getClinics() {
    const res = await fetch(`${API_BASE}/clinics`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || "Failed to load clinic locations");
    }
    return data.data;
  },

  /**
   * Fetch a single clinic by slug
   */
  async getClinic(slug) {
    const res = await fetch(`${API_BASE}/clinics/${slug}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || "Clinic not found");
    }
    return data.data;
  },

  /**
   * Fetch all services, optionally filtered by clinic
   */
  async getServices(clinicSlug = '') {
    const url = clinicSlug
      ? `${API_BASE}/services?clinic=${encodeURIComponent(clinicSlug)}`
      : `${API_BASE}/services`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || "Failed to load healthcare services");
    }
    return data.data;
  },

  /**
   * Fetch FAQs, optionally filtered by search term
   */
  async getFaqs(searchTerm = '') {
    const url = searchTerm
      ? `${API_BASE}/faq?search=${encodeURIComponent(searchTerm)}`
      : `${API_BASE}/faq`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || "Failed to load FAQ items");
    }
    return data.data;
  },

  /**
   * Submit a new appointment request
   */
  async createAppointment(appointmentPayload) {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(appointmentPayload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || "Failed to submit appointment request");
    }
    return data;
  },

  /**
   * Get an appointment by Request ID
   */
  async getAppointment(requestId) {
    const res = await fetch(`${API_BASE}/appointments/${encodeURIComponent(requestId)}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || `Appointment ${requestId} not found`);
    }
    return data.data;
  },

  /**
   * Search appointments by Phone number or query
   */
  async searchAppointments(query) {
    const res = await fetch(`${API_BASE}/appointments/search?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || "Failed to search appointments");
    }
    return data.data;
  },

  /**
   * Request rescheduling of an appointment
   */
  async rescheduleAppointment(requestId, preferredDate, preferredTime) {
    const res = await fetch(`${API_BASE}/appointments/${encodeURIComponent(requestId)}/reschedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ preferredDate, preferredTime })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || "Failed to reschedule appointment");
    }
    return data;
  },

  /**
   * Request cancellation of an appointment
   */
  async cancelAppointment(requestId, reason = "Patient requested cancellation") {
    const res = await fetch(`${API_BASE}/appointments/${encodeURIComponent(requestId)}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || "Failed to cancel appointment");
    }
    return data;
  },

  /**
   * Send question to AI Chat RAG backend
   */
  async sendAIChat(message, sessionId = '') {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        session_id: sessionId || `web_${Date.now()}`
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || "Failed to get AI assistant response");
    }
    return data;
  }
};

