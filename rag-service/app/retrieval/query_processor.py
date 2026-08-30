import re
from typing import Dict, Any, Optional, List

class QueryProcessor:
    """
    Query Understanding and Entity Extraction engine.
    Normalizes entities and enriches queries with multi-turn conversation context.
    """
    
    LOCATION_MAP = {
        "palghar": "palghar",
        "palghar central": "palghar",
        "palghar clinic": "palghar",
        "boisar": "boisar",
        "boisar care center": "boisar",
        "boisar clinic": "boisar",
        "vasai": "vasai",
        "vasai care center": "vasai",
        "vasai clinic": "vasai",
        "nalasopara": "nalasopara",
        "nalasopara care center": "nalasopara",
        "nalasopara west": "nalasopara"
    }

    SERVICE_MAP = {
        "cardiology": "cardiology",
        "cardiologist": "cardiology",
        "heart": "cardiology",
        "cardiac": "cardiology",
        "ecg": "cardiology",
        "neurology": "neurology",
        "neurologist": "neurology",
        "brain": "neurology",
        "migraine": "neurology",
        "pediatrics": "pediatrics",
        "pediatric": "pediatrics",
        "pediatrician": "pediatrics",
        "child": "pediatrics",
        "children": "pediatrics",
        "women": "womens_health",
        "women's health": "womens_health",
        "gynaecology": "womens_health",
        "gynecology": "womens_health",
        "pcos": "womens_health",
        "pcod": "womens_health",
        "general medicine": "general_medicine",
        "general physician": "general_medicine",
        "primary care": "general_medicine",
        "fever": "general_medicine",
        "checkup": "preventive_health",
        "preventive": "preventive_health",
        "full body": "preventive_health",
        "wellness": "preventive_health",
        "diagnostics": "diagnostics",
        "diagnostic": "diagnostics",
        "pathology": "diagnostics",
        "lab": "diagnostics",
        "blood test": "diagnostics"
    }

    PATIENT_TYPE_MAP = {
        "new patient": "new",
        "first time": "new",
        "new here": "new",
        "existing patient": "existing",
        "already registered": "existing",
        "follow up": "existing"
    }

    def process(self, original_query: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        raw = original_query.strip()
        q_lower = raw.lower()

        entities = {
            "location": None,
            "service": None,
            "patient_type": None,
            "topics": []
        }

        # 1. Extract Locations
        for alias, normalized in self.LOCATION_MAP.items():
            if re.search(r"\b" + re.escape(alias) + r"\b", q_lower):
                entities["location"] = normalized
                break

        # 2. Extract Services
        for alias, normalized in self.SERVICE_MAP.items():
            if re.search(r"\b" + re.escape(alias) + r"\b", q_lower):
                entities["service"] = normalized
                break

        # 3. Extract Patient Types
        for alias, normalized in self.PATIENT_TYPE_MAP.items():
            if re.search(r"\b" + re.escape(alias) + r"\b", q_lower):
                entities["patient_type"] = normalized
                break

        # 4. Multi-turn contextual resolution (if conversation context is provided)
        contextual_addition = ""
        if conversation_history and len(conversation_history) > 0:
            # If current query is short or elliptical (e.g., "What about cardiology?")
            if len(q_lower.split()) <= 4 and entities["location"] is None:
                # Look back in history for previous location
                for prev in reversed(conversation_history):
                    prev_text = prev.get("message", "").lower()
                    for alias, normalized in self.LOCATION_MAP.items():
                        if re.search(r"\b" + re.escape(alias) + r"\b", prev_text):
                            entities["location"] = normalized
                            contextual_addition = f" in {normalized.capitalize()}"
                            break
                    if entities["location"]:
                        break

        # 5. Build processed query
        processed_query = raw + contextual_addition if contextual_addition and contextual_addition.lower() not in q_lower else raw

        return {
            "original_query": raw,
            "processed_query": processed_query,
            "entities": entities
        }
