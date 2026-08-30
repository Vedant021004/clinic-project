/**
 * CareBridge Health Network - Appointment Storage & Patient Tracker
 * Handles local persistence, status tracking, rescheduling, and cancellations.
 */

const STORAGE_KEY = 'carebridge_appointment_requests';

export class AppointmentManager {
  constructor() {
    this.appointments = this.loadAppointments();
  }

  loadAppointments() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn("Error reading appointment store:", e);
    }
    // Seed initial demo records if none exists
    const initialRecords = [
      {
        requestId: "CB-849201",
        fullName: "Aarav Deshmukh",
        phone: "+91 98200 11223",
        email: "aarav.deshmukh@example.com",
        patientType: "Existing Patient",
        location: "Palghar Central",
        service: "General Medicine",
        preferredDate: "2026-09-02",
        preferredTime: "Morning (9:00 AM - 12:00 PM)",
        status: "Request Submitted (Pending Clinic Confirmation)",
        createdAt: "2026-08-29T10:15:00.000Z",
        notes: "Routine follow-up"
      },
      {
        requestId: "CB-512940",
        fullName: "Meera Nair",
        phone: "+91 98333 44556",
        email: "meera.nair@example.com",
        patientType: "New Patient",
        location: "Vasai Care Center",
        service: "Cardiology",
        preferredDate: "2026-09-03",
        preferredTime: "Evening (4:00 PM - 8:00 PM)",
        status: "Request Submitted (Pending Clinic Confirmation)",
        createdAt: "2026-08-29T14:30:00.000Z",
        notes: "Cardiovascular health check"
      }
    ];
    this.saveAppointments(initialRecords);
    return initialRecords;
  }

  saveAppointments(records) {
    this.appointments = records;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn("Failed to write to localStorage:", e);
    }
  }

  createRequest(formData) {
    const requestId = formData.requestId || ('CB-' + Math.floor(100000 + Math.random() * 900000));
    const newRecord = {
      requestId: requestId,
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      patientType: formData.patientType || 'New Patient',
      location: formData.location,
      service: formData.service,
      preferredDate: formData.preferredDate,
      preferredTime: formData.preferredTime,
      status: "Request Submitted (Pending Clinic Confirmation)",
      createdAt: formData.createdAt || new Date().toISOString(),
      notes: formData.notes || ""
    };

    this.appointments.unshift(newRecord);
    this.saveAppointments(this.appointments);
    return newRecord;
  }

  searchRequests(query) {
    if (!query) return [];
    const q = query.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return this.appointments.filter(app => {
      const matchId = app.requestId.toLowerCase().replace(/[^a-z0-9]/g, '').includes(q);
      const matchPhone = app.phone.replace(/[^0-9]/g, '').includes(q);
      const matchName = app.fullName.toLowerCase().includes(query.trim().toLowerCase());
      return matchId || matchPhone || matchName;
    });
  }

  requestReschedule(requestId, newDate, newTime) {
    const app = this.appointments.find(a => a.requestId === requestId);
    if (!app) return null;

    app.preferredDate = newDate;
    app.preferredTime = newTime;
    app.status = "Reschedule Requested (Pending Clinic Confirmation)";
    app.updatedAt = new Date().toISOString();
    this.saveAppointments(this.appointments);
    return app;
  }

  requestCancellation(requestId, reason = "Patient requested") {
    const app = this.appointments.find(a => a.requestId === requestId);
    if (!app) return null;

    app.status = "Cancellation Requested (Pending Clinic Confirmation)";
    app.cancellationReason = reason;
    app.updatedAt = new Date().toISOString();
    this.saveAppointments(this.appointments);
    return app;
  }
}
