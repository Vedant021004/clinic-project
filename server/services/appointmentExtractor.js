/**
 * Natural language entity extraction for conversational appointment scheduling.
 */

const CLINIC_SYNONYMS = [
  { name: "Palghar Central", regex: /\b(?:palghar\s+central|palghar\s+clinic|palghar)\b/i },
  { name: "Boisar Care Center", regex: /\b(?:boisar\s+care\s+center|boisar\s+clinic|boisar)\b/i },
  { name: "Vasai Care Center", regex: /\b(?:vasai\s+care\s+center|vasai\s+clinic|vasai)\b/i },
  { name: "Nalasopara Care Center", regex: /\b(?:nalasopara\s+care\s+center|nalasopara\s+west|nalasopara\s+clinic|nalasopara)\b/i }
];

const SERVICE_SYNONYMS = [
  { name: "Cardiology", regex: /\b(?:cardiology|cardiologist|heart|cardiac|ecg)\b/i },
  { name: "Neurology", regex: /\b(?:neurology|neurologist|brain|migraine)\b/i },
  { name: "Pediatrics", regex: /\b(?:pediatrics|pediatric|pediatrician|child\s+care|children)\b/i },
  { name: "Women's Health", regex: /\b(?:women'?s\s+health|gynecology|gynaecology|pcos|pcod|maternity)\b/i },
  { name: "General Medicine", regex: /\b(?:general\s+medicine|general\s+physician|primary\s+care|fever|cough)\b/i },
  { name: "Preventive Health Checkups", regex: /\b(?:preventive|health\s+checkup|full\s+body\s+checkup|wellness\s+package)\b/i },
  { name: "Diagnostics & Basic Diagnostics", regex: /\b(?:diagnostics|pathology|blood\s+test|lab\s+test|x-?ray)\b/i },
  { name: "Health Consultations", regex: /\b(?:consultation|general\s+consultation|doctor\s+visit)\b/i }
];

const TIME_SLOTS = [
  { name: "Morning (9:00 AM - 12:00 PM)", regex: /\b(?:morning|early\s+morning|9\s*am|10\s*am|11\s*am)\b/i },
  { name: "Afternoon (1:00 PM - 4:00 PM)", regex: /\b(?:afternoon|noon|1\s*pm|2\s*pm|3\s*pm|4\s*pm)\b/i },
  { name: "Evening (5:00 PM - 8:00 PM)", regex: /\b(?:evening|night|5\s*pm|6\s*pm|7\s*pm|8\s*pm)\b/i }
];

export function extractEntities(message, currentState = {}) {
  const text = message.trim();
  const extracted = {};

  // 1. Patient Type
  if (/\b(?:new\s+patient|first\s+time|never\s+visited|new\s+here)\b/i.test(text)) {
    extracted.patientType = "New Patient";
  } else if (/\b(?:existing\s+patient|already\s+registered|visited\s+before|follow\s+up|regular\s+patient)\b/i.test(text)) {
    extracted.patientType = "Existing Patient";
  }

  // 2. Location
  for (const clinic of CLINIC_SYNONYMS) {
    if (clinic.regex.test(text)) {
      extracted.location = clinic.name;
      break;
    }
  }

  // 3. Service
  for (const srv of SERVICE_SYNONYMS) {
    if (srv.regex.test(text)) {
      extracted.service = srv.name;
      break;
    }
  }

  // 4. Phone Number (Indian 10-digit mobile or with +91)
  const phoneMatch = text.match(/(?:\+91[\s-]?)?([6-9]\d{9})\b/) || text.match(/\b(\d{10})\b/);
  if (phoneMatch) {
    extracted.phone = phoneMatch[1] || phoneMatch[0].replace(/\D/g, '');
  }

  // 5. Email
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  if (emailMatch) {
    extracted.email = emailMatch[0].toLowerCase();
  }

  // 6. Time Slot
  for (const slot of TIME_SLOTS) {
    if (slot.regex.test(text)) {
      extracted.preferredTime = slot.name;
      break;
    }
  }

  // 7. Date Extraction (normalize to YYYY-MM-DD in Asia/Kolkata)
  const dateStr = parseNaturalDate(text);
  if (dateStr) {
    extracted.preferredDate = dateStr;
  }

  // 8. Full Name Extraction
  const namePatterns = [
    /(?:my\s+name\s+is|i\s+am|i'm|this\s+is|name\s*[:\-])\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i,
    /(?:patient|patient\s+name)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i,
    /(?:^|\bfor\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/
  ];

  for (const pat of namePatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const candidateName = match[1].trim();
      if (!isReservedKeyword(candidateName)) {
        extracted.fullName = candidateName;
        break;
      }
    }
  }

  // Direct Name regex if missing
  if (!extracted.fullName && (!currentState.fullName || currentState.step === 'COLLECTING')) {
    const directNameMatch = text.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/);
    if (directNameMatch && !isReservedKeyword(directNameMatch[1])) {
      extracted.fullName = directNameMatch[1];
    }
  }

  return extracted;
}

function isReservedKeyword(str) {
  const lower = str.toLowerCase();
  const reserved = [
    "care center", "palghar central", "boisar care", "vasai care", "nalasopara care",
    "general medicine", "preventive health", "women health", "new patient", "existing patient",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "next friday", "next monday", "tomorrow", "this weekend", "cardiology", "neurology",
    "pediatrics", "diagnostics"
  ];
  return reserved.some(r => lower.includes(r));
}

/**
 * Natural language date parser for Asia/Kolkata
 */
export function parseNaturalDate(text) {
  const lower = text.toLowerCase();
  const now = new Date();
  
  // 1. Explicit YYYY-MM-DD
  const isoMatch = text.match(/\b(202[4-9]-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  // 2. Explicit DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](202[4-9])\b/);
  if (dmyMatch) {
    const day = String(dmyMatch[1]).padStart(2, '0');
    const month = String(dmyMatch[2]).padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. "tomorrow"
  if (/\btomorrow\b/i.test(lower)) {
    const target = new Date(now);
    target.setDate(now.getDate() + 1);
    return target.toISOString().split('T')[0];
  }

  // 4. "day after tomorrow"
  if (/\bday\s+after\s+tomorrow\b/i.test(lower)) {
    const target = new Date(now);
    target.setDate(now.getDate() + 2);
    return target.toISOString().split('T')[0];
  }

  // 5. "next Friday", "next Monday", "this Friday", etc.
  const daysOfWeek = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const dayMatch = lower.match(/\b(?:next|this|coming)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  if (dayMatch && dayMatch[1]) {
    const targetDayIndex = daysOfWeek[dayMatch[1].toLowerCase()];
    const currentDayIndex = now.getDay();
    let daysToAdd = (targetDayIndex - currentDayIndex + 7) % 7;
    if (daysToAdd === 0 || lower.includes("next")) {
      daysToAdd += 7;
    }
    const target = new Date(now);
    target.setDate(now.getDate() + daysToAdd);
    return target.toISOString().split('T')[0];
  }

  // 6. Month name + Day (e.g. "September 5", "5th September", "Sep 5")
  const months = {
    january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
    may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9,
    sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12
  };

  const monthDayMatch = lower.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i) ||
                        lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\b/i);

  if (monthDayMatch) {
    let mStr = monthDayMatch[1];
    let dStr = monthDayMatch[2];
    if (/^\d+$/.test(mStr)) {
      dStr = monthDayMatch[1];
      mStr = monthDayMatch[2];
    }
    const mNum = months[mStr.toLowerCase()];
    const dNum = parseInt(dStr, 10);
    const year = now.getFullYear();
    const targetMonth = String(mNum).padStart(2, '0');
    const targetDay = String(dNum).padStart(2, '0');
    return `${year}-${targetMonth}-${targetDay}`;
  }

  return null;
}

export function isConfirmation(message) {
  const lower = message.trim().toLowerCase();
  return /\b(?:yes|confirm|submit|book\s+it|looks\s+good|that's\s+correct|correct|proceed|sure|go\s+ahead|please\s+submit)\b/i.test(lower);
}

export function isRejection(message) {
  const lower = message.trim().toLowerCase();
  return /\b(?:no|cancel|stop|don't\s+book|change|edit|not\s+correct|wrong)\b/i.test(lower);
}
