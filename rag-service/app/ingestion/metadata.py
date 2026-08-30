from typing import Dict, Any

def extract_metadata(file_name: str, section_title: str, text: str) -> Dict[str, Any]:
    """
    Enriches each text chunk with semantic metadata for targeted retrieval.
    """
    fn_lower = file_name.lower()
    text_lower = text.lower()
    title_lower = section_title.lower()
    
    # Document Type Classification
    doc_type = "general"
    if "location" in fn_lower:
        doc_type = "location"
    elif "service" in fn_lower:
        doc_type = "service"
    elif "appointment" in fn_lower:
        doc_type = "appointment_policy"
    elif "faq" in fn_lower:
        doc_type = "faq"
    elif "insurance" in fn_lower:
        doc_type = "insurance"
    elif "patient" in fn_lower:
        doc_type = "patient_types"
    elif "safety" in fn_lower:
        doc_type = "safety_guidelines"
    elif "overview" in fn_lower:
        doc_type = "clinic_overview"

    # Location Extraction
    locations = []
    if "palghar" in text_lower or "palghar" in title_lower:
        locations.append("palghar")
    if "boisar" in text_lower or "boisar" in title_lower:
        locations.append("boisar")
    if "vasai" in text_lower or "vasai" in title_lower:
        locations.append("vasai")
    if "nalasopara" in text_lower or "nalasopara" in title_lower:
        locations.append("nalasopara")
    
    primary_location = locations[0] if len(locations) == 1 else ("all" if len(locations) > 1 else "general")

    # Service Extraction
    services = []
    specialty_keywords = {
        "cardiology": "cardiology",
        "neurology": "neurology",
        "pediatric": "pediatrics",
        "women": "womens_health",
        "general medicine": "general_medicine",
        "preventive": "preventive_health",
        "diagnostic": "diagnostics"
    }
    for kw, srv in specialty_keywords.items():
        if kw in text_lower or kw in title_lower:
            services.append(srv)

    primary_service = services[0] if len(services) == 1 else ("multiple" if len(services) > 1 else "general")

    return {
        "document": file_name,
        "document_type": doc_type,
        "section": section_title,
        "location": primary_location,
        "locations_mentioned": locations,
        "service": primary_service,
        "services_mentioned": services,
        "char_count": len(text),
        "source": f"CareBridge Knowledge / {file_name}"
    }
