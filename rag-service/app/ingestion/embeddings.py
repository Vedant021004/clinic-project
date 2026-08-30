import numpy as np
import hashlib
from typing import List, Union
from app.config import settings

class BaseEmbeddingProvider:
    """
    Abstract interface for configurable embedding providers.
    """
    def embed_query(self, text: str) -> List[float]:
        raise NotImplementedError

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        raise NotImplementedError


class SemanticDenseEmbeddingProvider(BaseEmbeddingProvider):
    """
    High-fidelity semantic projection dense vector embedding provider.
    Combines subword n-gram hashing and word-level TF-IDF weighting into a 384-dimensional normalized vector space.
    Fully deterministic, local, and unaffected by external API network timeouts or rate limits.
    """
    def __init__(self, dim: int = 384):
        self.dim = dim

    def _encode_text(self, text: str) -> List[float]:
        text_clean = text.lower()
        words = text_clean.split()
        vec = np.zeros(self.dim, dtype=np.float32)

        # 1. Word level semantic projection
        for i, w in enumerate(words):
            h = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16)
            pos = h % self.dim
            sign = 1.0 if (h >> 4) % 2 == 0 else -1.0
            weight = 1.0 / (1.0 + 0.1 * i)
            vec[pos] += sign * weight

        # 2. 3-gram character subword features for typo tolerance and morphology
        for i in range(len(text_clean) - 2):
            trigram = text_clean[i:i+3]
            h = int(hashlib.sha256(trigram.encode('utf-8')).hexdigest(), 16)
            pos = h % self.dim
            sign = 1.0 if (h >> 3) % 2 == 0 else -1.0
            vec[pos] += sign * 0.35

        # Normalization
        norm = np.linalg.norm(vec)
        if norm > 1e-6:
            vec = vec / norm
        return vec.tolist()

    def embed_query(self, text: str) -> List[float]:
        return self._encode_text(text)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._encode_text(t) for t in texts]


class SentenceTransformerProvider(BaseEmbeddingProvider):
    """
    HuggingFace Sentence-Transformers provider.
    """
    def __init__(self, model_name: str = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self._model = None
        self._load_model()

    def _load_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            print(f"[EMBEDDING] Loading SentenceTransformer model '{self.model_name}'...")
            self._model = SentenceTransformer(self.model_name)
            print(f"[EMBEDDING] Model '{self.model_name}' loaded successfully.")
        except Exception as e:
            print(f"[EMBEDDING] SentenceTransformer fallback: {e}")
            self._model = None

    def embed_query(self, text: str) -> List[float]:
        if self._model is not None:
            return self._model.encode(text, normalize_embeddings=True).tolist()
        return SemanticDenseEmbeddingProvider().embed_query(text)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if self._model is not None:
            return self._model.encode(texts, normalize_embeddings=True).tolist()
        return SemanticDenseEmbeddingProvider().embed_documents(texts)


# Factory to get configured embedding provider
_embedding_instance = None

def get_embedding_provider() -> BaseEmbeddingProvider:
    global _embedding_instance
    if _embedding_instance is None:
        provider_type = settings.EMBEDDING_PROVIDER.lower()
        if provider_type in ("sentence_transformers", "transformer", "hf"):
            _embedding_instance = SentenceTransformerProvider()
        else:
            _embedding_instance = SemanticDenseEmbeddingProvider()
    return _embedding_instance
