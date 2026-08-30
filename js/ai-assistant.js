/**
 * CareBridge Health Network - AI Patient Assistant Engine
 * Handles conversational intake, multi-step booking, new/existing patient flows,
 * emergency triaging, safety guardrails, and knowledge retrieval.
 */

import { CAREBRIDGE_DATA } from './data.js';

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
      // Strip markdown/html tags for clean voice output
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

    // 1. Check for Critical Emergency Symptoms
    if (this.isEmergency(input)) {
      this.handleEmergencyResponse();
      return;
    }

    // 2. Check for Medical Advice / Diagnosis / Prescriptions Guardrail
    if (this.isMedicalAdviceRequest(input)) {
      this.handleMedicalAdviceGuardrail();
      return;
    }

    // 3. Handle Active Booking Conversation State
    if (this.bookingState.inProgress) {
      this.handleBookingStep(input);
      return;
    }

    // 4. Intent Classification & Knowledge Retrieval
    const lower = input.toLowerCase();

    // Trigger booking
    if (
      lower.includes("book") ||
      lower.includes("appointment") ||
      lower.includes("schedule a visit") ||
      lower.includes("consultation request") ||
      lower.includes("take appointment")
    ) {
      this.startBookingFlow();
      return;
    }

    // New Patient
    if (lower.includes("new patient") || lower.includes("first time") || lower.includes("new here")) {
      this.handleNewPatientGreeting();
      return;
    }

    // Existing Patient (Reschedule / Cancel / Lookup)
    if (
      lower.includes("existing patient") ||
      lower.includes("reschedule") ||
      lower.includes("cancel appointment") ||
      lower.includes("change time") ||
      lower.includes("already registered")
    ) {
      this.handleExistingPatientSupport(input);
      return;
    }

    // Location / Hours inquiries
    if (
      lower.includes("location") ||
      lower.includes("address") ||
      lower.includes("hours") ||
      lower.includes("timing") ||
      lower.includes("open") ||
      lower.includes("palghar") ||
      lower.includes("boisar") ||
      lower.includes("vasai") ||
      lower.includes("nalasopara")
    ) {
      this.handleLocationQuery(lower);
      return;
    }

    // Services inquiry
    if (
      lower.includes("service") ||
      lower.includes("cardiology") ||
      lower.includes("neurology") ||
      lower.includes("pediatric") ||
      lower.includes("women") ||
      lower.includes("checkup") ||
      lower.includes("diagnostics") ||
      lower.includes("specialist")
    ) {
      this.handleServiceQuery(lower);
      return;
    }

    // Walk-ins
    if (lower.includes("walk in") || lower.includes("walk-in") || lower.includes("without appointment")) {
      this.pushBotMessage({
        text: "Walk-in availability may vary by location and service. Please contact your preferred clinic location before visiting without an appointment to check real-time doctor availability.",
        chips: [
          { label: "Request Appointment", action: "start_booking" },
          { label: "Call Support: +91 22 4000 1000", action: "call_support" }
        ]
      });
      return;
    }

    // Doctor choice
    if (lower.includes("choose doctor") || lower.includes("which doctor") || lower.includes("doctor name")) {
      this.pushBotMessage({
        text: "Doctor availability depends on the selected specialty service and clinic location. Our clinic scheduling team will confirm available doctors when processing your appointment request.",
        chips: [
          { label: "Submit Request", action: "start_booking" },
          { label: "View Locations", action: "show_locations" }
        ]
      });
      return;
    }

    // Insurance inquiry
    if (lower.includes("insurance") || lower.includes("tpa") || lower.includes("cashless") || lower.includes("mediclaim")) {
      this.pushBotMessage({
        text: "Insurance and cashless availability can vary by location, service, and insurer. We do not guarantee insurance coverage online. Please contact our clinic team directly at +91 22 4000 1000 to confirm your specific insurance policy eligibility.",
        chips: [
          { label: "Book Appointment", action: "start_booking" },
          { label: "Contact Clinic", action: "contact_info" }
        ]
      });
      return;
    }

    // Payment / Pricing inquiry
    if (lower.includes("price") || lower.includes("cost") || lower.includes("fee") || lower.includes("charges") || lower.includes("payment")) {
      this.pushBotMessage({
        text: "Accepted payment methods and consultation costs may vary by service and clinic location. To ensure transparency, we do not estimate unverified rates. Our clinic team will provide you with the latest and exact pricing when confirming your visit.",
        chips: [
          { label: "Request Appointment", action: "start_booking" },
          { label: "View Services", action: "show_services" }
        ]
      });
      return;
    }

    // Contact info
    if (lower.includes("contact") || lower.includes("phone") || lower.includes("call") || lower.includes("email")) {
      this.pushBotMessage({
        text: `You can reach CareBridge Health Network Patient Support by phone at **${CAREBRIDGE_DATA.network.phone}** or by email at **${CAREBRIDGE_DATA.network.email}** (demonstration contact details).`,
        chips: [
          { label: "Request an Appointment", action: "start_booking" },
          { label: "Clinic Locations", action: "show_locations" }
        ]
      });
      return;
    }

    // General FAQ or Fallback
    const matchedFaq = this.findFaqMatch(lower);
    if (matchedFaq) {
      this.pushBotMessage({
        text: matchedFaq.answer,
        chips: [
          { label: "Book Appointment", action: "start_booking" },
          { label: "Ask Another Question", action: "faq_list" }
        ]
      });
      return;
    }

    // General fallback
    this.pushBotMessage({
      text: "I am CareBridge's AI Patient Assistant. I can assist you with clinic hours, location details, appointment requests, services, or policies.",
      meta: "Please note: I cannot provide medical diagnosis, treatment advice, or process sensitive medical records.",
      chips: [
        { label: "Request Appointment", action: "start_booking" },
        { label: "Clinic Locations & Hours", action: "show_locations" },
        { label: "Our Medical Services", action: "show_services" },
        { label: "Frequently Asked Questions", action: "faq_list" }
      ]
    });
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
        preferredTime: ''
      }
    };

    if (initialPatientType) {
      this.bookingState.stepIndex = 1; // skip patient type if pre-selected
      this.askBookingStep(1);
    } else {
      this.askBookingStep(0);
    }
  }

  askBookingStep(stepIndex) {
    switch (stepIndex) {
      case 0: // Patient Type
        this.pushBotMessage({
          text: "Let's set up your appointment request! Are you a **New Patient** or an **Existing Patient**?",
          chips: [
            { label: "New Patient", value: "New Patient" },
            { label: "Existing Patient", value: "Existing Patient" }
          ]
        });
        break;

      case 1: // Full Name
        this.pushBotMessage({
          text: `Great! What is the **Full Name** of the patient?`,
          meta: "Please enter first and last name."
        });
        break;

      case 2: // Phone
        this.pushBotMessage({
          text: `Thank you, ${this.bookingState.data.fullName}. What is your **Phone Number**?`,
          meta: "Our clinic team will use this number to contact you and confirm your visit."
        });
        break;

      case 3: // Email
        this.pushBotMessage({
          text: "What is your **Email Address** for receiving the request summary?",
          meta: "e.g. name@example.com"
        });
        break;

      case 4: // Location
        this.pushBotMessage({
          text: "Which **CareBridge Location** would you prefer?",
          chips: CAREBRIDGE_DATA.locations.map(loc => ({
            label: loc.name,
            value: loc.name
          }))
        });
        break;

      case 5: // Service
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

      case 6: // Preferred Date
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

      case 7: // Preferred Time
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
      case 0: // Patient Type
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

      case 1: // Full Name
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

      case 2: // Phone
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

      case 3: // Email
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

      case 4: // Location
        const matchedLoc = CAREBRIDGE_DATA.locations.find(
          l => l.name.toLowerCase().includes(input.toLowerCase()) || input.toLowerCase().includes(l.id)
        );
        if (matchedLoc) {
          state.data.location = matchedLoc.name;
        } else {
          state.data.location = input;
        }
        state.stepIndex = 5;
        this.askBookingStep(5);
        break;

      case 5: // Service
        const matchedService = CAREBRIDGE_DATA.services.find(
          s => s.name.toLowerCase().includes(input.toLowerCase()) || input.toLowerCase().includes(s.name.toLowerCase())
        );
        state.data.service = matchedService ? matchedService.name : input;
        state.stepIndex = 6;
        this.askBookingStep(6);
        break;

      case 6: // Date
        state.data.preferredDate = input;
        state.stepIndex = 7;
        this.askBookingStep(7);
        break;

      case 7: // Time
        state.data.preferredTime = input;
        this.completeBookingFlow();
        break;
    }
  }

  completeBookingFlow() {
    const finalData = { ...this.bookingState.data };
    const requestId = 'CB-' + Math.floor(100000 + Math.random() * 900000);

    const appointmentRecord = {
      requestId: requestId,
      ...finalData,
      status: 'Request Submitted (Pending Clinic Confirmation)',
      createdAt: new Date().toISOString()
    };

    this.bookingState.inProgress = false;

    // Trigger appointment callback to persist and update UI
    this.onBookingComplete(appointmentRecord);

    // Render receipt and mandatory disclaimer
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
      s => lower.includes(s.name.toLowerCase()) || lower.includes(s.id)
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

  findFaqMatch(query) {
    return CAREBRIDGE_DATA.faq.find(f => {
      const qWords = f.question.toLowerCase().split(' ').filter(w => w.length > 3);
      const matches = qWords.filter(w => query.includes(w));
      return matches.length >= 2;
    });
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
      // Scroll to tracker section or trigger event
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
