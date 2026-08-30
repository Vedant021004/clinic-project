/**
 * CareBridge Health Network - Core Data & Fallback Knowledge Base
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
      slug: "palghar-central",
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
        sundayText: "Sunday: 10:00 AM - 2:00 PM"
      },
      tag: "Central Hub"
    },
    {
      id: "boisar",
      slug: "boisar-care-center",
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
        sundayText: "Sunday: 10:00 AM - 2:00 PM"
      },
      tag: "Cardio & Diagnostic Unit"
    },
    {
      id: "vasai",
      slug: "vasai-care-center",
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
        sundayText: "Sunday: 10:00 AM - 3:00 PM"
      },
      tag: "Specialty Neuro & Cardio Center"
    },
    {
      id: "nalasopara",
      slug: "nalasopara-care-center",
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
        sundayText: "Sunday: 10:00 AM - 2:00 PM"
      },
      tag: "Women & Child Care Unit"
    }
  ],

  services: [
    {
      id: "general-medicine",
      slug: "general-medicine",
      name: "General Medicine",
      description: "Primary physician consultations for acute and chronic conditions, fevers, infectious illness, blood pressure, diabetes, and regular family checkups.",
      availableAt: ["Palghar Central", "Boisar Care Center", "Vasai Care Center", "Nalasopara Care Center"],
      icon: "stethoscope"
    },
    {
      id: "cardiology",
      slug: "cardiology",
      name: "Cardiology",
      description: "Specialized cardiac evaluations, 12-lead ECG assessments, hypertension control, post-cardiac follow-up, and preventive cardiovascular screening.",
      availableAt: ["Boisar Care Center", "Vasai Care Center"],
      icon: "heart-pulse"
    },
    {
      id: "neurology",
      slug: "neurology",
      name: "Neurology",
      description: "Specialist neurological consultations for chronic migraines, peripheral neuropathies, dizziness, stroke recovery follow-ups, and nerve disorders.",
      availableAt: ["Vasai Care Center"],
      icon: "brain"
    },
    {
      id: "pediatrics",
      slug: "pediatrics",
      name: "Pediatrics",
      description: "Child healthcare from neonatal to adolescence, milestone developmental tracking, vaccination charts, pediatric respiratory and nutritional support.",
      availableAt: ["Palghar Central", "Nalasopara Care Center"],
      icon: "baby"
    },
    {
      id: "womens-health",
      slug: "womens-health",
      name: "Women's Health",
      description: "Comprehensive care for women's wellness, adolescent & reproductive health, prenatal guidance, PCOS screening, and cervical/breast wellness checks.",
      availableAt: ["Nalasopara Care Center"],
      icon: "user-check"
    },
    {
      id: "preventive-health",
      slug: "preventive-health-checkups",
      name: "Preventive Health Checkups",
      description: "Customized full-body screening packages, executive wellness profiles, geriatric checkups, and early disease risk detection.",
      availableAt: ["Palghar Central", "Boisar Care Center", "Nalasopara Care Center"],
      icon: "shield-check"
    },
    {
      id: "diagnostics",
      slug: "diagnostics",
      name: "Diagnostics & Basic Diagnostics",
      description: "Routine pathology blood panels, urine analysis, lipid profile, HbA1c, thyroid profiles, digital ECG, and fast specimen reporting.",
      availableAt: ["Palghar Central", "Boisar Care Center", "Vasai Care Center", "Nalasopara Care Center"],
      icon: "microscope"
    },
    {
      id: "specialist-consultations",
      slug: "specialist-consultations",
      name: "Specialist Consultations",
      description: "Scheduled OPD visits with top medical specialists across Cardiology, Neurology, Internal Medicine, and Preventive Care.",
      availableAt: ["Boisar Care Center", "Vasai Care Center"],
      icon: "users"
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
  }
};
