from typing import List, Dict, Any
from app.retrieval.semantic_search import SemanticSearch
from app.retrieval.keyword_search import KeywordSearch
from app.retrieval.retrieval_config import retrieval_config

class HybridSearch:
    """
    Hybrid Search combining Semantic Vector Search and BM25-style Keyword Search
    with score normalization and weighted reciprocal/linear fusion.
    """
    def __init__(self):
        self.semantic_search = SemanticSearch()
        self.keyword_search = KeywordSearch()

    def search(
        self,
        query: str,
        top_k_semantic: int = None,
        top_k_keyword: int = None,
        semantic_weight: float = None,
        keyword_weight: float = None
    ) -> List[Dict[str, Any]]:
        k_sem = top_k_semantic or retrieval_config.top_k_semantic
        k_kw = top_k_keyword or retrieval_config.top_k_keyword
        w_sem = semantic_weight if semantic_weight is not None else retrieval_config.semantic_weight
        w_kw = keyword_weight if keyword_weight is not None else retrieval_config.keyword_weight

        # 1. Retrieve candidates from both modalities
        sem_candidates = self.semantic_search.search(query, top_k=k_sem)
        kw_candidates = self.keyword_search.search(query, top_k=k_kw)

        # 2. Candidate Fusion & Deduplication
        fused_map: Dict[str, Dict[str, Any]] = {}

        # Add semantic candidates
        for cand in sem_candidates:
            cid = cand["chunk_id"]
            fused_map[cid] = {
                "chunk_id": cid,
                "content": cand["content"],
                "metadata": cand["metadata"],
                "semantic_score": cand["semantic_score"],
                "keyword_score": 0.0,
                "combined_score": 0.0
            }

        # Merge keyword candidates
        for cand in kw_candidates:
            cid = cand["chunk_id"]
            if cid in fused_map:
                fused_map[cid]["keyword_score"] = cand.get("keyword_score", 0.0)
            else:
                fused_map[cid] = {
                    "chunk_id": cid,
                    "content": cand["content"],
                    "metadata": cand["metadata"],
                    "semantic_score": 0.0,
                    "keyword_score": cand.get("keyword_score", 0.0),
                    "combined_score": 0.0
                }

        # 3. Calculate weighted combined score
        fused_list = list(fused_map.values())
        for item in fused_list:
            score = (item["semantic_score"] * w_sem) + (item["keyword_score"] * w_kw)
            item["combined_score"] = round(score, 4)

        # Sort descending by combined score
        fused_list.sort(key=lambda x: x["combined_score"], reverse=True)
        return fused_list
