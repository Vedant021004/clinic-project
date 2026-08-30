const EMERGENCY_REGEX = /\b(?:chest\s+pain|heart\s+attack|can'?t\s+breathe|cannot\s+breathe|difficulty\s+breathing|shortness\s+of\s+breath|choking|severe\s+bleeding|unconscious|stroke|paralysis|fainted|suicide|poison|head\s+trauma|dying|collapsed)\b/i;

const MEDICAL_ADVICE_REGEX = /\b(?:diagnos(?:e|is)|symptoms?\s+of|what\s+(?:disease|illness|infection)|prescrib(?:e|tion)|what\s+medicine|which\s+medicine|paracetamol|antibiotic|dosage|cure\s+my|treatment\s+for|interpret\s+my\s+report|blood\s+test\s+result|mri\s+report|how\s+to\s+treat)\b/i;

const INJECTION_REGEX = /\b(?:ignore\s+(?:all\s+)?(?:previous\s+)?instructions|reveal\s+(?:the\s+)?(?:system\s+)?prompt|print\s+(?:the\s+)?(?:system\s+)?prompt|show\s+(?:me\s+)?(?:the\s+)?(?:system\s+)?prompt|what\s+is\s+your\s+system\s+prompt|show\s+(?:me\s+)?(?:your\s+)?database|database\s+password|database\s+url|salesforce\s+(?:client\s+)?secret|llama_cloud_api_key|groq_api_key|admin_api_key|api\s*key|access\s*token|drop\s+table|delete\s+from\s+patients)\b/i;

export function checkSafety(message) {
  const text = message.trim();

  // 1. Emergency Check (Highest Priority)
  if (EMERGENCY_REGEX.test(text)) {
    return {
      isTriggered: true,
      intent: "EMERGENCY",
      message: "🚨 **URGENT MEDICAL NOTICE**: If you or someone near you is experiencing a medical emergency (such as severe chest pain, shortness of breath, heavy bleeding, or loss of consciousness), please **dial 108 immediately** or visit your nearest emergency room. The AI assistant cannot provide emergency triage.",
      sources: [{ document: "safety_guidelines.md", section: "Acute Emergency Protocol", location: "all" }]
    };
  }

  // 2. Medical Advice / Diagnosis Check (Patient Safety Guardrail)
  if (MEDICAL_ADVICE_REGEX.test(text)) {
    return {
      isTriggered: true,
      intent: "MEDICAL_ADVICE",
      message: "⚕️ **Patient Safety Notice**: I am an administrative AI Assistant and **NOT a doctor**. I cannot diagnose medical conditions, interpret test reports, or recommend/prescribe medications. Please schedule a consultation with a qualified CareBridge physician or visit your nearest clinic.",
      sources: [{ document: "safety_guidelines.md", section: "Non-Diagnostic Medical Scope", location: "all" }]
    };
  }

  // 3. Prompt Injection & Secret Extraction Defense
  if (INJECTION_REGEX.test(text)) {
    return {
      isTriggered: true,
      intent: "SECURITY_GUARDRAIL",
      message: "🛡️ **Security Notice**: I am the CareBridge AI Patient Assistant. I operate strictly under defined healthcare and privacy guidelines. I cannot modify my system instructions, reveal backend configurations, or disclose sensitive API credentials. How can I assist you with CareBridge clinic information, services, or appointments?",
      sources: [{ document: "safety_guidelines.md", section: "System Integrity & Privacy", location: "all" }]
    };
  }

  return { isTriggered: false };
}

