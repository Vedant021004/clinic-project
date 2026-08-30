import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from rag-service directory or project root
current_dir = Path(__file__).resolve().parent.parent
load_dotenv(current_dir / ".env")
load_dotenv(current_dir.parent / ".env")

class Settings:
    LLAMA_CLOUD_API_KEY: str = os.getenv("LLAMA_CLOUD_API_KEY", "").strip()
    LLAMA_CLOUD_API_URL: str = os.getenv("LLAMA_CLOUD_API_URL", "https://api.cloud.llamaindex.ai")
    PARSER_PROVIDER: str = os.getenv("PARSER_PROVIDER", "llamaparse" if os.getenv("LLAMA_CLOUD_API_KEY", "").strip() else "local").lower()
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "semantic_dense")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    
    # Path to knowledge documents
    KNOWLEDGE_DIR: Path = (current_dir.parent / "data" / "knowledge").resolve()
    
    # Path to persistent local vector store for development
    VECTOR_DB_DIR: Path = (current_dir.parent / "data" / "vector_store").resolve()
    VECTOR_DB_PATH: Path = VECTOR_DB_DIR / "carebridge_vectors.json"
    
    RAG_SERVICE_PORT: int = int(os.getenv("RAG_SERVICE_PORT", "8000"))
    DEBUG_MODE: bool = os.getenv("DEBUG_MODE", "true").lower() in ("true", "1", "yes")
    TOP_K: int = int(os.getenv("TOP_K", "5"))

settings = Settings()
