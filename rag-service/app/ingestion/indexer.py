import json
import os
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Tuple
from app.config import settings

class PersistentVectorStore:
    """
    A persistent vector store storing chunks, embeddings, and metadata on disk.
    Survives restarts and provides fast vector cosine similarity search.
    """
    def __init__(self, storage_path: Path = None):
        self.storage_path = storage_path or settings.VECTOR_DB_PATH
        self.records: List[Dict[str, Any]] = []
        self.vectors_matrix: np.ndarray = np.array([])
        self._load_from_disk()

    def _load_from_disk(self):
        if self.storage_path.exists():
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.records = data.get("records", [])
                    
                    if self.records:
                        embeddings = [r["embedding"] for r in self.records]
                        self.vectors_matrix = np.array(embeddings, dtype=np.float32)
                print(f"[INDEXING] Loaded {len(self.records)} persistent vector records from {self.storage_path}")
            except Exception as e:
                print(f"[INDEXING] Warning: Failed loading index from disk: {e}")
                self.records = []
                self.vectors_matrix = np.array([])
        else:
            print(f"[INDEXING] Vector store path {self.storage_path} does not exist yet.")

    def save_to_disk(self):
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "version": "1.0",
            "total_chunks": len(self.records),
            "records": self.records
        }
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"[INDEXING] Successfully saved {len(self.records)} vector records to {self.storage_path}")

    def add_records(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]):
        for chunk, emb in zip(chunks, embeddings):
            self.records.append({
                "chunk_id": chunk["chunk_id"],
                "content": chunk["content"],
                "metadata": chunk["metadata"],
                "embedding": emb
            })
        
        # Update matrix
        embeddings_all = [r["embedding"] for r in self.records]
        self.vectors_matrix = np.array(embeddings_all, dtype=np.float32)
        self.save_to_disk()

    def clear(self):
        self.records = []
        self.vectors_matrix = np.array([])
        if self.storage_path.exists():
            self.storage_path.unlink()

    def similarity_search(self, query_vector: List[float], top_k: int = 5) -> List[Tuple[Dict[str, Any], float]]:
        if len(self.records) == 0 or self.vectors_matrix.size == 0:
            return []

        q_vec = np.array(query_vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm > 1e-6:
            q_vec = q_vec / q_norm

        # Matrix cosine similarity
        matrix_norms = np.linalg.norm(self.vectors_matrix, axis=1, keepdims=True)
        matrix_norms[matrix_norms == 0] = 1e-6
        normalized_matrix = self.vectors_matrix / matrix_norms

        similarities = np.dot(normalized_matrix, q_vec)

        # Top-K indices
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            record = self.records[idx]
            results.append((record, score))

        return results


# Global singleton instance
_vector_store_instance = None

def get_vector_store() -> PersistentVectorStore:
    global _vector_store_instance
    if _vector_store_instance is None:
        _vector_store_instance = PersistentVectorStore()
    return _vector_store_instance
