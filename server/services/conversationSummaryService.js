/**
 * Conversation Summary Service for Salesforce CRM integration.
 * Creates clean, operational appointment summaries while strictly
 * sanitizing sensitive medical information (PHI, diagnoses, symptoms, prescriptions).
 */

export function generateOperationalSummary(appointmentData) {
  const {
    fullName,
    patientType,
    location,
    service,
    preferredDate,
    preferredTime,
    phone,
    email,
    requestId,
    leadTemperature,
    source
  } = appointmentData;

  const lines = [
    `=== CareBridge Appointment Request ===`,
    `Request ID: ${requestId || 'N/A'}`,
    `Patient: ${fullName || 'N/A'} (${patientType || 'New Patient'})`,
    `Clinic Location: ${location || 'N/A'}`,
    `Service/Specialty: ${service || 'N/A'}`,
    `Preferred Date: ${preferredDate || 'N/A'}`,
    `Preferred Time: ${preferredTime || 'N/A'}`,
    `Contact Phone: ${phone || 'N/A'}`,
    `Contact Email: ${email || 'N/A'}`,
    `Lead Temperature: ${leadTemperature || 'WARM'}`,
    `Source: ${source || 'CareBridge AI Assistant'}`,
    `Status: Patient confirmed and submitted appointment request via CareBridge AI Assistant.`,
    `======================================`
  ];

  return lines.join('\n');
}

/**
 * Sanitizes any raw text to remove potential medical records or diagnoses
 */
export function sanitizeOperationalNotes(rawNotes = '') {
  if (!rawNotes) return '';
  // Strip potential diagnostic keywords or sensitive indicators
  const sanitized = rawNotes
    .replace(/\b(?:prescribe|prescription|medication|dosage|diagnosis|symptom|mri|ct scan|biopsy)\b[:\s\w]+/gi, '')
    .trim();
  return sanitized;
}
