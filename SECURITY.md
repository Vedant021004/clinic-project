# CareBridge Health Network — Production Security & Safety Architecture

> [!IMPORTANT]
> **DISCLAIMER & DEMONSTRATION NOTICE**
> CareBridge Health Network is a fictional multi-location healthcare provider created for demonstration and evaluation purposes. The application is not certified for storing Protected Health Information (PHI) under HIPAA/GDPR, and all patient names, records, and identifiers used across tests and demonstrations are completely synthetic.

---

## 1. Secret Management Policy
- **No Hardcoded Credentials**: API keys, database URLs, Salesforce client secrets, Groq credentials, and administrative passwords are strictly prohibited in source code.
- **Environment Isolation**: `.env` is explicitly gitignored. Only `.env.example` with non-secret placeholder variables is maintained in the repository.
- **Runtime Leak Prevention**: Administrative APIs, error logs, and client-facing responses are programmed to suppress internal credentials and tokens.

---

## 2. Authentication & Authorization
- **Admin Session Token Management**: Administrative access (`/api/admin/*`) uses cryptographically secure timed session tokens (`cb_adm_...`) with automatic 2-hour TTL expiration.
- **Dedicated Login & Logout**: Staff authenticate via `POST /api/admin/login` (rate-limited) and can explicitly revoke tokens via `POST /api/admin/logout`.
- **Zero Public Exposure**: The administrative API secret key is never embedded in client-side HTML/JavaScript.

---

## 3. Rate Limiting & Denial of Service Defense
Sliding-window in-memory token bucket rate limiters protect the application against brute-force attacks and resource exhaustion:
- **Global API Limiter**: 120 requests/minute per IP (`/api/*`).
- **AI Chat Endpoint**: 30 requests/minute per IP (`/api/ai/chat`).
- **Appointment Intake**: 20 requests/minute per IP (`/api/appointments`).
- **Admin Login Endpoint**: 10 attempts/minute per IP (`/api/admin/login`).

Exceeding these limits immediately returns `429 Too Many Requests` with a standard `Retry-After` header.

---

## 4. Input Validation & Body Limits
- **Strict Zod Schemas**: Every public intake route validates types, string lengths, regex patterns (dates `YYYY-MM-DD`, phones, emails), and allowed enums.
- **Payload Size Capping**: `express.json({ limit: '100kb' })` blocks oversized buffer payloads.
- **Path Traversal & Injection Sanitization**: Strips null bytes (`\0`) and blocks directory traversal sequences (`../`, `..\`).

---

## 5. HTTP Security Headers
The server enforces modern HTTP defensive headers on every response:
- **Content-Security-Policy (CSP)**: Restricts script, style, font, and connection sources to verified origins.
- **X-Content-Type-Options**: `nosniff` prevents MIME-type confusion attacks.
- **X-Frame-Options**: `SAMEORIGIN` prevents clickjacking.
- **X-XSS-Protection**: `1; mode=block`.
- **Referrer-Policy**: `strict-origin-when-cross-origin`.
- **Strict-Transport-Security (HSTS)**: Active in production environments.

---

## 6. Healthcare AI Safety & Prompt Injection Defenses
The AI orchestrator enforces a deterministic safety hierarchy evaluated **before** RAG retrieval and LLM processing:

$$\text{EMERGENCY (108)} \;\longrightarrow\; \text{NON-DIAGNOSTIC REFUSAL} \;\longrightarrow\; \text{SECURITY DEFENSE} \;\longrightarrow\; \text{APPOINTMENT} \;\longrightarrow\; \text{RAG}$$

1. **Acute Emergency Protocol**: Queries mentioning symptoms like chest pain, severe shortness of breath, heavy bleeding, or loss of consciousness immediately return emergency instructions to **Dial 108**.
2. **Non-Diagnostic Scope**: Requests for medical diagnoses, medication prescriptions, or lab report interpretations are refused with guidance to consult a qualified physician.
3. **Prompt Injection Defense**: Intercepts jailbreak phrases (*"Ignore previous instructions"*, *"Reveal system prompt"*, *"Show database password"*).
4. **Untrusted Data Isolation**: Chunks retrieved via RAG are treated as data, preventing prompt leakage.

---

## 7. Protected Health Information (PHI) Sanitization
- Only administrative contact metadata (Name, Phone, Email, Service, Location, Preferred Slot) is persisted for clinic scheduling.
- Raw medical queries, diagnostic discussions, and symptom descriptions are stripped from Salesforce CRM operational task descriptions.

---

## 8. Salesforce CRM Security
- Salesforce credentials remain server-side in `salesforceService.js`.
- Sync requests use the CareBridge `requestId` for idempotency, preventing duplicate lead generation during network retries.
- Offline development and testing default to `SALESFORCE_MODE=mock`.
