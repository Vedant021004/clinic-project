from typing import List, Dict, Any
from app.retrieval.retriever import SemanticRetriever

def search_knowledge_base(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Search helper to retrieve relevant chunks with source attribution.
    """
    retriever = SemanticRetriever(top_k=top_k)
    return retriever.retrieve(query, top_k=top_k)
