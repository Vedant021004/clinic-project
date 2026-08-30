/**
 * CareBridge Health Network - Database Seed Script
 * Seeds Clinics, Services, Mappings, FAQs, and synthetic demonstration requests.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CLINICS_DATA = [
  {
    name: "Palghar Central",
    slug: "palghar-central",
    address: "Boisar Road, Palghar, Maharashtra 401404",
    city: "Palghar",
    state: "Maharashtra",
    pincode: "401404",
    phone: "+91 22 4000 1001",
    landmark: "Near Palghar Railway Station (East-West link)",
    tag: "Central Hub",
    openingHours: JSON.stringify({
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
    }),
    services: [
      "general-medicine",
      "pediatrics",
      "preventive-health-checkups",
      "diagnostics",
      "health-consultations"
    ]
  },
  {
    name: "Boisar Care Center",
    slug: "boisar-care-center",
    address: "Boisar-Palghar Road, Boisar, Maharashtra 401501",
    city: "Boisar",
    state: "Maharashtra",
    pincode: "401501",
    phone: "+91 22 4000 1002",
    landmark: "Main Industrial Corridor / MIDC vicinity",
    tag: "Cardio & Diagnostic Unit",
    openingHours: JSON.stringify({
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
    }),
    services: [
      "general-medicine",
      "cardiology",
      "diagnostics",
      "preventive-health-checkups",
      "specialist-consultations"
    ]
  },
  {
    name: "Vasai Care Center",
    slug: "vasai-care-center",
    address: "Vasai East, Maharashtra 401208",
    city: "Vasai",
    state: "Maharashtra",
    pincode: "401208",
    phone: "+91 22 4000 1003",
    landmark: "Navghar / Station Road Link",
    tag: "Specialty Neuro & Cardio Center",
    openingHours: JSON.stringify({
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
    }),
    services: [
      "general-medicine",
      "cardiology",
      "neurology",
      "diagnostics",
      "specialist-consultations"
    ]
  },
  {
    name: "Nalasopara Care Center",
    slug: "nalasopara-care-center",
    address: "Nalasopara West, Maharashtra 401203",
    city: "Nalasopara",
    state: "Maharashtra",
    pincode: "401203",
    phone: "+91 22 4000 1004",
    landmark: "Near Sriprastha & Station Road",
    tag: "Women & Child Care Unit",
    openingHours: JSON.stringify({
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
    }),
    services: [
      "general-medicine",
      "pediatrics",
      "womens-health",
      "preventive-health-checkups",
      "diagnostics"
    ]
  }
];

const SERVICES_DATA = [
  {
    name: "General Medicine",
    slug: "general-medicine",
    description: "Primary physician consultations for acute and chronic conditions, fevers, infectious illness, blood pressure, diabetes, and regular family checkups.",
    icon: "stethoscope"
  },
  {
    name: "Cardiology",
    slug: "cardiology",
    description: "Specialized cardiac evaluations, 12-lead ECG assessments, hypertension control, post-cardiac follow-up, and preventive cardiovascular screening.",
    icon: "heart-pulse"
  },
  {
    name: "Neurology",
    slug: "neurology",
    description: "Specialist neurological consultations for chronic migraines, peripheral neuropathies, dizziness, stroke recovery follow-ups, and nerve disorders.",
    icon: "brain"
  },
  {
    name: "Pediatrics",
    slug: "pediatrics",
    description: "Child healthcare from neonatal to adolescence, milestone developmental tracking, vaccination charts, pediatric respiratory and nutritional support.",
    icon: "baby"
  },
  {
    name: "Women's Health",
    slug: "womens-health",
    description: "Comprehensive care for women's wellness, adolescent & reproductive health, prenatal guidance, PCOS screening, and cervical/breast wellness checks.",
    icon: "user-check"
  },
  {
    name: "Preventive Health Checkups",
    slug: "preventive-health-checkups",
    description: "Customized full-body screening packages, executive wellness profiles, geriatric checkups, and early disease risk detection.",
    icon: "shield-check"
  },
  {
    name: "Diagnostics & Basic Diagnostics",
    slug: "diagnostics",
    description: "Routine pathology blood panels, urine analysis, lipid profile, HbA1c, thyroid profiles, digital ECG, and fast specimen reporting.",
    icon: "microscope"
  },
  {
    name: "Specialist Consultations",
    slug: "specialist-consultations",
    description: "Scheduled OPD visits with top medical specialists across Cardiology, Neurology, Internal Medicine, and Preventive Care.",
    icon: "users"
  },
  {
    name: "Health Consultations",
    slug: "health-consultations",
    description: "General wellness advice, lifestyle counseling, and routine health assessments.",
    icon: "activity"
  }
];

const FAQ_DATA = [
  {
    category: "Appointments",
    question: "Do I need an appointment?",
    answer: "Appointments are recommended. Patients can submit an appointment request through our website AI assistant or online portal. While walk-ins may be accepted depending on location, an advance request guarantees priority scheduling."
  },
  {
    category: "Visits",
    question: "Do you accept walk-ins?",
    answer: "Walk-in availability may vary by location and service. Please contact your preferred clinic location before visiting without an appointment to verify real-time doctor availability."
  },
  {
    category: "Doctors",
    question: "Can I choose a doctor?",
    answer: "Doctor availability depends on the selected service and location. The clinic scheduling team will confirm available doctors when processing your appointment request."
  },
  {
    category: "Appointments",
    question: "Can I cancel my appointment?",
    answer: "Yes. Patients can submit a cancellation request through the clinic's appointment support process or directly through our AI Assistant / patient management section."
  },
  {
    category: "Appointments",
    question: "Can I reschedule my appointment?",
    answer: "Yes. Existing patients can submit a rescheduling request through the AI assistant or by contacting their respective clinic center."
  },
  {
    category: "Emergency",
    question: "Do you provide emergency care?",
    answer: "Emergency services may vary by location. If you are experiencing a medical emergency, seek immediate emergency medical care (Call 108 in India) or contact your local emergency department immediately."
  },
  {
    category: "Safety",
    question: "Can the AI diagnose me?",
    answer: "No. The AI assistant provides general clinic information and administrative assistance. It does not diagnose medical conditions or provide medical treatment advice."
  },
  {
    category: "Safety",
    question: "Can the AI tell me what medicine to take?",
    answer: "No. Medication and treatment decisions must always be discussed with a qualified healthcare professional. The assistant cannot recommend or prescribe any drugs."
  },
  {
    category: "Billing",
    question: "How does insurance and cashless work?",
    answer: "Insurance and cashless availability can vary by location, service, and insurer. The AI assistant cannot guarantee insurance coverage. Patients should contact the clinic team directly to confirm their specific insurance policy eligibility."
  },
  {
    category: "Billing",
    question: "What are the consultation and service fees?",
    answer: "Accepted payment methods and costs may vary by service and clinic location. The AI assistant does not quote unverified prices. Our clinic front desk team will provide you with the latest, transparent pricing when confirming your visit."
  }
];

async function main() {
  console.log("🌱 Starting CareBridge database seed...");

  // Clean existing tables
  await prisma.appointmentRequest.deleteMany();
  await prisma.clinicService.deleteMany();
  await prisma.service.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.fAQItem.deleteMany();
  await prisma.patient.deleteMany();

  // 1. Seed Services
  const serviceMap = {};
  for (const srv of SERVICES_DATA) {
    const created = await prisma.service.create({
      data: {
        name: srv.name,
        slug: srv.slug,
        description: srv.description,
        icon: srv.icon
      }
    });
    serviceMap[srv.slug] = created;
  }
  console.log(`✅ Seeded ${SERVICES_DATA.length} services.`);

  // 2. Seed Clinics and link services
  const clinicMap = {};
  for (const clinic of CLINICS_DATA) {
    const createdClinic = await prisma.clinic.create({
      data: {
        name: clinic.name,
        slug: clinic.slug,
        address: clinic.address,
        city: clinic.city,
        state: clinic.state,
        pincode: clinic.pincode,
        phone: clinic.phone,
        landmark: clinic.landmark,
        tag: clinic.tag,
        openingHours: clinic.openingHours
      }
    });
    clinicMap[clinic.slug] = createdClinic;

    // Link services
    for (const srvSlug of clinic.services) {
      if (serviceMap[srvSlug]) {
        await prisma.clinicService.create({
          data: {
            clinicId: createdClinic.id,
            serviceId: serviceMap[srvSlug].id
          }
        });
      }
    }
  }
  console.log(`✅ Seeded ${CLINICS_DATA.length} clinics and linked their service catalogs.`);

  // 3. Seed FAQs
  for (const faq of FAQ_DATA) {
    await prisma.fAQItem.create({
      data: {
        category: faq.category,
        question: faq.question,
        answer: faq.answer
      }
    });
  }
  console.log(`✅ Seeded ${FAQ_DATA.length} FAQ items.`);

  // 4. Seed Demonstration Synthetic Patients and Appointments
  const patient1 = await prisma.patient.create({
    data: {
      fullName: "Aarav Deshmukh",
      email: "aarav.deshmukh@example.com",
      phone: "+91 98200 11223",
      patientType: "EXISTING"
    }
  });

  const patient2 = await prisma.patient.create({
    data: {
      fullName: "Meera Nair",
      email: "meera.nair@example.com",
      phone: "+91 98333 44556",
      patientType: "NEW"
    }
  });

  const palgharClinic = clinicMap["palghar-central"];
  const vasaiClinic = clinicMap["vasai-care-center"];
  const generalMedicineService = serviceMap["general-medicine"];
  const cardiologyService = serviceMap["cardiology"];

  await prisma.appointmentRequest.create({
    data: {
      requestId: "CB-849201",
      patientId: patient1.id,
      clinicId: palgharClinic.id,
      serviceId: generalMedicineService.id,
      preferredDate: "2026-09-02",
      preferredTime: "Morning (9:00 AM - 12:00 PM)",
      status: "PENDING",
      leadTemperature: "WARM",
      source: "WEBSITE",
      notes: "Routine follow-up"
    }
  });

  await prisma.appointmentRequest.create({
    data: {
      requestId: "CB-512940",
      patientId: patient2.id,
      clinicId: vasaiClinic.id,
      serviceId: cardiologyService.id,
      preferredDate: "2026-09-03",
      preferredTime: "Evening (4:00 PM - 8:00 PM)",
      status: "PENDING",
      leadTemperature: "HOT",
      source: "AI_ASSISTANT",
      notes: "Cardiovascular checkup"
    }
  });

  console.log("✅ Seeded initial synthetic demonstration patients and appointment requests.");
  console.log("🌟 CareBridge database successfully populated!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
