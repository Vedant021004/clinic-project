/**
 * Comprehensive API Test Suite for CareBridge Backend Foundation
 */

async function runTests() {
  console.log("🚀 Starting CareBridge API Test Suite...\n");
  const BASE = 'http://localhost:5000';
  let passed = 0;
  let failed = 0;

  async function assert(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  // 1. Health Check
  await assert("GET /health returns ok", async () => {
    const res = await fetch(`${BASE}/health`);
    const data = await res.json();
    if (res.status !== 200 || data.status !== 'ok' || data.service !== 'carebridge-api') {
      throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
    }
  });

  // 2. Clinics API
  await assert("GET /api/clinics returns 4 clinics with server-calculated IST status", async () => {
    const res = await fetch(`${BASE}/api/clinics`);
    const json = await res.json();
    if (!json.success || json.data.length !== 4) {
      throw new Error(`Expected 4 clinics, got ${json.data?.length}`);
    }
    const boisar = json.data.find(c => c.name.includes("Boisar"));
    if (!boisar || !boisar.liveStatus || !boisar.liveStatus.status) {
      throw new Error(`Missing liveStatus in clinic record: ${JSON.stringify(boisar)}`);
    }
  });

  // 3. Single Clinic API
  await assert("GET /api/clinics/vasai-care-center returns single clinic", async () => {
    const res = await fetch(`${BASE}/api/clinics/vasai-care-center`);
    const json = await res.json();
    if (!json.success || json.data.slug !== 'vasai-care-center') {
      throw new Error(`Expected vasai-care-center, got ${JSON.stringify(json)}`);
    }
  });

  // 4. Services API
  await assert("GET /api/services returns catalog with branch mappings", async () => {
    const res = await fetch(`${BASE}/api/services`);
    const json = await res.json();
    if (!json.success || json.data.length < 8) {
      throw new Error(`Expected at least 8 services, got ${json.data?.length}`);
    }
    const cardio = json.data.find(s => s.name === "Cardiology");
    if (!cardio || !cardio.availableAt.includes("Boisar Care Center")) {
      throw new Error(`Cardiology missing expected branches: ${JSON.stringify(cardio)}`);
    }
  });

  // 5. Services Filtered by Clinic
  await assert("GET /api/services?clinic=boisar-care-center returns filtered services", async () => {
    const res = await fetch(`${BASE}/api/services?clinic=boisar-care-center`);
    const json = await res.json();
    if (!json.success || json.clinic !== 'Boisar Care Center') {
      throw new Error(`Expected Boisar Care Center, got ${json.clinic}`);
    }
  });

  // 6. FAQ API
  await assert("GET /api/faq returns FAQ items", async () => {
    const res = await fetch(`${BASE}/api/faq`);
    const json = await res.json();
    if (!json.success || json.data.length < 10) {
      throw new Error(`Expected 10 FAQs, got ${json.data?.length}`);
    }
  });

  // 7. FAQ Search
  await assert("GET /api/faq?search=insurance returns matching FAQ", async () => {
    const res = await fetch(`${BASE}/api/faq?search=insurance`);
    const json = await res.json();
    if (!json.success || json.data.length === 0) {
      throw new Error(`Expected matching insurance FAQs`);
    }
  });

  // 8. Create Appointment Request (POST /api/appointments)
  let createdRequestId = '';
  await assert("POST /api/appointments creates validated request and returns CB-XXXXXX", async () => {
    const payload = {
      fullName: "Pooja Hegde",
      phone: "+91 98111 22334",
      email: "pooja.hegde@example.com",
      patientType: "New Patient",
      location: "Palghar Central",
      service: "General Medicine",
      preferredDate: "2026-09-05",
      preferredTime: "Morning (9:00 AM - 12:00 PM)",
      notes: "First time consultation",
      source: "WEBSITE"
    };
    const res = await fetch(`${BASE}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (res.status !== 201 || !json.success || !json.requestId.startsWith("CB-") || json.status !== "PENDING") {
      throw new Error(`Appointment creation failed: ${JSON.stringify(json)}`);
    }
    createdRequestId = json.requestId;
  });

  // 9. Get Appointment by Request ID
  await assert("GET /api/appointments/:requestId retrieves created record", async () => {
    const res = await fetch(`${BASE}/api/appointments/${createdRequestId}`);
    const json = await res.json();
    if (!json.success || json.data.fullName !== "Pooja Hegde" || json.data.location !== "Palghar Central") {
      throw new Error(`Failed to retrieve created appointment: ${JSON.stringify(json)}`);
    }
  });

  // 10. Search Appointments by Phone
  await assert("GET /api/appointments/search?phone=98111 returns matching request", async () => {
    const res = await fetch(`${BASE}/api/appointments/search?phone=98111`);
    const json = await res.json();
    if (!json.success || json.data.length === 0 || json.data[0].requestId !== createdRequestId) {
      throw new Error(`Search by phone failed: ${JSON.stringify(json)}`);
    }
  });

  // 11. Reschedule Appointment Request
  await assert("PATCH /api/appointments/:requestId/reschedule updates status to RESCHEDULE_REQUESTED", async () => {
    const res = await fetch(`${BASE}/api/appointments/${createdRequestId}/reschedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferredDate: "2026-09-08",
        preferredTime: "Evening (4:00 PM - 8:00 PM)"
      })
    });
    const json = await res.json();
    if (!json.success || json.status !== "RESCHEDULE_REQUESTED" || json.preferredDate !== "2026-09-08") {
      throw new Error(`Reschedule failed: ${JSON.stringify(json)}`);
    }
  });

  // 12. Cancel Appointment Request
  await assert("PATCH /api/appointments/:requestId/cancel updates status to CANCELLED", async () => {
    const res = await fetch(`${BASE}/api/appointments/${createdRequestId}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: "Patient conflict"
      })
    });
    const json = await res.json();
    if (!json.success || json.status !== "CANCELLED") {
      throw new Error(`Cancellation failed: ${JSON.stringify(json)}`);
    }
  });

  // 13. Service-Location Validation Error Test
  await assert("POST /api/appointments rejects service not available at clinic", async () => {
    const invalidPayload = {
      fullName: "Test User",
      phone: "+91 99999 88888",
      email: "test@example.com",
      patientType: "New Patient",
      location: "Palghar Central", // Palghar doesn't offer Neurology
      service: "Neurology",
      preferredDate: "2026-09-05",
      preferredTime: "Morning (9:00 AM - 12:00 PM)"
    };
    const res = await fetch(`${BASE}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload)
    });
    const json = await res.json();
    if (res.status !== 400 || json.success !== false || json.error.code !== 'SERVICE_NOT_AVAILABLE_AT_CLINIC') {
      throw new Error(`Expected 400 with SERVICE_NOT_AVAILABLE_AT_CLINIC, got: ${JSON.stringify(json)}`);
    }
  });

  console.log(`\n========================================`);
  console.log(`🏁 API Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
