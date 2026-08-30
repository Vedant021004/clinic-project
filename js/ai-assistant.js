/**
 * CareBridge Health Network - AI Patient Assistant Engine
 * Handles conversational intake, multi-step booking, new/existing patient flows,
 * emergency triaging, safety guardrails, and backend appointment submission.
 */

import { CAREBRIDGE_DATA } from './data.js';
import { CareBridgeAPI } from './api.js';

export class CareBridgeAIAssistant {
  constructor(options = {}) {
    this.messages = [];
    this.bookingState = {
      inProgress: false,
      stepIndex: 0,
      data: {
        fullName: '',
        phone: '',
        email: '',
        patientType: '',
        location: '',
        service: '',
        preferredDate: '',
        preferredTime: ''
      }
    };
    this.speechEnabled = false;
    this.onMessageCallback = options.onMessage || (() => {});
    this.onBookingComplete = options.onBookingComplete || (() => {});
    this.init();
  }

  init() {
    this.pushBotMessage({
      type: 'greeting',
      text: "Hello! Welcome to CareBridge Health Network's Patient Assistant. How can I help you today?",
      meta: "I can assist you with clinic hours, locations, services, policies, or submitting an appointment request across Palghar, Boisar, Vasai, and Nalasopara.",
      chips: [
        { label: "Book an Appointment", action: "start_booking" },
        { label: "I am a New Patient", action: "new_patient_info" },
        { label: "Existing Patient Support", action: "existing_patient_info" },
        { label: "Clinic Locations & Hours", action: "show_locations" },
        { label: "Accepted Insurance / Fees", action: "insurance_info" }
      ]
    });
  }

  toggleSpeech(enabled) {
    this.speechEnabled = enabled;
    if (!enabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  speak(text) {
    if (!this.speechEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/[*_#`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
    }
  }

  pushBotMessage(msgObj) {
    const message = {
      id: 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      sender: 'bot',
      timestamp: new Date(),
      ...msgObj
    };
    this.messages.push(message);
    this.onMessageCallback(message);
    if (msgObj.text) {
      this.speak(msgObj.text);
    }
    return message;
  }

  pushUserMessage(text) {
    const message = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: text,
      timestamp: new Date()
    };
    this.messages.push(message);
    this.onMessageCallback(message);
    return message;
  }

  async handleUserInput(rawInput) {
    const input = rawInput.trim();
    if (!input) return;

    this.pushUserMessage(input);

    if (!this.sessionId) {
      this.sessionId = localStorage.getItem('carebridge_agent_session_id') || `session_${Date.now()}`;
      localStorage.setItem('carebridge_agent_session_id', this.sessionId);
    }

    try {
      // Query backend Agent Orchestrator
      const res = await CareBridgeAPI.sendAIChat(input, this.sessionId);

      if (res && (res.message || res.answer)) {
        const responseText = res.message || res.answer;
        let metaText = "";
        
        // 1. Sources formatting for RAG
        if (res.sources && res.sources.length > 0) {
          const docEntries = res.sources.map(s => `${s.document}${s.section ? ` (${s.section})` : ''}`);
          const uniqueDocs = [...new Set(docEntries)].slice(0, 3).join(", ");
          metaText = `📚 **Sources**: ${uniqueDocs}`;
        }

        // 2. Build contextual quick-reply chips
        const chips = [];
        if (res.intent === "EMERGENCY") {
          chips.push({ label: "🚨 Dial 108 Immediately", action: "call_108" });
          chips.push({ label: "📞 Support: +91 22 4000 1000", action: "call_support" });
        } else if (res.intent === "MEDICAL_ADVICE") {
          chips.push({ label: "📅 Book Doctor Consultation", action: "start_booking" });
          chips.push({ label: "🩺 View Clinical Specialties", action: "show_services" });
        } else if (res.appointment_state && res.appointment_state.active) {
          if (res.appointment_state.step === 'AWAITING_CONFIRMATION') {
            chips.push({ label: "✅ Yes, Submit Request", value: "Yes, please submit the request" });
            chips.push({ label: "✏️ Change Details", value: "Change my details" });
          } else if (!res.appointment_state.patientType) {
            chips.push({ label: "New Patient", value: "New Patient" });
            chips.push({ label: "Existing Patient", value: "Existing Patient" });
          } else if (!res.appointment_state.location) {
            chips.push({ label: "Palghar Central", value: "Palghar Central" });
            chips.push({ label: "Boisar Care Center", value: "Boisar Care Center" });
            chips.push({ label: "Vasai Care Center", value: "Vasai Care Center" });
            chips.push({ label: "Nalasopara Care Center", value: "Nalasopara Care Center" });
          } else if (!res.appointment_state.preferredTime) {
            chips.push({ label: "🌅 Morning (9 AM - 12 PM)", value: "Morning" });
            chips.push({ label: "☀️ Afternoon (1 PM - 4 PM)", value: "Afternoon" });
            chips.push({ label: "🌆 Evening (5 PM - 8 PM)", value: "Evening" });
          }
        } else {
          chips.push({ label: "📅 Book an Appointment", action: "start_booking" });
          chips.push({ label: "📍 Clinic Locations", action: "show_locations" });
          chips.push({ label: "🩺 Clinical Services", action: "show_services" });
        }

        // 3. Render message
        const msgObj = {
          text: responseText,
          meta: metaText,
          chips: chips,
          isAlert: res.intent === "EMERGENCY" || res.intent === "MEDICAL_ADVICE",
          isSuccess: Boolean(res.appointment && res.appointment.requestId),
          appointment: res.appointment || null
        };

        this.pushBotMessage(msgObj);

        // 4. Trigger booking complete callback if appointment was created
        if (res.appointment && res.appointment.requestId) {
          this.onBookingComplete(res.appointment);
        }

        return;
      }
    } catch (err) {
      console.warn("Agent chat fallback:", err.message);
      this.pushBotMessage({
        text: "I'm having trouble connecting to the CareBridge assistant backend. Please try again in a moment or visit our appointment form directly.",
        chips: [
          { label: "Request Appointment", action: "start_booking" },
          { label: "Clinic Locations & Hours", action: "show_locations" }
        ]
      });
    }
  }

  isEmergency(text) {
    const lower = text.toLowerCase();
    return CAREBRIDGE_DATA.safetyKeywords.emergency.some(k => lower.includes(k));
  }

  isMedicalAdviceRequest(text) {
    const lower = text.toLowerCase();
    return CAREBRIDGE_DATA.safetyKeywords.medicalAdvice.some(k => lower.includes(k));
  }

  handleEmergencyResponse() {
    this.pushBotMessage({
      isAlert: true,
      alertLevel: 'emergency',
      text: "🚨 **URGENT MEDICAL NOTICE**\n\nIf you or someone with you is experiencing a serious or life-threatening medical emergency (such as severe chest pain, difficulty breathing, stroke symptoms, or severe bleeding), **please seek immediate emergency medical care or dial 108 immediately**.",
      meta: "The AI Assistant is not equipped to handle acute medical emergencies. Emergency facilities vary by location.",
      chips: [
        { label: "Emergency Hotline: 108", action: "call_108" },
        { label: "Clinic Phone: +91 22 4000 1000", action: "call_support" }
      ]
    });
  }

  handleMedicalAdviceGuardrail() {
    this.pushBotMessage({
      isAlert: true,
      alertLevel: 'warning',
      text: "⚕️ **Important Safety Disclaimer**\n\nI am an administrative AI Assistant and **NOT a doctor**. I cannot diagnose medical conditions, recommend treatments, interpret lab/radiology reports, or prescribe medications.",
      meta: "Please schedule a consultation with a qualified CareBridge physician or visit your nearest healthcare facility for medical evaluation.",
      chips: [
        { label: "Request Doctor Consultation", action: "start_booking" },
        { label: "View Available Specialists", action: "show_services" }
      ]
    });
  }

  handleNewPatientGreeting() {
    this.pushBotMessage({
      text: "👋 **Welcome to CareBridge Health Network!**\n\nWe are delighted to care for you. Here is how our appointment request process works for new patients:",
      steps: [
        "1. **Choose a Location**: Palghar Central, Boisar Care Center, Vasai Care Center, or Nalasopara Care Center.",
        "2. **Select Service**: General Medicine, Pediatrics, Cardiology, Neurology, Women's Health, Preventive Health, etc.",
        "3. **Provide Contact Details**: Your name, phone number, and email.",
        "4. **Submit Request**: Our clinic front-desk team will review availability and contact you directly to confirm your appointment."
      ],
      meta: "Would you like to start your appointment request now?",
      chips: [
        { label: "Yes, Request Appointment", action: "start_booking_new" },
        { label: "Explore Locations First", action: "show_locations" },
        { label: "Explore Services First", action: "show_services" }
      ]
    });
  }

  handleExistingPatientSupport(input = "") {
    this.pushBotMessage({
      text: "🏥 **Existing Patient Services**\n\nWelcome back to CareBridge. For existing patients, I can assist you with:",
      list: [
        "📅 Submitting a new appointment request",
        "🔄 Submitting a rescheduling request",
        "❌ Submitting a cancellation request",
        "📍 Clinic locations & operational hours",
        "📋 General service information"
      ],
      meta: "⚠️ **Privacy Note**: To protect your health data, we do not request or process sensitive medical records, test results, or prescription refills through the chat. For medical queries, please consult your doctor directly.",
      chips: [
        { label: "Book New Appointment", action: "start_booking_existing" },
        { label: "Reschedule / Cancel", action: "reschedule_or_cancel" },
        { label: "Track Existing Request", action: "track_request" }
      ]
    });
  }

  startBookingFlow(initialPatientType = '') {
    this.bookingState = {
      inProgress: true,
      stepIndex: 0,
      data: {
        fullName: '',
        phone: '',
        email: '',
        patientType: initialPatientType || '',
        location: '',
        service: '',
        preferredDate: '',
        preferredTime: '',
        source: 'AI_ASSISTANT'
      }
    };

    if (initialPatientType) {
      this.bookingState.stepIndex = 1;
      this.askBookingStep(1);
    } else {
      this.askBookingStep(0);
    }
  }

  askBookingStep(stepIndex) {
    switch (stepIndex) {
      case 0:
        this.pushBotMessage({
          text: "Let's set up your appointment request! Are you a **New Patient** or an **Existing Patient**?",
          chips: [
            { label: "New Patient", value: "New Patient" },
            { label: "Existing Patient", value: "Existing Patient" }
          ]
        });
        break;

      case 1:
        this.pushBotMessage({
          text: `Great! What is the **Full Name** of the patient?`,
          meta: "Please enter first and last name."
        });
        break;

      case 2:
        this.pushBotMessage({
          text: `Thank you, ${this.bookingState.data.fullName}. What is your **Phone Number**?`,
          meta: "Our clinic team will use this number to contact you and confirm your visit."
        });
        break;

      case 3:
        this.pushBotMessage({
          text: "What is your **Email Address** for receiving the request summary?",
          meta: "e.g. name@example.com"
        });
        break;

      case 4:
        this.pushBotMessage({
          text: "Which **CareBridge Location** would you prefer?",
          chips: CAREBRIDGE_DATA.locations.map(loc => ({
            label: loc.name,
            value: loc.name
          }))
        });
        break;

      case 5:
        const selectedLoc = CAREBRIDGE_DATA.locations.find(
          l => l.name.toLowerCase() === (this.bookingState.data.location || '').toLowerCase()
        );
        const availableServices = selectedLoc
          ? selectedLoc.services
          : CAREBRIDGE_DATA.services.map(s => s.name);

        this.pushBotMessage({
          text: `Which **Service or Specialty** do you need at ${this.bookingState.data.location}?`,
          chips: availableServices.map(srv => ({
            label: srv,
            value: srv
          }))
        });
        break;

      case 6:
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(today);
        dayAfter.setDate(dayAfter.getDate() + 2);

        const formatDate = d => d.toISOString().split('T')[0];

        this.pushBotMessage({
          text: "What is your **Preferred Date** for the visit?",
          meta: "You can select a quick date below or type YYYY-MM-DD (e.g. " + formatDate(tomorrow) + ")",
          chips: [
            { label: `Tomorrow (${formatDate(tomorrow)})`, value: formatDate(tomorrow) },
            { label: `In 2 Days (${formatDate(dayAfter)})`, value: formatDate(dayAfter) },
            { label: "Next Monday", value: "Next Monday" }
          ]
        });
        break;

      case 7:
        this.pushBotMessage({
          text: "What **Time Slot** works best for you?",
          chips: [
            { label: "Morning (9:00 AM - 12:00 PM)", value: "Morning (9:00 AM - 12:00 PM)" },
            { label: "Afternoon (12:00 PM - 4:00 PM)", value: "Afternoon (12:00 PM - 4:00 PM)" },
            { label: "Evening (4:00 PM - 8:00 PM)", value: "Evening (4:00 PM - 8:00 PM)" }
          ]
        });
        break;
    }
  }

  handleBookingStep(input) {
    const state = this.bookingState;
    const step = state.stepIndex;

    switch (step) {
      case 0:
        if (input.toLowerCase().includes("new")) {
          state.data.patientType = "New Patient";
        } else if (input.toLowerCase().includes("exist")) {
          state.data.patientType = "Existing Patient";
        } else {
          state.data.patientType = input;
        }
        state.stepIndex = 1;
        this.askBookingStep(1);
        break;

      case 1:
        if (input.length < 2) {
          this.pushBotMessage({
            text: "Please provide a valid full name (at least 2 characters):"
          });
          return;
        }
        state.data.fullName = input;
        state.stepIndex = 2;
        this.askBookingStep(2);
        break;

      case 2:
        const cleanPhone = input.replace(/[^0-9+]/g, '');
        if (cleanPhone.length < 7) {
          this.pushBotMessage({
            text: "Please enter a valid phone number (e.g. +91 98765 43210):"
          });
          return;
        }
        state.data.phone = input;
        state.stepIndex = 3;
        this.askBookingStep(3);
        break;

      case 3:
        if (!input.includes('@') || !input.includes('.')) {
          this.pushBotMessage({
            text: "Please enter a valid email address (e.g., patient@example.com):"
          });
          return;
        }
        state.data.email = input;
        state.stepIndex = 4;
        this.askBookingStep(4);
        break;

      case 4:
        const matchedLoc = CAREBRIDGE_DATA.locations.find(
          l => l.name.toLowerCase().includes(input.toLowerCase()) || input.toLowerCase().includes(l.id)
        );
        state.data.location = matchedLoc ? matchedLoc.name : input;
        state.stepIndex = 5;
        this.askBookingStep(5);
        break;

      case 5:
        const matchedService = CAREBRIDGE_DATA.services.find(
          s => s.name.toLowerCase().includes(input.toLowerCase()) || input.toLowerCase().includes(s.slug || '')
        );
        state.data.service = matchedService ? matchedService.name : input;
        state.stepIndex = 6;
        this.askBookingStep(6);
        break;

      case 6:
        state.data.preferredDate = input;
        state.stepIndex = 7;
        this.askBookingStep(7);
        break;

      case 7:
        state.data.preferredTime = input;
        this.completeBookingFlow();
        break;
    }
  }

  async completeBookingFlow() {
    const finalData = { ...this.bookingState.data };
    this.bookingState.inProgress = false;

    try {
      this.pushBotMessage({
        text: "⏳ Submitting your appointment request to the CareBridge scheduling system..."
      });

      const response = await this.onBookingComplete(finalData);

      const appointmentRecord = response.appointment || {
        requestId: response.requestId || "CB-" + Math.floor(100000 + Math.random() * 900000),
        ...finalData,
        status: response.status || "PENDING"
      };

      this.pushBotMessage({
        type: 'appointment_submitted',
        isSuccess: true,
        text: "✅ **Your appointment request has been submitted. Our clinic team will contact you to confirm the appointment.**",
        appointment: appointmentRecord,
        meta: "Important: This is a request submission, not a final confirmation. Availability will be verified by the clinic scheduling team.",
        chips: [
          { label: "Track Request Status", action: "track_request" },
          { label: "View Clinic Hours", action: "show_locations" },
          { label: "Done", action: "reset_chat" }
        ]
      });
    } catch (err) {
      this.pushBotMessage({
        isAlert: true,
        alertLevel: 'warning',
        text: `⚠️ **Unable to submit request**: ${err.message || 'Please check your inputs and try again.'}`,
        chips: [
          { label: "Try Again", action: "start_booking" },
          { label: "Call Support", action: "call_support" }
        ]
      });
    }
  }

  handleLocationQuery(lower) {
    if (lower.includes("palghar")) {
      this.showLocationDetail("palghar");
    } else if (lower.includes("boisar")) {
      this.showLocationDetail("boisar");
    } else if (lower.includes("vasai")) {
      this.showLocationDetail("vasai");
    } else if (lower.includes("nalasopara")) {
      this.showLocationDetail("nalasopara");
    } else {
      this.pushBotMessage({
        type: 'locations_summary',
        text: "CareBridge operates 4 state-of-the-art care centers in Maharashtra:",
        locations: CAREBRIDGE_DATA.locations,
        chips: [
          { label: "Palghar Central", action: "loc_palghar" },
          { label: "Boisar Care Center", action: "loc_boisar" },
          { label: "Vasai Care Center", action: "loc_vasai" },
          { label: "Nalasopara Care Center", action: "loc_nalasopara" },
          { label: "Book at a Location", action: "start_booking" }
        ]
      });
    }
  }

  showLocationDetail(locId) {
    const loc = CAREBRIDGE_DATA.locations.find(l => l.id === locId);
    if (!loc) return;

    this.pushBotMessage({
      type: 'location_card',
      text: `📍 **${loc.name}** (${loc.tag})\n\n` +
            `🏢 **Address**: ${loc.address}\n` +
            `⏰ **Hours**:\n• ${loc.hours.weekdayText}\n• ${loc.hours.sundayText}\n` +
            `🩺 **Services Offered**: ${loc.services.join(', ')}\n` +
            `📞 **Direct Line**: ${loc.phone}`,
      chips: [
        { label: `Book at ${loc.name}`, action: `book_at_${loc.id}` },
        { label: "View All Clinics", action: "show_locations" }
      ]
    });
  }

  handleServiceQuery(lower) {
    const matched = CAREBRIDGE_DATA.services.filter(
      s => lower.includes(s.name.toLowerCase()) || lower.includes(s.slug || '')
    );

    if (matched.length > 0) {
      const srv = matched[0];
      this.pushBotMessage({
        text: `🩺 **${srv.name}**\n\n${srv.description}\n\n**Available At:**\n` +
              srv.availableAt.map(loc => `• ${loc}`).join('\n'),
        chips: [
          { label: `Book ${srv.name}`, action: "start_booking" },
          { label: "View All Services", action: "show_services" }
        ]
      });
    } else {
      this.pushBotMessage({
        type: 'services_summary',
        text: "CareBridge Health Network provides the following clinical services across our branches:",
        services: CAREBRIDGE_DATA.services,
        chips: [
          { label: "General Medicine", action: "srv_gm" },
          { label: "Cardiology", action: "srv_cardio" },
          { label: "Neurology", action: "srv_neuro" },
          { label: "Pediatrics", action: "srv_ped" },
          { label: "Women's Health", action: "srv_women" },
          { label: "Book Appointment", action: "start_booking" }
        ]
      });
    }
  }

  handleChipAction(action, value) {
    if (action === 'start_booking' || action === 'book_now') {
      this.startBookingFlow();
    } else if (action === 'start_booking_new') {
      this.startBookingFlow('New Patient');
    } else if (action === 'start_booking_existing') {
      this.startBookingFlow('Existing Patient');
    } else if (action === 'new_patient_info') {
      this.handleNewPatientGreeting();
    } else if (action === 'existing_patient_info') {
      this.handleExistingPatientSupport();
    } else if (action === 'show_locations') {
      this.handleLocationQuery("all");
    } else if (action === 'show_services') {
      this.handleServiceQuery("all");
    } else if (action === 'insurance_info') {
      this.pushUserMessage("Accepted insurance and fees?");
      this.handleUserInput("insurance and fee policy");
    } else if (action === 'faq_list') {
      this.pushBotMessage({
        text: "Here are common questions asked by our patients:",
        chips: [
          { label: "Do I need an appointment?", action: "faq_need_appt" },
          { label: "Do you accept walk-ins?", action: "faq_walkins" },
          { label: "Can I choose a doctor?", action: "faq_doctor" },
          { label: "How to cancel or reschedule?", action: "faq_cancel" },
          { label: "Do you provide emergency care?", action: "faq_emerg" }
        ]
      });
    } else if (action === 'faq_need_appt') {
      this.handleUserInput("Do I need an appointment?");
    } else if (action === 'faq_walkins') {
      this.handleUserInput("Do you accept walk-ins?");
    } else if (action === 'faq_doctor') {
      this.handleUserInput("Can I choose a doctor?");
    } else if (action === 'faq_cancel') {
      this.handleUserInput("Can I cancel or reschedule?");
    } else if (action === 'faq_emerg') {
      this.handleUserInput("Do you provide emergency care?");
    } else if (action === 'loc_palghar') {
      this.showLocationDetail('palghar');
    } else if (action === 'loc_boisar') {
      this.showLocationDetail('boisar');
    } else if (action === 'loc_vasai') {
      this.showLocationDetail('vasai');
    } else if (action === 'loc_nalasopara') {
      this.showLocationDetail('nalasopara');
    } else if (action.startsWith('book_at_')) {
      const locId = action.replace('book_at_', '');
      const loc = CAREBRIDGE_DATA.locations.find(l => l.id === locId);
      this.startBookingFlow();
      if (loc) {
        this.bookingState.data.location = loc.name;
      }
    } else if (action === 'reschedule_or_cancel') {
      this.pushBotMessage({
        text: "To reschedule or cancel an existing appointment request, please enter your Phone Number or 8-digit Request ID (e.g. CB-123456), or use our Appointment Tracker below.",
        chips: [
          { label: "Track My Request", action: "track_request" },
          { label: "Call Support: +91 22 4000 1000", action: "call_support" }
        ]
      });
    } else if (action === 'track_request') {
      window.dispatchEvent(new CustomEvent('carebridge:open-tracker'));
      this.pushBotMessage({
        text: "You can track and manage your request in our **Patient Self-Service Tracker** section on this page.",
        chips: [{ label: "Back to Main Menu", action: "reset_chat" }]
      });
    } else if (action === 'call_108') {
      window.location.href = "tel:108";
    } else if (action === 'call_support') {
      window.location.href = `tel:${CAREBRIDGE_DATA.network.phone.replace(/[^0-9+]/g, '')}`;
    } else if (action === 'reset_chat') {
      this.init();
    } else if (value) {
      this.handleUserInput(value);
    }
  }
}
