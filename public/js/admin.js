/**
 * CareBridge Health Network — Admin Operations Dashboard Client
 * Interfaces with /api/admin/* endpoints for live metrics, filtering, search, pagination, and CRM status.
 */

let state = {
  adminKey: localStorage.getItem('carebridge_admin_key') || 'carebridge_admin_secret_key_2026',
  page: 1,
  limit: 20,
  search: '',
  location: '',
  service: '',
  patientType: '',
  status: '',
  leadTemperature: '',
  salesforceSyncStatus: '',
  date: '',
  selectedRequestId: null
};

// API Helper with Admin Key
async function adminFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-admin-key': state.adminKey,
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    const newKey = prompt("Enter CareBridge Admin API Key:", state.adminKey);
    if (newKey) {
      state.adminKey = newKey.trim();
      localStorage.setItem('carebridge_admin_key', state.adminKey);
      return adminFetch(url, options);
    }
  }
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || `Request failed (${res.status})`);
  }
  return data.data;
}

// 1. Load Dashboard Overview Metrics
async function loadMetrics() {
  try {
    const m = await adminFetch('/api/admin/dashboard');
    document.getElementById('kpi-total').textContent = m.totalRequests || 0;
    document.getElementById('kpi-pending').textContent = m.pendingRequests || 0;
    document.getElementById('kpi-confirmed').textContent = m.confirmedRequests || 0;
    document.getElementById('kpi-hot').textContent = m.hotLeads || 0;
    document.getElementById('kpi-warm').textContent = m.warmLeads || 0;
    document.getElementById('kpi-cold').textContent = m.coldLeads || 0;
    document.getElementById('kpi-synced').textContent = m.salesforceSynced || 0;
    document.getElementById('kpi-failed').textContent = m.salesforceFailed || 0;
  } catch (err) {
    console.error('Failed loading metrics:', err.message);
  }
}

// 2. Load Location & Service Analytics
async function loadAnalytics() {
  try {
    const [locations, services] = await Promise.all([
      adminFetch('/api/admin/analytics/locations'),
      adminFetch('/api/admin/analytics/services')
    ]);

    // Render Location breakdown
    const locContainer = document.getElementById('analytics-locations-list');
    if (locContainer && locations) {
      locContainer.innerHTML = locations.map(l => `
        <div class="analytics-row">
          <div class="analytics-name">${l.name}</div>
          <div class="analytics-stats">
            <span>Total: <strong>${l.totalRequests}</strong></span>
            <span>Pending: <strong style="color: var(--warning);">${l.pending}</strong></span>
            <span>Hot: <strong style="color: var(--hot);">${l.hotLeads}</strong></span>
          </div>
        </div>
      `).join('');
    }

    // Render Service breakdown
    const srvContainer = document.getElementById('analytics-services-list');
    if (srvContainer && services) {
      srvContainer.innerHTML = services.map(s => `
        <div class="analytics-row">
          <div class="analytics-name">${s.name}</div>
          <div class="analytics-stats">
            <span>Total: <strong>${s.totalRequests}</strong></span>
            <span>Hot: <strong style="color: var(--hot);">${s.hotLeads}</strong></span>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Failed loading analytics:', err.message);
  }
}

// 3. Load Filtered & Paginated Appointments Table
async function loadAppointments() {
  const tbody = document.getElementById('appointments-tbody');
  tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 30px;">Loading appointments...</td></tr>`;

  const queryParams = new URLSearchParams({
    page: state.page,
    limit: state.limit
  });

  if (state.search) queryParams.set('search', state.search);
  if (state.location) queryParams.set('location', state.location);
  if (state.service) queryParams.set('service', state.service);
  if (state.patientType) queryParams.set('patientType', state.patientType);
  if (state.status) queryParams.set('status', state.status);
  if (state.leadTemperature) queryParams.set('leadTemperature', state.leadTemperature);
  if (state.salesforceSyncStatus) queryParams.set('salesforceSyncStatus', state.salesforceSyncStatus);
  if (state.date) queryParams.set('date', state.date);

  try {
    const res = await fetch(`/api/admin/appointments?${queryParams.toString()}`, {
      headers: { 'x-admin-key': state.adminKey }
    });
    const result = await res.json();

    if (!result.success) throw new Error(result.error?.message || "Failed to load appointments");

    const { data, pagination } = result;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 30px;">No appointments found matching current filters.</td></tr>`;
      renderPagination(pagination || { page: 1, total: 0, totalPages: 1 });
      return;
    }

    tbody.innerHTML = data.map(app => {
      const statusBadge = getStatusBadge(app.status);
      const tempBadge = getTemperatureBadge(app.leadTemperature);
      const sfBadge = getSalesforceBadge(app.salesforceSyncStatus);

      return `
        <tr onclick="openAppointmentModal('${app.requestId}')">
          <td><strong style="color: var(--primary);">${app.requestId}</strong></td>
          <td>
            <div style="font-weight: 600;">${app.fullName}</div>
            <div style="font-size: 11px; color: var(--text-subtle);">${app.phone}</div>
          </td>
          <td>${app.patientType}</td>
          <td>${app.service}</td>
          <td>${app.location}</td>
          <td>
            <div>${app.preferredDate}</div>
            <div style="font-size: 11px; color: var(--text-subtle);">${app.preferredTime}</div>
          </td>
          <td>${statusBadge}</td>
          <td>${tempBadge}</td>
          <td>${sfBadge}</td>
          <td style="font-size: 11px; color: var(--text-subtle);">${new Date(app.createdAt).toLocaleDateString()}</td>
        </tr>
      `;
    }).join('');

    renderPagination(pagination);

  } catch (err) {
    console.error('Failed loading appointments:', err.message);
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--danger); padding: 30px;">Error loading data: ${err.message}</td></tr>`;
  }
}

function getStatusBadge(status) {
  switch (status) {
    case 'CONFIRMED': return `<span class="badge badge-confirmed">Confirmed</span>`;
    case 'PENDING': return `<span class="badge badge-pending">Pending</span>`;
    case 'CANCELLED': return `<span class="badge badge-cancelled">Cancelled</span>`;
    case 'COMPLETED': return `<span class="badge badge-completed">Completed</span>`;
    case 'RESCHEDULE_REQUESTED': return `<span class="badge badge-rescheduled">Reschedule</span>`;
    default: return `<span class="badge">${status}</span>`;
  }
}

function getTemperatureBadge(temp) {
  switch (temp) {
    case 'HOT': return `<span class="badge badge-hot">🔥 Hot</span>`;
    case 'WARM': return `<span class="badge badge-warm">⚡ Warm</span>`;
    case 'COLD': return `<span class="badge badge-cold">❄️ Cold</span>`;
    default: return `<span class="badge">${temp || 'N/A'}</span>`;
  }
}

function getSalesforceBadge(status) {
  switch (status) {
    case 'SYNCED': return `<span class="badge badge-synced">✓ Synced</span>`;
    case 'FAILED': return `<span class="badge badge-failed">✗ Failed</span>`;
    default: return `<span class="badge badge-pending-sync">Pending</span>`;
  }
}

// Render Pagination
function renderPagination(pagination) {
  document.getElementById('pagination-summary').textContent =
    `Showing page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total records)`;

  const prevBtn = document.getElementById('btn-prev-page');
  const nextBtn = document.getElementById('btn-next-page');

  prevBtn.disabled = pagination.page <= 1;
  nextBtn.disabled = pagination.page >= pagination.totalPages;
}

// 4. Open Detailed Appointment Modal
window.openAppointmentModal = async function(requestId) {
  state.selectedRequestId = requestId;
  const modal = document.getElementById('modal-details');
  modal.classList.add('open');

  document.getElementById('modal-req-id').textContent = requestId;
  document.getElementById('modal-patient-name').textContent = "Loading...";

  try {
    const details = await adminFetch(`/api/admin/appointments/${requestId}`);

    document.getElementById('modal-patient-name').textContent = details.patient.fullName;
    document.getElementById('modal-patient-type').textContent = details.patient.patientType;
    document.getElementById('modal-patient-phone').textContent = details.patient.phone;
    document.getElementById('modal-patient-email').textContent = details.patient.email;

    document.getElementById('modal-location').textContent = details.appointment.location;
    document.getElementById('modal-service').textContent = details.appointment.service;
    document.getElementById('modal-date').textContent = details.appointment.preferredDate;
    document.getElementById('modal-time').textContent = details.appointment.preferredTime;
    document.getElementById('modal-status-badge').innerHTML = getStatusBadge(details.appointment.status);
    document.getElementById('modal-temp-badge').innerHTML = getTemperatureBadge(details.appointment.leadTemperature);

    // Salesforce CRM details
    document.getElementById('modal-sf-status').innerHTML = getSalesforceBadge(details.salesforce.syncStatus);
    document.getElementById('modal-sf-lead-id').textContent = details.salesforce.leadId || 'Not assigned';
    document.getElementById('modal-sf-task-id').textContent = details.salesforce.taskId || 'Not assigned';

    const sfErrorBox = document.getElementById('modal-sf-error-box');
    if (details.salesforce.syncStatus === 'FAILED' && details.salesforce.lastError) {
      sfErrorBox.style.display = 'block';
      document.getElementById('modal-sf-error-text').textContent = details.salesforce.lastError;
    } else {
      sfErrorBox.style.display = 'none';
    }

    // Render Conversation History
    const chatBox = document.getElementById('modal-chat-history');
    if (details.conversationHistory && details.conversationHistory.length > 0) {
      chatBox.innerHTML = details.conversationHistory.map(c => `
        <div class="transcript-msg transcript-${c.role}">
          <strong>${c.role === 'user' ? '👤 Patient' : '🤖 Assistant'}:</strong> ${c.message}
        </div>
      `).join('');
    } else {
      chatBox.innerHTML = `<div style="color: var(--text-subtle); font-size: 12px;">No conversational intake logged for this session.</div>`;
    }

  } catch (err) {
    console.error('Failed loading appointment details:', err.message);
    alert(`Could not load details: ${err.message}`);
  }
};

window.closeModal = function() {
  document.getElementById('modal-details').classList.remove('open');
};

// 5. Update Appointment Status from Modal Actions
window.updateStatus = async function(newStatus) {
  if (!state.selectedRequestId) return;
  try {
    await adminFetch(`/api/admin/appointments/${state.selectedRequestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    alert(`Appointment ${state.selectedRequestId} updated to ${newStatus}`);
    window.openAppointmentModal(state.selectedRequestId);
    loadAppointments();
    loadMetrics();
    loadAnalytics();
  } catch (err) {
    alert(`Failed to update status: ${err.message}`);
  }
};

// 6. Retry Salesforce Synchronization
window.retrySalesforce = async function() {
  if (!state.selectedRequestId) return;
  try {
    const res = await adminFetch(`/api/admin/appointments/${state.selectedRequestId}/salesforce-retry`, {
      method: 'POST'
    });
    alert(`Salesforce Sync: ${res.message || res.syncStatus}`);
    window.openAppointmentModal(state.selectedRequestId);
    loadAppointments();
    loadMetrics();
  } catch (err) {
    alert(`Failed to retry Salesforce sync: ${err.message}`);
  }
};

// Event Listeners setup
function initAdmin() {
  loadMetrics();
  loadAnalytics();
  loadAppointments();

  // Search input debounce
  let searchTimeout;
  document.getElementById('filter-search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.search = e.target.value;
      state.page = 1;
      loadAppointments();
    }, 300);
  });

  // Filter dropdowns
  document.getElementById('filter-location')?.addEventListener('change', (e) => {
    state.location = e.target.value;
    state.page = 1;
    loadAppointments();
  });

  document.getElementById('filter-service')?.addEventListener('change', (e) => {
    state.service = e.target.value;
    state.page = 1;
    loadAppointments();
  });

  document.getElementById('filter-patient-type')?.addEventListener('change', (e) => {
    state.patientType = e.target.value;
    state.page = 1;
    loadAppointments();
  });

  document.getElementById('filter-status')?.addEventListener('change', (e) => {
    state.status = e.target.value;
    state.page = 1;
    loadAppointments();
  });

  document.getElementById('filter-temp')?.addEventListener('change', (e) => {
    state.leadTemperature = e.target.value;
    state.page = 1;
    loadAppointments();
  });

  document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-location').value = '';
    document.getElementById('filter-service').value = '';
    document.getElementById('filter-patient-type').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-temp').value = '';

    state.search = '';
    state.location = '';
    state.service = '';
    state.patientType = '';
    state.status = '';
    state.leadTemperature = '';
    state.page = 1;

    loadAppointments();
  });

  // Action buttons
  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    loadMetrics();
    loadAnalytics();
    loadAppointments();
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    sessionStorage.removeItem('carebridge_admin_token');
    window.location.reload();
  });

  // Pagination navigation
  document.getElementById('btn-prev-page')?.addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      loadAppointments();
    }
  });

  document.getElementById('btn-next-page')?.addEventListener('click', () => {
    state.page++;
    loadAppointments();
  });

  // Close modal on backdrop click
  document.getElementById('modal-details')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-details') {
      window.closeModal();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}
