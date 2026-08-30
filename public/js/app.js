/**
 * CareBridge Health Network - Main UI Controller
 * Connected to Express REST API with server-calculated IST live hours,
 * backend appointment storage, and real-time patient tracker.
 */

import { CareBridgeAPI } from './api.js';
import { CareBridgeAIAssistant } from './ai-assistant.js';
import { AppointmentManager } from './appointments.js';

class CareBridgeApp {
  constructor() {
    this.appointmentManager = new AppointmentManager();
    this.assistant = null;
    this.clinics = [];
    this.services = [];
    this.faqs = [];
    this.init();
  }

  async init() {
    this.initTheme();
    this.initEventListeners();
    this.initAIAssistant();
    this.initTracker();

    // Fetch initial backend data
    await this.loadInitialData();

    // Refresh live status from server every 60 seconds
    setInterval(() => this.refreshLiveStatuses(), 60000);
  }

  initTheme() {
    const savedTheme = localStorage.getItem('carebridge_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = savedTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
    }
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('carebridge_theme', next);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = next === 'dark' ? '☀️ Light' : '🌙 Dark';
    }
  }

  async loadInitialData() {
    try {
      const [clinics, services, faqs] = await Promise.all([
        CareBridgeAPI.getClinics(),
        CareBridgeAPI.getServices(),
        CareBridgeAPI.getFaqs()
      ]);

      this.clinics = clinics;
      this.services = services;
      this.faqs = faqs;

      this.renderLocations(this.clinics);
      this.renderServices(this.services);
      this.renderFaq(this.faqs);
      this.initBookingForm();
    } catch (e) {
      console.warn("Failed loading live data from API, using fallback data:", e);
      this.showToast("Connected to offline cache", "info");
    }
  }

  async refreshLiveStatuses() {
    try {
      const clinics = await CareBridgeAPI.getClinics();
      this.clinics = clinics;
      clinics.forEach(clinic => {
        const badge = document.getElementById(`status-badge-${clinic.slug}`);
        if (badge && clinic.liveStatus) {
          const statusClass = clinic.liveStatus.status === 'OPEN'
            ? 'status-open'
            : clinic.liveStatus.status === 'CLOSING_SOON'
            ? 'status-closing-soon'
            : 'status-closed';
          badge.className = `status-badge ${statusClass}`;
          badge.innerHTML = `<span class="status-dot"></span> ${clinic.liveStatus.text}`;
        }
      });
    } catch (e) {
      console.warn("Failed refreshing live statuses:", e);
    }
  }

  renderLocations(clinics) {
    const container = document.getElementById('locations-grid');
    if (!container || !clinics) return;

    container.innerHTML = clinics.map(loc => {
      const live = loc.liveStatus || { status: 'CLOSED', text: 'Hours unavailable' };
      const statusClass = live.status === 'OPEN'
        ? 'status-open'
        : live.status === 'CLOSING_SOON'
        ? 'status-closing-soon'
        : 'status-closed';

      return `
        <article class="clinic-card" id="card-${loc.slug}">
          <div class="clinic-card-header">
            <div>
              <span class="clinic-tag">${loc.tag || 'Care Center'}</span>
              <h3 class="clinic-title">${loc.name}</h3>
            </div>
            <div id="status-badge-${loc.slug}" class="status-badge ${statusClass}">
              <span class="status-dot"></span> ${live.text}
            </div>
          </div>

          <div class="clinic-details">
            <p class="clinic-address">
              <svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>${loc.address}</span>
            </p>
            ${loc.landmark ? `<p class="clinic-landmark"><span class="badge-subtle">Landmark</span> ${loc.landmark}</p>` : ''}
            <div class="clinic-hours-box">
              <div class="hours-row">
                <strong>Mon - Sat:</strong>
                <span>${loc.hours.weekdayText ? loc.hours.weekdayText.split(': ')[1] : '8:00 AM - 8:00 PM'}</span>
              </div>
              <div class="hours-row">
                <strong>Sunday:</strong>
                <span>${loc.hours.sundayText ? loc.hours.sundayText.split(': ')[1] : '10:00 AM - 2:00 PM'}</span>
              </div>
            </div>
          </div>

          <div class="clinic-services">
            <h4>Available Services</h4>
            <div class="service-tags">
              ${(loc.services || []).map(s => `<span class="service-tag">${s}</span>`).join('')}
            </div>
          </div>

          <div class="clinic-card-actions">
            <button class="btn btn-outline btn-sm" onclick="window.carebridge.openBookingModal('${loc.name}')">
              Request Appointment
            </button>
            <a href="tel:${loc.phone.replace(/[^0-9+]/g, '')}" class="btn btn-ghost btn-sm">
              <svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              ${loc.phone}
            </a>
          </div>
        </article>
      `;
    }).join('');
  }

  renderServices(services) {
    const container = document.getElementById('services-grid');
    if (!container || !services) return;

    container.innerHTML = services.map(srv => {
      return `
        <div class="service-card">
          <div class="service-icon-box">
            <span class="service-icon-glyph">🩺</span>
          </div>
          <h3 class="service-title">${srv.name}</h3>
          <p class="service-desc">${srv.description}</p>
          <div class="service-locations-list">
            <span class="meta-label">Available At:</span>
            <div class="badge-row">
              ${(srv.availableAt || []).map(loc => `<span class="location-chip">${loc}</span>`).join('')}
            </div>
          </div>
          <button class="btn btn-primary btn-sm service-book-btn" onclick="window.carebridge.openBookingModal('', '${srv.name}')">
            Request ${srv.name}
          </button>
        </div>
      `;
    }).join('');
  }

  renderFaq(faqs) {
    const container = document.getElementById('faq-accordion');
    if (!container || !faqs) return;

    container.innerHTML = faqs.map((item, index) => {
      return `
        <div class="faq-item" id="faq-item-${index}">
          <button class="faq-question" aria-expanded="false" onclick="window.carebridge.toggleFaq(${index})">
            <span>${item.question}</span>
            <span class="faq-icon">+</span>
          </button>
          <div class="faq-answer" id="faq-ans-${index}">
            <p>${item.answer}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  toggleFaq(index) {
    const item = document.getElementById(`faq-item-${index}`);
    const ans = document.getElementById(`faq-ans-${index}`);
    const btn = item.querySelector('.faq-question');
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';

    btn.setAttribute('aria-expanded', !isExpanded);
    if (!isExpanded) {
      item.classList.add('active');
      ans.style.maxHeight = ans.scrollHeight + "px";
      item.querySelector('.faq-icon').textContent = '−';
    } else {
      item.classList.remove('active');
      ans.style.maxHeight = '0px';
      item.querySelector('.faq-icon').textContent = '+';
    }
  }

  async filterFaq(query) {
    try {
      const results = await CareBridgeAPI.getFaqs(query);
      this.renderFaq(results);
    } catch (e) {
      // Fallback local filter
      const items = document.querySelectorAll('.faq-item');
      const q = query.toLowerCase();
      items.forEach(el => {
        const text = el.innerText.toLowerCase();
        el.style.display = text.includes(q) ? 'block' : 'none';
      });
    }
  }

  initBookingForm() {
    const form = document.getElementById('appointment-form');
    if (!form) return;

    const locSelect = document.getElementById('form-location');
    const serviceSelect = document.getElementById('form-service');
    const dateInput = document.getElementById('form-date');

    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;

    // Populate locations from loaded clinics
    locSelect.innerHTML = '<option value="">-- Select Preferred Location --</option>' +
      this.clinics.map(l => `<option value="${l.name}">${l.name}</option>`).join('');

    const updateServices = () => {
      const selectedLocName = locSelect.value;
      let availableServices = this.services.map(s => s.name);
      if (selectedLocName) {
        const found = this.clinics.find(l => l.name === selectedLocName);
        if (found && found.services) availableServices = found.services;
      }
      serviceSelect.innerHTML = '<option value="">-- Select Requested Service --</option>' +
        availableServices.map(s => `<option value="${s}">${s}</option>`).join('');
    };

    locSelect.addEventListener('change', updateServices);
    updateServices();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = {
        fullName: document.getElementById('form-name').value,
        phone: document.getElementById('form-phone').value,
        email: document.getElementById('form-email').value,
        patientType: document.querySelector('input[name="patientType"]:checked')?.value || 'New Patient',
        location: locSelect.value,
        service: serviceSelect.value,
        preferredDate: dateInput.value,
        preferredTime: document.getElementById('form-time').value,
        notes: document.getElementById('form-notes')?.value || '',
        source: 'WEBSITE'
      };

      try {
        const record = await this.appointmentManager.createRequest(formData);
        this.showReceiptModal(record);
        form.reset();
        updateServices();
        this.showToast("Appointment request queued successfully!", "success");
      } catch (err) {
        this.showToast(err.message || "Failed to submit request", "warning");
      }
    });
  }

  initTracker() {
    const searchBtn = document.getElementById('tracker-search-btn');
    const searchInput = document.getElementById('tracker-query');
    const resultsContainer = document.getElementById('tracker-results');

    const doSearch = async () => {
      const query = searchInput.value.trim();
      if (!query) {
        resultsContainer.innerHTML = '<p class="text-muted text-center">Please enter a phone number or request ID to search.</p>';
        return;
      }

      resultsContainer.innerHTML = '<p class="text-muted text-center">🔍 Searching records...</p>';

      try {
        const results = await this.appointmentManager.searchRequests(query);
        if (results.length === 0) {
          resultsContainer.innerHTML = `
            <div class="empty-tracker">
              <p>No appointment requests found matching "<strong>${query}</strong>".</p>
              <small>Tip: Try searching with your phone number or Request ID (e.g. CB-849201).</small>
            </div>
          `;
          return;
        }

        resultsContainer.innerHTML = results.map(req => `
          <div class="tracker-card">
            <div class="tracker-card-header">
              <div>
                <span class="tracker-id">${req.requestId}</span>
                <h4 class="tracker-name">${req.fullName} <span class="patient-pill">${req.patientType}</span></h4>
              </div>
              <span class="tracker-status-badge status-pending">
                ${req.status}
              </span>
            </div>

            <div class="tracker-details-grid">
              <div><strong>Location:</strong> ${req.location}</div>
              <div><strong>Service:</strong> ${req.service}</div>
              <div><strong>Requested Date:</strong> ${req.preferredDate}</div>
              <div><strong>Preferred Time:</strong> ${req.preferredTime}</div>
              <div><strong>Phone:</strong> ${req.phone}</div>
              <div><strong>Email:</strong> ${req.email}</div>
            </div>

            <div class="disclaimer-callout">
              <small>ℹ️ Note: This request is queued with our clinic front-desk team. A coordinator will call ${req.phone} to confirm schedule availability.</small>
            </div>

            <div class="tracker-actions">
              <button class="btn btn-outline btn-sm" onclick="window.carebridge.openRescheduleModal('${req.requestId}')">
                🔄 Request Reschedule
              </button>
              <button class="btn btn-danger-outline btn-sm" onclick="window.carebridge.openCancelModal('${req.requestId}')">
                ❌ Request Cancellation
              </button>
            </div>
          </div>
        `).join('');
      } catch (err) {
        resultsContainer.innerHTML = `<p class="text-danger text-center">Error searching: ${err.message}</p>`;
      }
    };

    if (searchBtn) searchBtn.addEventListener('click', doSearch);
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch();
      });
    }
  }

  initAIAssistant() {
    const chatContainer = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const voiceToggle = document.getElementById('chat-voice-toggle');

    this.assistant = new CareBridgeAIAssistant({
      onMessage: (msg) => {
        this.renderChatMessage(msg, chatContainer);
      },
      onBookingComplete: async (record) => {
        const created = await this.appointmentManager.createRequest(record);
        return {
          success: true,
          requestId: created.requestId,
          status: created.status || "PENDING",
          appointment: created
        };
      }
    });

    const handleSend = () => {
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = '';
      this.assistant.handleUserInput(text);
    };

    if (sendBtn) sendBtn.addEventListener('click', handleSend);
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSend();
      });
    }

    if (voiceToggle) {
      voiceToggle.addEventListener('click', () => {
        const isMuted = voiceToggle.classList.toggle('active');
        this.assistant.toggleSpeech(isMuted);
        voiceToggle.title = isMuted ? "Voice speech enabled" : "Voice speech muted";
      });
    }

    window.addEventListener('carebridge:open-tracker', () => {
      const trackerTab = document.getElementById('tab-btn-tracker');
      if (trackerTab) trackerTab.click();
      const trackerSec = document.getElementById('tracker-section');
      if (trackerSec) trackerSec.scrollIntoView({ behavior: 'smooth' });
    });
  }

  renderChatMessage(msg, container) {
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-bubble chat-bubble-${msg.sender} ${msg.isAlert ? 'chat-bubble-alert' : ''} ${msg.isSuccess ? 'chat-bubble-success' : ''}`;

    let html = '';

    if (msg.isAlert) {
      html += `<div class="chat-alert-banner"><span class="alert-icon">⚠️</span> <strong>Safety & Emergency Notice</strong></div>`;
    }

    if (msg.text) {
      const formatted = msg.text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      html += `<div class="chat-content">${formatted}</div>`;
    }

    if (msg.steps && msg.steps.length > 0) {
      html += `<div class="chat-steps-list">` +
        msg.steps.map(s => `<div class="step-item">${s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`).join('') +
        `</div>`;
    }

    if (msg.list && msg.list.length > 0) {
      html += `<div class="chat-custom-list">` +
        msg.list.map(item => `<div>${item}</div>`).join('') +
        `</div>`;
    }

    if (msg.appointment) {
      const app = msg.appointment;
      html += `
        <div class="chat-receipt-card">
          <div class="receipt-header">
            <span class="receipt-id">Request ID: ${app.requestId}</span>
            <span class="receipt-badge">Pending Confirmation</span>
          </div>
          <div class="receipt-grid">
            <div><strong>Patient:</strong> ${app.fullName} (${app.patientType})</div>
            <div><strong>Location:</strong> ${app.location}</div>
            <div><strong>Service:</strong> ${app.service}</div>
            <div><strong>Date & Time:</strong> ${app.preferredDate} • ${app.preferredTime}</div>
            <div><strong>Contact:</strong> ${app.phone}</div>
          </div>
          <div class="receipt-footer">
            "Your appointment request has been submitted. Our clinic team will contact you to confirm the appointment."
          </div>
        </div>
      `;
    }

    if (msg.meta) {
      html += `<div class="chat-meta">${msg.meta}</div>`;
    }

    if (msg.chips && msg.chips.length > 0) {
      html += `<div class="chat-chips-container">` +
        msg.chips.map(chip => `
          <button class="chat-chip" onclick="window.carebridge.handleChatChip('${chip.action || ''}', '${chip.value || ''}')">
            ${chip.label}
          </button>
        `).join('') +
        `</div>`;
    }

    div.innerHTML = html;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  handleChatChip(action, value) {
    if (this.assistant) {
      this.assistant.handleChipAction(action, value);
    }
  }

  openBookingModal(locationName = '', serviceName = '') {
    const modal = document.getElementById('booking-modal');
    if (!modal) return;

    if (locationName) {
      const locSelect = document.getElementById('form-location');
      if (locSelect) {
        locSelect.value = locationName;
        locSelect.dispatchEvent(new Event('change'));
      }
    }

    if (serviceName) {
      const srvSelect = document.getElementById('form-service');
      if (srvSelect) {
        setTimeout(() => {
          srvSelect.value = serviceName;
        }, 50);
      }
    }

    modal.classList.add('active');
  }

  closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    if (modal) modal.classList.remove('active');
  }

  showReceiptModal(record) {
    this.closeBookingModal();
    const modal = document.getElementById('receipt-modal');
    const content = document.getElementById('receipt-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="receipt-success-badge">
        <span class="icon-big">✅</span>
        <h3>Appointment Request Submitted</h3>
        <p class="receipt-req-number">Request ID: <strong>${record.requestId}</strong></p>
      </div>

      <div class="receipt-box">
        <div class="receipt-row"><strong>Patient Name:</strong> <span>${record.fullName}</span></div>
        <div class="receipt-row"><strong>Patient Category:</strong> <span>${record.patientType}</span></div>
        <div class="receipt-row"><strong>Clinic Location:</strong> <span>${record.location}</span></div>
        <div class="receipt-row"><strong>Requested Specialty:</strong> <span>${record.service}</span></div>
        <div class="receipt-row"><strong>Preferred Schedule:</strong> <span>${record.preferredDate} (${record.preferredTime})</span></div>
        <div class="receipt-row"><strong>Phone:</strong> <span>${record.phone}</span></div>
        <div class="receipt-row"><strong>Email:</strong> <span>${record.email}</span></div>
      </div>

      <div class="mandatory-notice">
        <p><strong>"Your appointment request has been submitted. Our clinic team will contact you to confirm the appointment."</strong></p>
        <small>The AI assistant must never claim that an appointment is confirmed unless appointment availability has actually been verified by the clinic's scheduling system.</small>
      </div>

      <div class="modal-footer-actions">
        <button class="btn btn-primary" onclick="window.carebridge.closeReceiptModal()">Done</button>
        <button class="btn btn-outline" onclick="window.carebridge.viewInTracker('${record.requestId}')">View in Request Tracker</button>
      </div>
    `;

    modal.classList.add('active');
  }

  closeReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (modal) modal.classList.remove('active');
  }

  viewInTracker(requestId) {
    this.closeReceiptModal();
    const trackerInput = document.getElementById('tracker-query');
    const trackerBtn = document.getElementById('tracker-search-btn');
    if (trackerInput && trackerBtn) {
      trackerInput.value = requestId;
      trackerBtn.click();
    }
    const trackerSec = document.getElementById('tracker-section');
    if (trackerSec) trackerSec.scrollIntoView({ behavior: 'smooth' });
  }

  async openRescheduleModal(requestId) {
    const newDate = prompt("Enter new preferred date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    if (!newDate) return;
    const newTime = prompt("Enter new preferred time slot (e.g. Morning (9:00 AM - 12:00 PM), Afternoon, or Evening):", "Morning (9:00 AM - 12:00 PM)");
    if (!newTime) return;

    try {
      const res = await this.appointmentManager.requestReschedule(requestId, newDate, newTime);
      this.showToast(res.message || `Reschedule request submitted for ${requestId}`, "info");
      document.getElementById('tracker-search-btn')?.click();
    } catch (err) {
      this.showToast(err.message || "Failed to reschedule", "warning");
    }
  }

  async openCancelModal(requestId) {
    if (confirm(`Are you sure you want to submit a cancellation request for ${requestId}?`)) {
      try {
        const res = await this.appointmentManager.requestCancellation(requestId);
        this.showToast(res.message || `Cancellation request submitted for ${requestId}.`, "info");
        document.getElementById('tracker-search-btn')?.click();
      } catch (err) {
        this.showToast(err.message || "Failed to cancel", "warning");
      }
    }
  }

  showToast(message, type = "info") {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  toggleChatWidget() {
    const widget = document.getElementById('floating-chat-container');
    if (!widget) return;
    widget.classList.toggle('active');
    if (widget.classList.contains('active')) {
      document.getElementById('chat-input')?.focus();
    }
  }

  initEventListeners() {
    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => this.toggleTheme());
    document.getElementById('floating-chat-trigger')?.addEventListener('click', () => this.toggleChatWidget());
    document.getElementById('close-chat-btn')?.addEventListener('click', () => this.toggleChatWidget());

    let debounceTimer;
    document.getElementById('faq-search-input')?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.filterFaq(e.target.value);
      }, 250);
    });

    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        e.target.classList.remove('active');
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.carebridge = new CareBridgeApp();
});
