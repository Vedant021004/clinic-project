const EXPRESS_URL = 'http://localhost:5000';
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'carebridge_admin_secret_key_2026';

async function runAdminTests() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 CareBridge Admin Operations Dashboard Test Suite');
  console.log('='.repeat(70) + '\n');

  let passed = 0;
  let failed = 0;

  function assertTest(name, condition, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.log(`❌ [FAIL] ${name} -> ${JSON.stringify(details)}`);
      failed++;
    }
  }

  async function adminGet(path, key = ADMIN_KEY) {
    const headers = key ? { 'x-admin-key': key } : {};
    const res = await fetch(`${EXPRESS_URL}${path}`, { headers });
    const data = await res.json();
    return { status: res.status, data };
  }

  async function adminPatch(path, body, key = ADMIN_KEY) {
    const headers = { 'Content-Type': 'application/json', ...(key ? { 'x-admin-key': key } : {}) };
    const res = await fetch(`${EXPRESS_URL}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  async function adminPost(path, body = {}, key = ADMIN_KEY) {
    const headers = { 'Content-Type': 'application/json', ...(key ? { 'x-admin-key': key } : {}) };
    const res = await fetch(`${EXPRESS_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  // 1. Dashboard Metrics
  try {
    const { status, data } = await adminGet('/api/admin/dashboard');
    assertTest('Test 1: Dashboard Metrics (GET /api/admin/dashboard)',
      status === 200 && data.success && typeof data.data.totalRequests === 'number' && typeof data.data.hotLeads === 'number',
      data);
  } catch (e) {
    assertTest('Test 1', false, e.message);
  }

  // 2. Appointment List
  try {
    const { status, data } = await adminGet('/api/admin/appointments');
    assertTest('Test 2: Appointment List (GET /api/admin/appointments)',
      status === 200 && data.success && Array.isArray(data.data) && data.pagination,
      data);
  } catch (e) {
    assertTest('Test 2', false, e.message);
  }

  // 3. Pagination
  try {
    const { status, data } = await adminGet('/api/admin/appointments?page=1&limit=2');
    assertTest('Test 3: Server-Side Pagination (limit=2, returns totalPages & pagination metadata)',
      status === 200 && data.success && data.pagination.limit === 2 && typeof data.pagination.total === 'number' && typeof data.pagination.totalPages === 'number',
      data);
  } catch (e) {
    assertTest('Test 3', false, e.message);
  }

  // 4. Search
  try {
    const { status, data } = await adminGet('/api/admin/appointments?search=Rahul');
    assertTest('Test 4: Server-Side Search (?search=Rahul)',
      status === 200 && data.success && data.data.every(a => a.fullName.toLowerCase().includes('rahul') || a.requestId.includes('Rahul')),
      data);
  } catch (e) {
    assertTest('Test 4', false, e.message);
  }

  // 5. Location Filtering
  try {
    const { status, data } = await adminGet('/api/admin/appointments?location=Boisar%20Care%20Center');
    assertTest('Test 5: Location Filtering (?location=Boisar Care Center)',
      status === 200 && data.success && data.data.every(a => a.location.includes('Boisar')),
      data);
  } catch (e) {
    assertTest('Test 5', false, e.message);
  }

  // 6. Service Filtering
  try {
    const { status, data } = await adminGet('/api/admin/appointments?service=Cardiology');
    assertTest('Test 6: Service Filtering (?service=Cardiology)',
      status === 200 && data.success && data.data.every(a => a.service.includes('Cardiology')),
      data);
  } catch (e) {
    assertTest('Test 6', false, e.message);
  }

  // 7. Status Filtering
  try {
    const { status, data } = await adminGet('/api/admin/appointments?status=PENDING');
    assertTest('Test 7: Status Filtering (?status=PENDING)',
      status === 200 && data.success && data.data.every(a => a.status === 'PENDING'),
      data);
  } catch (e) {
    assertTest('Test 7', false, e.message);
  }

  // 8. Lead Temperature Filtering
  try {
    const { status, data } = await adminGet('/api/admin/appointments?leadTemperature=HOT');
    assertTest('Test 8: Lead Temperature Filtering (?leadTemperature=HOT)',
      status === 200 && data.success && data.data.every(a => a.leadTemperature === 'HOT'),
      data);
  } catch (e) {
    assertTest('Test 8', false, e.message);
  }

  // 9. Appointment Details & Status Update
  let testReqId = 'CB-TEST-001';
  try {
    // Get list to find an existing request ID
    const listRes = await adminGet('/api/admin/appointments?limit=1');
    if (listRes.data.data.length > 0) {
      testReqId = listRes.data.data[0].requestId;
    }

    const { status, data } = await adminGet(`/api/admin/appointments/${testReqId}`);
    assertTest('Test 9: Appointment Details (GET /api/admin/appointments/:requestId)',
      status === 200 && data.success && data.data.requestId === testReqId && data.data.patient && data.data.appointment,
      data);

    // Update status to CONFIRMED
    const patchRes = await adminPatch(`/api/admin/appointments/${testReqId}`, { status: 'CONFIRMED' });
    assertTest('Test 9b: Update Status by Admin (PATCH /api/admin/appointments/:requestId)',
      patchRes.status === 200 && patchRes.data.success && patchRes.data.data.status === 'CONFIRMED',
      patchRes);

  } catch (e) {
    assertTest('Test 9', false, e.message);
  }

  // 10. Salesforce Sync Status in Details
  try {
    const { status, data } = await adminGet(`/api/admin/appointments/${testReqId}`);
    assertTest('Test 10: Salesforce CRM Status in Details View',
      status === 200 && data.success && data.data.salesforce && (data.data.salesforce.syncStatus === 'SYNCED' || data.data.salesforce.syncStatus === 'PENDING' || data.data.salesforce.syncStatus === 'FAILED'),
      data);
  } catch (e) {
    assertTest('Test 10', false, e.message);
  }

  // 11. Salesforce Retry via Admin API
  try {
    const { status, data } = await adminPost(`/api/admin/appointments/${testReqId}/salesforce-retry`);
    assertTest('Test 11: Salesforce Retry via Admin API',
      status === 200 && data.success && (data.data.syncStatus === 'SYNCED' || data.data.syncStatus === 'PENDING'),
      data);
  } catch (e) {
    assertTest('Test 11', false, e.message);
  }

  // 12. Unauthorized Access Rejection (Without Key)
  try {
    const { status, data } = await adminGet('/api/admin/dashboard', null);
    assertTest('Test 12: Unauthorized Access Rejection (Returns 401 without x-admin-key)',
      status === 401 && data.success === false && data.error.code === 'UNAUTHORIZED',
      data);
  } catch (e) {
    assertTest('Test 12', false, e.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Admin Dashboard Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminTests();
