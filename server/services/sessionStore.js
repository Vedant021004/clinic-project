import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSIONS_FILE = path.resolve(__dirname, '../../data/sessions.json');

// Ensure data directory exists
const dataDir = path.dirname(SESSIONS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// In-memory cache synced with persistent JSON store
let sessionsCache = {};

// Load sessions from disk on startup
try {
  if (fs.existsSync(SESSIONS_FILE)) {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    sessionsCache = JSON.parse(raw);
  }
} catch (e) {
  console.warn('[SESSION_STORE] Initialized empty session store:', e.message);
  sessionsCache = {};
}

function persistToDisk() {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsCache, null, 2), 'utf-8');
  } catch (e) {
    console.error('[SESSION_STORE] Failed to persist sessions:', e.message);
  }
}

export function getSession(sessionId) {
  if (!sessionId) sessionId = `session_${Date.now()}`;
  if (!sessionsCache[sessionId]) {
    sessionsCache[sessionId] = {
      sessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [],
      appointmentState: {
        active: false,
        step: 'IDLE', // 'IDLE', 'COLLECTING', 'AWAITING_CONFIRMATION', 'SUBMITTED'
        patientType: null,
        fullName: null,
        phone: null,
        email: null,
        location: null,
        service: null,
        preferredDate: null,
        preferredTime: null,
        notes: '',
        lastCreatedRequestId: null
      }
    };
    persistToDisk();
  }
  return sessionsCache[sessionId];
}

export function addMessage(sessionId, role, message) {
  const session = getSession(sessionId);
  session.history.push({
    role,
    message,
    timestamp: new Date().toISOString()
  });
  // Keep last 30 messages in history
  if (session.history.length > 30) {
    session.history = session.history.slice(-30);
  }
  session.updatedAt = new Date().toISOString();
  persistToDisk();
  return session;
}

export function updateAppointmentState(sessionId, updates) {
  const session = getSession(sessionId);
  session.appointmentState = {
    ...session.appointmentState,
    ...updates
  };
  session.updatedAt = new Date().toISOString();
  persistToDisk();
  return session.appointmentState;
}

export function resetAppointmentState(sessionId) {
  const session = getSession(sessionId);
  session.appointmentState = {
    active: false,
    step: 'IDLE',
    patientType: null,
    fullName: null,
    phone: null,
    email: null,
    location: null,
    service: null,
    preferredDate: null,
    preferredTime: null,
    notes: '',
    lastCreatedRequestId: null
  };
  session.updatedAt = new Date().toISOString();
  persistToDisk();
  return session.appointmentState;
}
