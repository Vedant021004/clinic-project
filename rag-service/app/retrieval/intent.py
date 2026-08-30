import re
from typing import Dict, Any

class IntentClassifier:
    """
    Lightweight, deterministic, high-accuracy Intent Classifier for CareBridge.
    Designed with a modular interface so it can later be augmented with an LLM or specialized classifier.
    """
    
    EMERGENCY_PATTERNS = [
        r"\bchest\s+pain\b", r"\bheart\s+attack\b", r"\bcan'?t\s+breathe\b",
        r"\bcannot\s+breathe\b", r"\bdifficulty\s+breathing\b", r"\bshortness\s+of\s+breath\b",
        r"\bchoking\b", r"\bsevere\s+bleeding\b", r"\bunconscious\b", r"\bstroke\b",
        r"\bparalysis\b", r"\bfainted\b", r"\bsuicide\b", r"\bpoison\b", r"\bhead\s+trauma\b",
        r"\bsevere\s+burn\b", r"\bdying\b", r"\bcollapsed\b"
    ]
    
    MEDICAL_ADVICE_PATTERNS = [
        r"\bdiagnos(?:e|is)\b", r"\bsymptoms?\s+of\b", r"\bwhat\s+(?:disease|illness|infection)\b",
        r"\bprescrib(?:e|tion)\b", r"\bwhat\s+medicine\b", r"\bwhich\s+medicine\b",
        r"\bparacetamol\b", r"\bantibiotic\b", r"\bdosage\b", r"\bcure\s+my\b",
        r"\btreatment\s+for\b", r"\binterpret\s+my\s+report\b", r"\bblood\s+test\s+result\b",
        r"\bmri\s+report\b", r"\bct\s+scan\s+report\b", r"\bhow\s+to\s+treat\b"
    ]
    
    BOOKING_PATTERNS = [
        r"\bi\s+(?:want|need|would\s+like)\s+to\s+book\b",
        r"\bi\s+(?:want|need|would\s+like)\s+to\s+schedule\b",
        r"\bbook\s+(?:an\s+)?appointment\s+(?:for|at|with)\b",
        r"\breserve\s+(?:a\s+)?slot\b"
    ]
    
    EXISTING_PATIENT_PATTERNS = [
        r"\bi\s+(?:want|need)\s+to\s+reschedule\b",
        r"\bplease\s+reschedule\s+my\b",
        r"\bchange\s+my\s+appointment\s+(?:date|time)\b",
        r"\bcancel\s+my\s+appointment\s+(?:with|for|at)\b",
        r"\btrack\s+my\s+request\s+cb-\w+\b"
    ]

    SECURITY_GUARDRAIL_PATTERNS = [
        r"\bignore\s+(?:all\s+)?(?:previous\s+)?instructions\b",
        r"\breveal\s+(?:the\s+)?(?:system\s+)?prompt\b",
        r"\bprint\s+(?:the\s+)?(?:system\s+)?prompt\b",
        r"\bshow\s+(?:me\s+)?(?:the\s+)?(?:system\s+)?prompt\b",
        r"\bdatabase\s+(?:password|url|credentials)\b",
        r"\bsalesforce\s+(?:client\s+)?secret\b",
        r"\b(?:groq|llama_cloud)_api_key\b"
    ]

    def classify(self, query: str) -> Dict[str, Any]:
        q_clean = query.strip().lower()

        # 1. Emergency Check (Highest Priority)
        for pat in self.EMERGENCY_PATTERNS:
            if re.search(pat, q_clean):
                return {
                    "intent": "EMERGENCY",
                    "confidence": 1.0,
                    "matched_pattern": pat
                }

        # 2. Medical Advice / Prescription Check (Safety Guardrail)
        for pat in self.MEDICAL_ADVICE_PATTERNS:
            if re.search(pat, q_clean):
                return {
                    "intent": "MEDICAL_ADVICE",
                    "confidence": 0.95,
                    "matched_pattern": pat
                }

        # 3. Security Guardrail Check (Prompt Injection Defense)
        for pat in self.SECURITY_GUARDRAIL_PATTERNS:
            if re.search(pat, q_clean):
                return {
                    "intent": "SECURITY_GUARDRAIL",
                    "confidence": 1.0,
                    "matched_pattern": pat
                }

        # 3. Appointment Booking Check
        for pat in self.BOOKING_PATTERNS:
            if re.search(pat, q_clean):
                return {
                    "intent": "APPOINTMENT_REQUEST",
                    "confidence": 0.90,
                    "matched_pattern": pat
                }

        # 4. Existing Patient Support Check
        for pat in self.EXISTING_PATIENT_PATTERNS:
            if re.search(pat, q_clean):
                return {
                    "intent": "EXISTING_PATIENT_SUPPORT",
                    "confidence": 0.90,
                    "matched_pattern": pat
                }

        # 5. Default to Information Request
        return {
            "intent": "INFORMATION_REQUEST",
            "confidence": 0.85,
            "matched_pattern": "default"
        }
