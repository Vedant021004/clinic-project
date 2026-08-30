import re
import math
from typing import List, Dict, Any
from app.ingestion.indexer import get_vector_store

STOPWORDS = {
    "what", "is", "the", "in", "a", "an", "of", "to", "for", "do", "you", "and",
    "or", "are", "can", "how", "it", "at", "by", "on", "with", "about", "your",
    "my", "me", "this", "that", "there", "their", "where", "which", "who", "whom",
    "when", "why", "be", "have", "has", "had", "will", "would", "shall", "should"
}

class KeywordSearch:
    """
    Exact keyword and BM25-style term frequency matching over indexed knowledge chunks.
    Ensures high precision for clinic names, exact service queries, and terms.
    """
    def __init__(self):
        self.vector_store = get_vector_store()

    def search(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        records = self.vector_store.records
        if not records:
            return []

        q_clean = query.lower().strip()
        raw_terms = re.findall(r'\b\w+\b', q_clean)
        terms = [t for t in raw_terms if t not in STOPWORDS and len(t) > 2]
        if not terms:
            terms = [t for t in raw_terms if len(t) > 2]
        if not terms:
            return []

        candidates = []
        for record in records:
            content = record["content"].lower()
            section = record.get("metadata", {}).get("section", "").lower()
            doc_name = record.get("metadata", {}).get("document", "").lower()

            score = 0.0
            # 1. Exact phrase match boost (for multi-word queries like "Boisar Care Center")
            if len(terms) > 1 and q_clean in content:
                score += 3.0
            if len(terms) > 1 and q_clean in section:
                score += 4.0

            # 2. Section header match boost
            for term in terms:
                if term in section:
                    score += 1.5
                if term in doc_name:
                    score += 1.0

            # 3. Term frequency matching in content
            for term in terms:
                count = len(re.findall(r'\b' + re.escape(term) + r'\b', content))
                if count > 0:
                    score += 1.0 + math.log(1 + count)

            if score > 0.0:
                candidates.append({
                    "chunk_id": record["chunk_id"],
                    "content": record["content"],
                    "metadata": record["metadata"],
                    "raw_keyword_score": score
                })

        if not candidates:
            return []

        # Normalize keyword scores between 0.0 and 1.0
        max_score = max(c["raw_keyword_score"] for c in candidates)
        for c in candidates:
            c["keyword_score"] = round(c["raw_keyword_score"] / max_score, 4)

        # Sort descending
        candidates.sort(key=lambda x: x["keyword_score"], reverse=True)
        return candidates[:top_k]
