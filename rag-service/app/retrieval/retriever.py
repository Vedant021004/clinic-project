import time
from typing import List, Dict, Any, Tuple
from app.retrieval.retrieval_config import retrieval_config
from app.retrieval.intent import IntentClassifier
from app.retrieval.query_processor import QueryProcessor
from app.retrieval.metadata_filter import MetadataFilter
from app.retrieval.semantic_search import SemanticSearch
from app.retrieval.hybrid_search import HybridSearch
from app.retrieval.reranker import Reranker
from app.retrieval.context_compressor import ContextCompressor

class BasicRetriever:
    """
    Phase 2 Basic Semantic Retriever: Single-modality dense cosine similarity search.
    Preserved for backward compatibility and performance comparison.
    """
    def __init__(self, top_k: int = 5):
        self.top_k = top_k
        self.semantic_search = SemanticSearch()

    def retrieve(self, query: str, top_k: int = None) -> List[Dict[str, Any]]:
        k = top_k or self.top_k
        candidates = self.semantic_search.search(query, top_k=k)
        for c in candidates:
            c["similarity_score"] = c["semantic_score"]
        return candidates


class AdvancedRetriever:
    """
    Phase 3 Advanced Multi-Stage RAG Retriever:
    Query Understanding -> Metadata Filtering -> Hybrid Search (Dense + BM25) ->
    Candidate Fusion -> Feature Reranking -> Context Compression.
    """
    def __init__(self):
        self.intent_classifier = IntentClassifier()
        self.query_processor = QueryProcessor()
        self.metadata_filter = MetadataFilter()
        self.hybrid_search = HybridSearch()
        self.reranker = Reranker()
        self.context_compressor = ContextCompressor()

    def retrieve(
        self,
        query: str,
        conversation_history: List[Dict[str, str]] = None,
        top_k: int = None
    ) -> Dict[str, Any]:
        t0 = time.perf_counter()
        k = top_k or retrieval_config.final_top_k

        # 1. Intent Detection
        intent_info = self.intent_classifier.classify(query)
        intent = intent_info["intent"]

        # 2. Query Processing & Entity Extraction
        processed_data = self.query_processor.process(query, conversation_history)
        processed_query = processed_data["processed_query"]
        entities = processed_data["entities"]

        t_query_proc = time.perf_counter()

        # 3. Hybrid Retrieval (Semantic + Keyword)
        hybrid_candidates = self.hybrid_search.search(
            query=processed_query,
            top_k_semantic=retrieval_config.top_k_semantic,
            top_k_keyword=retrieval_config.top_k_keyword
        )

        t_hybrid = time.perf_counter()

        # 4. Metadata-Aware Soft Filtering
        filtered_candidates = self.metadata_filter.apply_filter(hybrid_candidates, entities)

        # 5. Reranking
        t_rerank_start = time.perf_counter()
        reranked_candidates = self.reranker.rerank(processed_query, filtered_candidates, top_k=k)
        t_rerank_end = time.perf_counter()

        # 6. Context Compression
        compressed_context, sources = self.context_compressor.compress(reranked_candidates)

        t_total = time.perf_counter()

        # Latency metrics
        timings = {
            "query_understanding_ms": round((t_query_proc - t0) * 1000, 2),
            "retrieval_latency_ms": round((t_hybrid - t_query_proc) * 1000, 2),
            "reranking_latency_ms": round((t_rerank_end - t_rerank_start) * 1000, 2),
            "total_retrieval_latency_ms": round((t_total - t0) * 1000, 2)
        }

        # Calculate Confidence
        top_score = reranked_candidates[0]["rerank_score"] if reranked_candidates else 0.0
        if top_score >= retrieval_config.high_confidence_threshold:
            confidence = "HIGH"
        elif top_score >= retrieval_config.medium_confidence_threshold:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        return {
            "intent": intent,
            "original_query": query,
            "processed_query": processed_query,
            "entities": entities,
            "candidates": reranked_candidates,
            "compressed_context": compressed_context,
            "sources": sources,
            "confidence": confidence,
            "top_score": top_score,
            "timings": timings
        }
