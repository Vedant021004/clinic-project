import { generateOperationalSummary } from './conversationSummaryService.js';
import { calculateLeadTemperature } from './leadTemperatureService.js';

/**
 * Salesforce CRM Integration Service.
 * Supports both Mock mode (for offline development/tests) and Live mode (Salesforce REST API).
 */

const SALESFORCE_MODE = (process.env.SALESFORCE_MODE || 'mock').toLowerCase();
const SALESFORCE_LOGIN_URL = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';
const SALESFORCE_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID || '';
const SALESFORCE_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET || '';
const SALESFORCE_USERNAME = process.env.SALESFORCE_USERNAME || '';
const SALESFORCE_PASSWORD = process.env.SALESFORCE_PASSWORD || '';
const SALESFORCE_SECURITY_TOKEN = process.env.SALESFORCE_SECURITY_TOKEN || '';

// In-memory token cache for live mode
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Authenticates with Salesforce REST API via OAuth2
 */
export async function authenticateSalesforce() {
  console.log('[SALESFORCE] Authenticating...');

  if (SALESFORCE_MODE === 'mock') {
    console.log('[SALESFORCE] Authenticated successfully (Mock Mode)');
    return {
      accessToken: 'mock_access_token_xyz',
      instanceUrl: 'https://carebridge-mock.salesforce.com'
    };
  }

  // Live Mode OAuth2 token check
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  if (!SALESFORCE_CLIENT_ID || !SALESFORCE_CLIENT_SECRET || !SALESFORCE_USERNAME || !SALESFORCE_PASSWORD) {
    throw new Error('Salesforce live mode credentials not configured in environment.');
  }

  const tokenUrl = `${SALESFORCE_LOGIN_URL}/services/oauth2/token`;
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: SALESFORCE_CLIENT_ID,
    client_secret: SALESFORCE_CLIENT_SECRET,
    username: SALESFORCE_USERNAME,
    password: `${SALESFORCE_PASSWORD}${SALESFORCE_SECURITY_TOKEN}`
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[SALESFORCE] Authentication failed with status:', response.status);
    throw new Error(`Salesforce authentication error (${response.status}): ${errorBody}`);
  }

  const tokenData = await response.json();
  cachedToken = {
    accessToken: tokenData.access_token,
    instanceUrl: tokenData.instance_url
  };
  tokenExpiresAt = Date.now() + (tokenData.issued_at ? 3600000 : 7200000);

  console.log('[SALESFORCE] Authenticated successfully (Live Mode)');
  return cachedToken;
}

/**
 * Splits full name into FirstName and LastName for Salesforce Lead
 */
function parseName(fullName = '') {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: '', lastName: parts[0] || 'Patient' };
  }
  const lastName = parts.pop();
  const firstName = parts.join(' ');
  return { firstName, lastName };
}

/**
 * Creates a Salesforce Lead for the CareBridge appointment request
 */
export async function createSalesforceLead(appointmentData) {
  console.log(`[SALESFORCE] Creating Lead for ${appointmentData.requestId}...`);
  const { firstName, lastName } = parseName(appointmentData.fullName);
  const leadTemp = appointmentData.leadTemperature || calculateLeadTemperature(appointmentData);
  const summary = generateOperationalSummary({ ...appointmentData, leadTemperature: leadTemp });

  if (SALESFORCE_MODE === 'mock') {
    const mockLeadId = `00Q5g00000${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    console.log(`[SALESFORCE] Lead created successfully: ${mockLeadId} (Mock Mode)`);
    return {
      success: true,
      leadId: mockLeadId,
      leadTemperature: leadTemp
    };
  }

  // Live Mode: POST /services/data/v58.0/sobjects/Lead
  const auth = await authenticateSalesforce();
  const leadPayload = {
    FirstName: firstName || undefined,
    LastName: lastName,
    Company: 'CareBridge Patient',
    Email: appointmentData.email,
    Phone: appointmentData.phone,
    LeadSource: 'CareBridge AI Assistant',
    Status: 'Open - Not Contacted',
    Description: summary
  };

  const response = await fetch(`${auth.instanceUrl}/services/data/v58.0/sobjects/Lead`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(leadPayload)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[SALESFORCE] Failed to create Lead:', errText);
    throw new Error(`Failed to create Salesforce Lead: ${errText}`);
  }

  const result = await response.json();
  console.log(`[SALESFORCE] Lead created successfully: ${result.id}`);
  return {
    success: true,
    leadId: result.id,
    leadTemperature: leadTemp
  };
}

/**
 * Creates a Salesforce Task associated with the Lead
 */
export async function createSalesforceTask(leadId, appointmentData) {
  console.log(`[SALESFORCE] Creating Task for Lead ${leadId}...`);
  const leadTemp = appointmentData.leadTemperature || calculateLeadTemperature(appointmentData);
  const summary = generateOperationalSummary({ ...appointmentData, leadTemperature: leadTemp });

  const priority = leadTemp === 'HOT' ? 'High' : (leadTemp === 'WARM' ? 'Normal' : 'Low');

  if (SALESFORCE_MODE === 'mock') {
    const mockTaskId = `00T5g00000${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    console.log(`[SALESFORCE] Task created successfully: ${mockTaskId} (Mock Mode)`);
    return {
      success: true,
      taskId: mockTaskId,
      priority
    };
  }

  // Live Mode: POST /services/data/v58.0/sobjects/Task
  const auth = await authenticateSalesforce();
  const taskPayload = {
    WhoId: leadId,
    Subject: `CareBridge Appointment Request — ${appointmentData.requestId}`,
    Status: 'Not Started',
    Priority: priority,
    Description: summary,
    ActivityDate: appointmentData.preferredDate || new Date().toISOString().split('T')[0]
  };

  const response = await fetch(`${auth.instanceUrl}/services/data/v58.0/sobjects/Task`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskPayload)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[SALESFORCE] Failed to create Task:', errText);
    throw new Error(`Failed to create Salesforce Task: ${errText}`);
  }

  const result = await response.json();
  console.log(`[SALESFORCE] Task created successfully: ${result.id}`);
  return {
    success: true,
    taskId: result.id,
    priority
  };
}

/**
 * High-level orchestration for complete Salesforce synchronization with idempotency.
 */
export async function syncAppointmentToSalesforce(appointmentData) {
  try {
    // 1. Check idempotency: If lead already exists, reuse it
    let leadId = appointmentData.salesforceLeadId;
    let leadTemperature = appointmentData.leadTemperature || calculateLeadTemperature(appointmentData);

    if (!leadId) {
      const leadResult = await createSalesforceLead({
        ...appointmentData,
        leadTemperature
      });
      leadId = leadResult.leadId;
      leadTemperature = leadResult.leadTemperature;
    }

    // 2. Check idempotency for Task
    let taskId = appointmentData.salesforceTaskId;
    if (!taskId && leadId) {
      const taskResult = await createSalesforceTask(leadId, {
        ...appointmentData,
        leadTemperature
      });
      taskId = taskResult.taskId;
    }

    return {
      success: true,
      syncStatus: 'SYNCED',
      salesforceLeadId: leadId,
      salesforceTaskId: taskId,
      leadTemperature,
      syncedAt: new Date()
    };
  } catch (error) {
    console.error(`[SALESFORCE_SYNC_ERROR] Sync failed for ${appointmentData.requestId}:`, error.message);
    return {
      success: false,
      syncStatus: 'FAILED',
      salesforceLeadId: appointmentData.salesforceLeadId || null,
      salesforceTaskId: appointmentData.salesforceTaskId || null,
      error: error.message
    };
  }
}
