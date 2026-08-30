import os
from pydantic import BaseModel, Field

class RetrievalConfig(BaseModel):
    """
    Configuration parameters for Hybrid Retrieval, Fusion, and Reranking.
    """
    rag_mode: str = Field(default_factory=lambda: os.getenv("RAG_MODE", "advanced").lower())
    rag_debug: bool = Field(default_factory=lambda: os.getenv("RAG_DEBUG", "true").lower() in ("true", "1", "yes"))
    
    top_k_semantic: int = int(os.getenv("TOP_K_SEMANTIC", "10"))
    top_k_keyword: int = int(os.getenv("TOP_K_KEYWORD", "10"))
    final_top_k: int = int(os.getenv("FINAL_TOP_K", "5"))
    
    semantic_weight: float = float(os.getenv("SEMANTIC_WEIGHT", "0.7"))
    keyword_weight: float = float(os.getenv("KEYWORD_WEIGHT", "0.3"))
    
    min_confidence_score: float = float(os.getenv("MIN_CONFIDENCE_SCORE", "0.28"))
    high_confidence_threshold: float = float(os.getenv("HIGH_CONFIDENCE_THRESHOLD", "0.45"))
    medium_confidence_threshold: float = float(os.getenv("MEDIUM_CONFIDENCE_THRESHOLD", "0.28"))

retrieval_config = RetrievalConfig()
