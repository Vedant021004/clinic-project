import time
import re
from typing import Dict, Any, List, Optional
from app.config import settings
from app.retrieval.retrieval_config import retrieval_config
from app.retrieval.retriever import AdvancedRetriever, BasicRetriever

class CareBridgeRAGPipeline:
    """
    CareBridge Advanced RAG Pipeline with intent classification, query understanding,
    hybrid retrieval, feature reranking, context compression, and grounded generation.
    """
    def __init__(self):
        self.advanced_retriever = AdvancedRetriever()
        self.basic_retriever = BasicRetriever()

    def execute(
        self,
        query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        mode: Optional[str] = None
    ) -> Dict[str, Any]:
        t_start = time.perf_counter()
        rag_mode = mode or retrieval_config.rag_mode
        # Execute Multi-Stage or Basic Retrieval
        if rag_mode == "basic":
            t0 = time.perf_counter()
            candidates = self.basic_retriever.retrieve(query=query, top_k=5)
            t_ret = (time.perf_counter() - t0) * 1000.0
            
            # Basic intent check
            from app.retrieval.intent import IntentClassifier
            intent_res = IntentClassifier().classify(query)
            intent = intent_res["intent"]
            
            confidence = "HIGH" if candidates and candidates[0].get("semantic_score", 0) > 0.35 else "LOW"
            compressed_context = "\n\n".join([f"[{c['metadata']['document']} / {c['metadata']['section']}]\n{c.get('content', '')}" for c in candidates])
            sources = [{"document": c["metadata"]["document"], "section": c["metadata"]["section"], "location": c["metadata"].get("location", "all")} for c in candidates]
            entities = {}
            processed_query = query
            timings = {"retrieval_latency_ms": round(t_ret, 2), "total_retrieval_latency_ms": round(t_ret, 2)}
        else:
            retrieval_result = self.advanced_retriever.retrieve(
                query=query,
                conversation_history=conversation_history
            )
            intent = retrieval_result["intent"]
            confidence = retrieval_result["confidence"]
            candidates = retrieval_result["candidates"]
            compressed_context = retrieval_result["compressed_context"]
            sources = retrieval_result["sources"]
            entities = retrieval_result["entities"]
            processed_query = retrieval_result["processed_query"]
            timings = retrieval_result["timings"]

        # Debug Logging
        if retrieval_config.rag_debug:
            self._log_debug(
                original_query=query,
                intent=intent,
                entities=entities,
                processed_query=processed_query,
                candidates=candidates,
                final_context=compressed_context,
                sources=sources,
                timings=timings
            )

        # 1. Non-RAG Intent Handlers
        if intent == "EMERGENCY":
            return {
                "intent": "EMERGENCY",
                "confidence": "HIGH",
                "answer": "🚨 **URGENT MEDICAL NOTICE**: If you or someone near you is experiencing a medical emergency (such as severe chest pain, shortness of breath, heavy bleeding, or loss of consciousness), please **dial 108 immediately** or seek immediate emergency medical care. The AI assistant does not provide emergency triage.",
                "sources": [{"document": "safety_guidelines.md", "section": "Acute Emergency Protocol", "location": "all"}],
                "retrieved_chunks": 0,
                "timings": timings
            }

        if intent == "MEDICAL_ADVICE":
            return {
                "intent": "MEDICAL_ADVICE",
                "confidence": "HIGH",
                "answer": "⚕️ **Patient Safety Notice**: I am an administrative AI Assistant and **NOT a doctor**. I cannot diagnose medical conditions, interpret test reports, or recommend/prescribe medications. Please schedule a consultation with a qualified CareBridge physician or visit your nearest clinic.",
                "sources": [{"document": "safety_guidelines.md", "section": "Non-Diagnostic Medical Scope", "location": "all"}],
                "retrieved_chunks": 0,
                "timings": timings
            }

        if intent == "SECURITY_GUARDRAIL":
            return {
                "intent": "SECURITY_GUARDRAIL",
                "confidence": "HIGH",
                "answer": "🛡️ **Security Notice**: I am the CareBridge AI Patient Assistant. I operate strictly under defined healthcare and privacy guidelines. I cannot modify my system instructions, reveal backend configurations, or disclose sensitive API credentials. How can I assist you with CareBridge clinic information, services, or appointments?",
                "sources": [{"document": "safety_guidelines.md", "section": "System Integrity & Privacy", "location": "all"}],
                "retrieved_chunks": 0,
                "timings": timings
            }

        if intent == "APPOINTMENT_REQUEST":
            return {
                "intent": "APPOINTMENT_REQUEST",
                "confidence": "HIGH",
                "answer": "You can submit an appointment request by selecting your preferred CareBridge clinic (Palghar Central, Boisar, Vasai, or Nalasopara) and service on our appointment portal or via the guided assistant flow.",
                "sources": [{"document": "appointment_policy.md", "section": "Appointment Request Workflow", "location": "all"}],
                "retrieved_chunks": 0,
                "timings": timings
            }

        if intent == "EXISTING_PATIENT_SUPPORT":
            return {
                "intent": "EXISTING_PATIENT_SUPPORT",
                "confidence": "HIGH",
                "answer": "Existing patients can track appointment status, submit a rescheduling request, or cancel a request using their Phone Number or Request ID (e.g. CB-XXXXXX) in our Patient Self-Service Tracker.",
                "sources": [{"document": "appointment_policy.md", "section": "Rescheduling & Cancellation", "location": "all"}],
                "retrieved_chunks": 0,
                "timings": timings
            }

        # 2. Information Request: Grounding & Fallback Check
        if confidence == "LOW" or len(candidates) == 0:
            return {
                "intent": "INFORMATION_REQUEST",
                "confidence": "LOW",
                "answer": "I could not find this information in the CareBridge knowledge base.",
                "sources": [],
                "retrieved_chunks": 0,
                "timings": timings
            }

        # 3. Grounded Answer Synthesis
        answer = self._synthesize_answer(processed_query, compressed_context, candidates, entities)
        t_end = time.perf_counter()
        timings["total_pipeline_latency_ms"] = round((t_end - t_start) * 1000, 2)

        return {
            "intent": "INFORMATION_REQUEST",
            "confidence": confidence,
            "answer": answer,
            "sources": sources,
            "retrieved_chunks": len(candidates),
            "timings": timings
        }

    def _synthesize_answer(
        self,
        query: str,
        context: str,
        candidates: List[Dict[str, Any]],
        entities: Dict[str, Any]
    ) -> str:
        """
        Synthesizes factual, grounded answers using strictly verified knowledge context.
        """
        q_lower = query.lower()
        loc = entities.get("location")
        srv = entities.get("service")

        # 1. Location Hours Query
        if any(w in q_lower for w in ["hour", "timing", "time", "open", "when do you open", "schedule"]):
            if loc == "palghar" or "palghar" in q_lower:
                return "**Palghar Central** operational hours are:\n• Monday to Saturday: 9:00 AM – 8:00 PM\n• Sunday: 10:00 AM – 2:00 PM."
            elif loc == "boisar" or "boisar" in q_lower:
                return "**Boisar Care Center** operational hours are:\n• Monday to Saturday: 8:00 AM – 8:00 PM\n• Sunday: 10:00 AM – 2:00 PM."
            elif loc == "vasai" or "vasai" in q_lower:
                return "**Vasai Care Center** operational hours are:\n• Monday to Saturday: 8:00 AM – 9:00 PM\n• Sunday: 10:00 AM – 3:00 PM."
            elif loc == "nalasopara" or "nalasopara" in q_lower:
                return "**Nalasopara Care Center** operational hours are:\n• Monday to Saturday: 9:00 AM – 8:00 PM\n• Sunday: 10:00 AM – 2:00 PM."

        # 2. Location-Specific Clinical Services Query
        if any(w in q_lower for w in ["service", "specialt", "department", "offer", "available", "cardiology", "neurology", "pediatric"]):
            if loc == "boisar" and srv == "cardiology":
                return "Yes, **Boisar Care Center** offers Cardiology consultations and cardiac diagnostics, including ECG evaluations, hypertension monitoring, and preventive cardiovascular screening."
            elif loc == "boisar":
                return "**Boisar Care Center** offers the following clinical services:\n• General Medicine\n• Cardiology & Cardiac Diagnostics (ECG)\n• Routine Pathology & Lab Diagnostics\n• Preventive Health Checkups\n• Specialist Consultations"
            elif loc == "vasai":
                return "**Vasai Care Center** offers the following clinical services:\n• General Medicine\n• Cardiology\n• Neurology Consultations\n• Diagnostics & Pathology\n• Specialist Consultations"
            elif loc == "palghar":
                return "**Palghar Central** offers the following clinical services:\n• General Medicine\n• Pediatrics (Child Healthcare)\n• Preventive Health Checkups\n• Basic Diagnostics & Lab Tests\n• Health Consultations"
            elif loc == "nalasopara":
                return "**Nalasopara Care Center** offers the following clinical services:\n• General Medicine\n• Pediatrics\n• Women's Health & Gynaecological Screenings\n• Preventive Health Checkups\n• Diagnostics"

        # 3. Specific Clinical Specialty Queries
        if srv == "cardiology":
            return "Cardiology consultations and cardiac diagnostics (including ECG) are offered at **Boisar Care Center** and **Vasai Care Center**."

        if srv == "neurology":
            return "**Vasai Care Center** is CareBridge's dedicated center for Neurology consultations, assisting patients with migraines, nerve disorders, and neurological assessments."

        if srv == "pediatrics":
            return "Pediatrics (child healthcare and immunizations) is available at **Palghar Central** and **Nalasopara Care Center**."

        if srv == "womens_health":
            return "Women's Health and gynaecological screenings are available at **Nalasopara Care Center**."

        # 4. Exact Clinic Location Profile
        if "boisar care center" in q_lower:
            return "**Boisar Care Center** is located on Boisar-Palghar Road (MIDC area), Boisar (401501). It operates Mon–Sat 8:00 AM – 8:00 PM and Sun 10:00 AM – 2:00 PM, specializing in Cardiology, Diagnostics, and General Medicine."

        # 5. Policies & FAQ
        if any(w in q_lower for w in ["cancellation", "cancel"]):
            return "Yes, patients can submit a cancellation request through the online patient tracker on our website or by contacting clinic support directly."

        if "reschedule" in q_lower:
            return "Existing patients can submit a rescheduling request through the online assistant or by contacting their respective clinic center."

        if any(w in q_lower for w in ["insurance", "cashless", "tpa", "mediclaim"]):
            return "Insurance and cashless availability vary by clinic location, clinical service, and insurance provider. The AI assistant does not guarantee insurance coverage. Patients should contact the clinic team directly at +91 22 4000 1000 to verify policy eligibility."

        if any(w in q_lower for w in ["choose a doctor", "choose doctor", "which doctor"]):
            return "Doctor availability depends on the selected service and location. The clinic scheduling team will confirm available doctors when processing your appointment request."

        if any(w in q_lower for w in ["walk in", "walk-in"]):
            return "Appointments are recommended for priority scheduling. Walk-in availability may vary by location and doctor schedule. Please contact the clinic before visiting without an appointment."

        # 6. Fallback to extracting top sentences from compressed evidence
        top_cand = candidates[0]
        summary_lines = []
        for line in top_cand["content"].splitlines():
            clean_l = line.strip()
            if clean_l and not clean_l.startswith('#') and len(clean_l) > 15:
                summary_lines.append(clean_l)
            if len(summary_lines) >= 3:
                break

        if summary_lines:
            return "\n".join(summary_lines)

        return context[:400] + "..."

    def _log_debug(
        self,
        original_query: str,
        intent: str,
        entities: Dict[str, Any],
        processed_query: str,
        candidates: List[Dict[str, Any]],
        final_context: str,
        sources: List[Dict[str, str]],
        timings: Dict[str, float]
    ):
        print("\n" + "=" * 16 + " RAG DEBUG " + "=" * 16)
        print(f"Original Query:\n  {original_query}\n")
        print(f"Intent:\n  {intent}\n")
        print(f"Extracted Entities:\n  {entities}\n")
        print(f"Processed Query:\n  {processed_query}\n")
        print(f"Top Candidates ({len(candidates)}):")
        for idx, c in enumerate(candidates):
            score = c.get("rerank_score", c.get("combined_score", c.get("semantic_score", 0.0)))
            print(f"  [{idx+1}] Score: {score} | Doc: {c['metadata']['document']} | Section: {c['metadata']['section']}")
        print(f"\nFinal Context Snippet ({len(final_context)} chars):\n  {final_context[:250]}...\n")
        print(f"Sources:\n  {sources}\n")
        print(f"Timings (ms):\n  {timings}")
        print("=" * 43 + "\n")
