import {
  authenticateSalesforce,
  createSalesforceLead,
  createSalesforceTask,
  syncAppointmentToSalesforce
} from './services/salesforceService.js';
import { calculateLeadTemperature } from './services/leadTemperatureService.js';
import { generateOperationalSummary, sanitizeOperationalNotes } from './services/conversationSummaryService.js';
import {
  createAppointmentRequest,
  getAppointmentByRequestId,
  getSalesforceSyncStatus,
  retrySalesforceSync
} from './services/appointmentService.js';

async function runSalesforceTests() {
  console.log('\n' + '='.repeat(70));
  console.log('☁️  CareBridge Salesforce CRM Integration Test Suite');
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

  // 1. Mock Salesforce Authentication
  try {
    const auth = await authenticateSalesforce();
    assertTest('Test 1: Salesforce Mock Authentication returns token and instanceUrl',
      auth && auth.accessToken && auth.instanceUrl.includes('salesforce.com'),
      auth);
  } catch (e) {
    assertTest('Test 1', false, e.message);
  }

  // 2. Mock Lead Creation
  try {
    const lead = await createSalesforceLead({
      requestId: 'CB-TEST-001',
      fullName: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      phone: '9876543210',
      location: 'Boisar Care Center',
      service: 'Cardiology'
    });
    assertTest('Test 2: Salesforce Lead Creation returns 00Q... Lead ID',
      lead && lead.success && lead.leadId.startsWith('00Q'),
      lead);
  } catch (e) {
    assertTest('Test 2', false, e.message);
  }

  // 3. Mock Task Creation associated with Lead
  try {
    const task = await createSalesforceTask('00Q5g00000Mock12345', {
      requestId: 'CB-TEST-001',
      fullName: 'Rahul Sharma',
      location: 'Boisar Care Center',
      service: 'Cardiology',
      preferredDate: '2026-09-04',
      preferredTime: 'Morning',
      leadTemperature: 'HOT'
    });
    assertTest('Test 3: Salesforce Task Creation returns 00T... Task ID with High Priority for HOT lead',
      task && task.success && task.taskId.startsWith('00T') && task.priority === 'High',
      task);
  } catch (e) {
    assertTest('Test 3', false, e.message);
  }

  // 4. HOT Lead Evaluation
  try {
    const tempHot = calculateLeadTemperature({
      fullName: 'Anita Desai',
      phone: '9811122233',
      email: 'anita@example.com',
      location: 'Vasai Care Center',
      service: 'Neurology',
      preferredDate: '2026-09-10',
      preferredTime: 'Afternoon',
      isConfirmed: true
    });
    assertTest('Test 4: Lead Temperature calculation returns HOT for complete confirmed request',
      tempHot === 'HOT',
      tempHot);
  } catch (e) {
    assertTest('Test 4', false, e.message);
  }

  // 5. WARM Lead Evaluation
  try {
    const tempWarm = calculateLeadTemperature({
      fullName: 'Vikram Patel',
      phone: '9822233344',
      email: 'vikram@example.com',
      location: 'Palghar Central',
      isConfirmed: false
    });
    assertTest('Test 5: Lead Temperature calculation returns WARM for unconfirmed or partial request',
      tempWarm === 'WARM',
      tempWarm);
  } catch (e) {
    assertTest('Test 5', false, e.message);
  }

  // 6. COLD Lead Evaluation
  try {
    const tempCold = calculateLeadTemperature({
      fullName: '',
      phone: '',
      email: '',
      isConfirmed: false
    });
    assertTest('Test 6: Lead Temperature calculation returns COLD for minimal inquiry',
      tempCold === 'COLD',
      tempCold);
  } catch (e) {
    assertTest('Test 6', false, e.message);
  }

  // 7. Full Appointment Creation with Auto-Sync to Salesforce
  let createdApp;
  try {
    const result = await createAppointmentRequest({
      fullName: 'Pooja Verma',
      phone: '9833344455',
      email: 'pooja.verma@example.com',
      patientType: 'New Patient',
      location: 'Boisar Care Center',
      service: 'Cardiology',
      preferredDate: '2026-09-15',
      preferredTime: 'Morning (9:00 AM - 12:00 PM)',
      notes: 'Cardiology consultation request via AI Assistant'
    });
    createdApp = result;

    assertTest('Test 7: Full Appointment creation auto-syncs with Salesforce CRM',
      result.success && result.salesforceSyncStatus === 'SYNCED' && result.salesforceLeadId.startsWith('00Q') && result.salesforceTaskId.startsWith('00T'),
      result);
  } catch (e) {
    assertTest('Test 7', false, e.message);
  }

  // 8. Idempotent Retry for already synced appointment
  try {
    if (createdApp && createdApp.requestId) {
      const retryRes = await retrySalesforceSync(createdApp.requestId);
      assertTest('Test 8: Idempotent Retry preserves existing Lead & Task IDs without duplicating',
        retryRes.success && retryRes.syncStatus === 'SYNCED' && retryRes.salesforceLeadId === createdApp.salesforceLeadId && retryRes.salesforceTaskId === createdApp.salesforceTaskId,
        retryRes);
    }
  } catch (e) {
    assertTest('Test 8', false, e.message);
  }

  // 9. Salesforce Sync Status API inspection
  try {
    if (createdApp && createdApp.requestId) {
      const statusRes = await getSalesforceSyncStatus(createdApp.requestId);
      assertTest('Test 9: getSalesforceSyncStatus returns clean sync metadata without exposing secrets',
        statusRes.requestId === createdApp.requestId && statusRes.syncStatus === 'SYNCED' && Boolean(statusRes.syncedAt) && !statusRes.accessToken && !statusRes.password,
        statusRes);
    }
  } catch (e) {
    assertTest('Test 9', false, e.message);
  }

  // 10. Operational Summary PHI Sanitization
  try {
    const summary = generateOperationalSummary({
      requestId: 'CB-999888',
      fullName: 'Rajesh Nair',
      patientType: 'New Patient',
      location: 'Vasai Care Center',
      service: 'Neurology',
      preferredDate: '2026-09-20',
      preferredTime: 'Morning',
      phone: '9844455566',
      email: 'rajesh@example.com',
      leadTemperature: 'HOT'
    });

    const sanitizedNotes = sanitizeOperationalNotes('Patient mentioned MRI report and paracetamol 500mg prescription inquiry');
    
    assertTest('Test 10: Conversation summary contains operational business details and sanitizes PHI/prescriptions',
      summary.includes('CB-999888') && summary.includes('Vasai Care Center') && !sanitizedNotes.includes('paracetamol 500mg') && !sanitizedNotes.includes('prescription'),
      { summary, sanitizedNotes });
  } catch (e) {
    assertTest('Test 10', false, e.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Salesforce CRM Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSalesforceTests();
