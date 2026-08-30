from typing import List, Dict, Any
from app.ingestion.embeddings import get_embedding_provider
from app.ingestion.indexer import get_vector_store

class SemanticSearch:
    """
    Executes dense vector semantic similarity search using configured embeddings.
    """
    def __init__(self):
        self.embedding_provider = get_embedding_provider()
        self.vector_store = get_vector_store()

    def search(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        query_vector = self.embedding_provider.embed_query(query)
        raw_results = self.vector_store.similarity_search(query_vector, top_k=top_k)

        candidates = []
        for record, score in raw_results:
            candidates.append({
                "chunk_id": record["chunk_id"],
                "content": record["content"],
                "metadata": record["metadata"],
                "semantic_score": round(float(score), 4)
            })

        return candidates
