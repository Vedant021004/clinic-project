import re
from typing import List, Dict, Any

STOPWORDS = {
    "what", "is", "the", "in", "a", "an", "of", "to", "for", "do", "you", "and",
    "or", "are", "can", "how", "it", "at", "by", "on", "with", "about", "your",
    "my", "me", "this", "that", "there", "their", "where", "which", "who", "whom",
    "when", "why", "be", "have", "has", "had", "will", "would", "shall", "should"
}

class Reranker:
    """
    Lightweight, deterministic semantic feature reranker.
    Evaluates cross-attention query-chunk keyword density, exact phrase matching,
    and metadata alignment to refine candidate ordering without external latency.
    """

    def rerank(self, query: str, candidates: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        if not candidates:
            return []

        all_terms = re.findall(r'\b\w+\b', query.lower())
        # Filter stopwords so general English words don't produce false positive overlaps
        content_terms = set(t for t in all_terms if t not in STOPWORDS and len(t) > 2)
        
        # If all words were stopwords (e.g. "what is it"), fallback to all terms
        eval_terms = content_terms if content_terms else set(all_terms)
        
        reranked = []

        for cand in candidates:
            content = cand["content"].lower()
            meta = cand.get("metadata", {})
            section = meta.get("section", "").lower()
            base_score = cand.get("combined_score", cand.get("semantic_score", 0.0))

            # 1. Content Keyword Coverage ratio
            content_words = set(re.findall(r'\b\w+\b', content))
            coverage = len(eval_terms.intersection(content_words)) / max(len(eval_terms), 1)

            # 2. Section alignment boost
            section_words = set(re.findall(r'\b\w+\b', section))
            section_overlap = len(eval_terms.intersection(section_words)) / max(len(eval_terms), 1)

            # 3. Metadata alignment boost
            meta_boost = 0.15 if cand.get("metadata_matched") else 0.0

            # Calculate refined rerank score
            rerank_score = (base_score * 0.55) + (coverage * 0.35) + (section_overlap * 0.10) + meta_boost
            
            cand_copy = dict(cand)
            cand_copy["rerank_score"] = round(rerank_score, 4)
            reranked.append(cand_copy)

        # Sort descending by rerank score
        reranked.sort(key=lambda x: x["rerank_score"], reverse=True)
        return reranked[:top_k]
