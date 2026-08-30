/**
 * Lead Temperature Evaluation Service.
 * Evaluates patient engagement and scheduling completeness.
 */

export function calculateLeadTemperature(appointmentData) {
  const {
    fullName,
    phone,
    email,
    location,
    service,
    preferredDate,
    preferredTime,
    isConfirmed
  } = appointmentData;

  const hasContact = Boolean(phone && email);
  const hasDetails = Boolean(location && service && preferredDate && preferredTime);
  const hasName = Boolean(fullName && fullName.length >= 2);

  // 1. HOT Lead: Complete information + explicit patient confirmation
  if (hasContact && hasDetails && hasName && isConfirmed !== false) {
    return 'HOT';
  }

  // 2. WARM Lead: Provided contact and service/location, but pending final confirmation
  if (hasContact && (location || service)) {
    return 'WARM';
  }

  // 3. COLD Lead: Minimal details or generic inquiry
  return 'COLD';
}
