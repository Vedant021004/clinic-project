/**
 * CareBridge Health Network - Core Data & Knowledge Base
 * Fictional multi-location healthcare provider in Palghar, Boisar, Vasai, Nalasopara
 */

export const CAREBRIDGE_DATA = {
  network: {
    name: "CareBridge Health Network",
    tagline: "Accessible, Quality Healthcare Across Palghar District & Mumbai MMR",
    description: "CareBridge Health Network is a multi-location healthcare provider serving Palghar, Boisar, Vasai, and Nalasopara with comprehensive clinical care, diagnostics, and patient-centered services.",
    phone: "+91 22 4000 1000",
    phoneDisplay: "+91 22 4000 1000",
    emergencyPhone: "108 / +91 22 4000 1000",
    email: "support@carebridge-demo.in",
    disclaimer: "CareBridge Health Network is a fictional multi-location healthcare provider created for demonstration purposes. The AI Patient Assistant provides administrative assistance and clinic info, not medical diagnosis or treatment advice."
  },

  locations: [
    {
      id: "palghar",
      name: "Palghar Central",
      address: "Boisar Road, Palghar, Maharashtra 401404",
      landmark: "Near Palghar Railway Station (East-West link)",
      pincode: "401404",
      phone: "+91 22 4000 1001",
      services: [
        "General Medicine",
        "Pediatrics",
        "Preventive Health Checkups",
        "Basic Diagnostics",
        "Health Consultations"
      ],
      hours: {
        weekdayText: "Monday - Saturday: 9:00 AM - 8:00 PM",
        sundayText: "Sunday: 10:00 AM - 2:00 PM",
        schedule: {
          0: { open: "10:00", close: "14:00" },
          1: { open: "09:00", close: "20:00" },
          2: { open: "09:00", close: "20:00" },
          3: { open: "09:00", close: "20:00" },
          4: { open: "09:00", close: "20:00" },
          5: { open: "09:00", close: "20:00" },
          6: { open: "09:00", close: "20:00" }
        }
      },
      tag: "Central Hub",
      features: ["Walk-in Diagnostics", "Pediatric Wing", "Day Care Consultations"]
    },
    {
      id: "boisar",
      name: "Boisar Care Center",
      address: "Boisar-Palghar Road, Boisar, Maharashtra 401501",
      landmark: "Main Industrial Corridor / MIDC vicinity",
      pincode: "401501",
      phone: "+91 22 4000 1002",
      services: [
        "General Medicine",
        "Cardiology",
        "Diagnostics",
        "Preventive Health Checkups",
        "Specialist Consultations"
      ],
      hours: {
        weekdayText: "Monday - Saturday: 8:00 AM - 8:00 PM",
        sundayText: "Sunday: 10:00 AM - 2:00 PM",
        schedule: {
          0: { open: "10:00", close: "14:00" },
          1: { open: "08:00", close: "20:00" },
          2: { open: "08:00", close: "20:00" },
          3: { open: "08:00", close: "20:00" },
          4: { open: "08:00", close: "20:00" },
          5: { open: "08:00", close: "20:00" },
          6: { open: "08:00", close: "20:00" }
        }
      },
      tag: "Cardio & Diagnostic Unit",
      features: ["Advanced Cardiac Screening", "Occupational Health", "Specialist OPD"]
    },
    {
      id: "vasai",
      name: "Vasai Care Center",
      address: "Vasai East, Maharashtra 401208",
      landmark: "Navghar / Station Road Link",
      pincode: "401208",
      phone: "+91 22 4000 1003",
      services: [
        "General Medicine",
        "Cardiology",
        "Neurology",
        "Diagnostics",
        "Specialist Consultations"
      ],
      hours: {
        weekdayText: "Monday - Saturday: 8:00 AM - 9:00 PM",
        sundayText: "Sunday: 10:00 AM - 3:00 PM",
        schedule: {
          0: { open: "10:00", close: "15:00" },
          1: { open: "08:00", close: "21:00" },
          2: { open: "08:00", close: "21:00" },
          3: { open: "08:00", close: "21:00" },
          4: { open: "08:00", close: "21:00" },
          5: { open: "08:00", close: "21:00" },
          6: { open: "08:00", close: "21:00" }
        }
      },
      tag: "Specialty Neuro & Cardio Center",
      features: ["Neurology Consultations", "Extended Evening OPD", "Pathology & Imaging"]
    },
    {
      id: "nalasopara",
      name: "Nalasopara Care Center",
      address: "Nalasopara West, Maharashtra 401203",
      landmark: "Near Sriprastha & Station Road",
      pincode: "401203",
      phone: "+91 22 4000 1004",
      services: [
        "General Medicine",
        "Pediatrics",
        "Women's Health",
        "Preventive Health",
        "Diagnostics"
      ],
      hours: {
        weekdayText: "Monday - Saturday: 9:00 AM - 8:00 PM",
        sundayText: "Sunday: 10:00 AM - 2:00 PM",
        schedule: {
          0: { open: "10:00", close: "14:00" },
          1: { open: "09:00", close: "20:00" },
          2: { open: "09:00", close: "20:00" },
          3: { open: "09:00", close: "20:00" },
          4: { open: "09:00", close: "20:00" },
          5: { open: "09:00", close: "20:00" },
          6: { open: "09:00", close: "20:00" }
        }
      },
      tag: "Women & Child Care Unit",
      features: ["Women's Health & GYN", "Child Immunization & Growth Tracking", "Preventive Well-Woman Tests"]
    }
  ],

  services: [
    {
      id: "general-medicine",
      name: "General Medicine",
      description: "Primary physician consultations for acute and chronic conditions, fevers, infectious illness, blood pressure, diabetes, and regular family checkups.",
      availableAt: ["Palghar Central", "Boisar Care Center", "Vasai Care Center", "Nalasopara Care Center"],
      icon: "stethoscope"
    },
    {
      id: "cardiology",
      name: "Cardiology",
      description: "Specialized cardiac evaluations, 12-lead ECG assessments, hypertension control, post-cardiac follow-up, and preventive cardiovascular screening.",
      availableAt: ["Boisar Care Center", "Vasai Care Center"],
      icon: "heart-pulse"
    },
    {
      id: "neurology",
      name: "Neurology",
      description: "Specialist neurological consultations for chronic migraines, peripheral neuropathies, dizziness, stroke recovery follow-ups, and nerve disorders.",
      availableAt: ["Vasai Care Center"],
      icon: "brain"
    },
    {
      id: "pediatrics",
      name: "Pediatrics",
      description: "Child healthcare from neonatal to adolescence, milestone developmental tracking, vaccination charts, pediatric respiratory and nutritional support.",
      availableAt: ["Palghar Central", "Nalasopara Care Center"],
      icon: "baby"
    },
    {
      id: "womens-health",
      name: "Women's Health",
      description: "Comprehensive care for women's wellness, adolescent & reproductive health, prenatal guidance, PCOS screening, and cervical/breast wellness checks.",
      availableAt: ["Nalasopara Care Center"],
      icon: "user-check"
    },
    {
      id: "preventive-health",
      name: "Preventive Health Checkups",
      description: "Customized full-body screening packages, executive wellness profiles, geriatric checkups, and early disease risk detection.",
      availableAt: ["Palghar Central", "Boisar Care Center", "Nalasopara Care Center"],
      icon: "shield-check"
    },
    {
      id: "diagnostics",
      name: "Diagnostics & Basic Diagnostics",
      description: "Routine pathology blood panels, urine analysis, lipid profile, HbA1c, thyroid profiles, digital ECG, and fast specimen reporting.",
      availableAt: ["Palghar Central", "Boisar Care Center", "Vasai Care Center", "Nalasopara Care Center"],
      icon: "microscope"
    },
    {
      id: "specialist-consultations",
      name: "Specialist Consultations",
      description: "Scheduled OPD visits with top medical specialists across Cardiology, Neurology, Internal Medicine, and Preventive Care.",
      availableAt: ["Boisar Care Center", "Vasai Care Center"],
      icon: "users"
    }
  ],

  faq: [
    {
      id: "faq-appointment",
      category: "Appointments",
      question: "Do I need an appointment?",
      answer: "Appointments are recommended. Patients can submit an appointment request through our website AI assistant or online portal. While walk-ins may be accepted depending on location, an advance request guarantees priority scheduling."
    },
    {
      id: "faq-walkins",
      category: "Visits",
      question: "Do you accept walk-ins?",
      answer: "Walk-in availability may vary by location and service. Please contact your preferred clinic location before visiting without an appointment to verify real-time doctor availability."
    },
    {
      id: "faq-doctor-choice",
      category: "Doctors",
      question: "Can I choose a doctor?",
      answer: "Doctor availability depends on the selected service and location. The clinic scheduling team will confirm available doctors when processing your appointment request."
    },
    {
      id: "faq-cancel",
      category: "Appointments",
      question: "Can I cancel my appointment?",
      answer: "Yes. Patients can submit a cancellation request through the clinic's appointment support process or directly through our AI Assistant / patient management section."
    },
    {
      id: "faq-reschedule",
      category: "Appointments",
      question: "Can I reschedule my appointment?",
      answer: "Yes. Existing patients can submit a rescheduling request through the AI assistant or by contacting their respective clinic center."
    },
    {
      id: "faq-emergency",
      category: "Emergency",
      question: "Do you provide emergency care?",
      answer: "Emergency services may vary by location. If you are experiencing a medical emergency, seek immediate emergency medical care (Call 108 in India) or contact your local emergency department immediately."
    },
    {
      id: "faq-ai-diagnose",
      category: "Safety",
      question: "Can the AI diagnose me?",
      answer: "No. The AI assistant provides general clinic information and administrative assistance. It does not diagnose medical conditions or provide medical treatment advice."
    },
    {
      id: "faq-ai-medicine",
      category: "Safety",
      question: "Can the AI tell me what medicine to take?",
      answer: "No. Medication and treatment decisions must always be discussed with a qualified healthcare professional. The assistant cannot recommend or prescribe any drugs."
    },
    {
      id: "faq-insurance",
      category: "Billing",
      question: "How does insurance and cashless work?",
      answer: "Insurance and cashless availability can vary by location, service, and insurer. The AI assistant cannot guarantee insurance coverage. Patients should contact the clinic team directly to confirm their specific insurance policy eligibility."
    },
    {
      id: "faq-pricing",
      category: "Billing",
      question: "What are the consultation and service fees?",
      answer: "Accepted payment methods and costs may vary by service and clinic location. The AI assistant does not quote unverified prices. Our clinic front desk team will provide you with the latest, transparent pricing when confirming your visit."
    }
  ],

  safetyKeywords: {
    emergency: [
      "chest pain", "heart attack", "can't breathe", "cannot breathe", "difficulty breathing",
      "choking", "severe bleeding", "unconscious", "stroke", "paralysis", "fainted",
      "suicide", "poison", "head trauma", "severe burn", "emergency", "dying", "collapsed"
    ],
    medicalAdvice: [
      "diagnose", "diagnosis", "symptoms of", "what disease", "what illness",
      "prescribe", "prescription", "what medicine", "which medicine", "paracetamol",
      "antibiotic", "dosage", "cure my", "treatment for", "interpret my report",
      "blood test result", "mri report", "ct scan report"
    ]
  },

  requiredAppointmentFields: [
    { key: "fullName", label: "Full Name", example: "e.g. Priya Sharma" },
    { key: "phone", label: "Phone Number", example: "+91 98765 43210" },
    { key: "email", label: "Email Address", example: "priya@example.com" },
    { key: "patientType", label: "Patient Type", options: ["New Patient", "Existing Patient"] },
    { key: "location", label: "Preferred Location", options: ["Palghar Central", "Boisar Care Center", "Vasai Care Center", "Nalasopara Care Center"] },
    { key: "service", label: "Requested Service", options: ["General Medicine", "Pediatrics", "Cardiology", "Neurology", "Women's Health", "Preventive Health Checkups", "Diagnostics", "Specialist Consultations"] },
    { key: "preferredDate", label: "Preferred Date", example: "YYYY-MM-DD" },
    { key: "preferredTime", label: "Preferred Time", options: ["Morning (9:00 AM - 12:00 PM)", "Afternoon (12:00 PM - 4:00 PM)", "Evening (4:00 PM - 8:00 PM)"] }
  ]
};
