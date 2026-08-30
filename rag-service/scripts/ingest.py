import sys
import os
from pathlib import Path

# Add rag-service to python path
current_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(current_dir))

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from app.config import settings
from app.ingestion.loader import discover_knowledge_documents
from app.ingestion.parser import parse_document
from app.ingestion.chunker import chunk_document
from app.ingestion.embeddings import get_embedding_provider
from app.ingestion.indexer import get_vector_store

def run_ingestion():
    print("\n" + "=" * 60)
    print("CareBridge Health Network - Knowledge Ingestion Pipeline")
    print("=" * 60 + "\n")

    # 1. Discovery
    print("[DISCOVERY]")
    print(f"Scanning directory: {settings.KNOWLEDGE_DIR}")
    documents = discover_knowledge_documents(settings.KNOWLEDGE_DIR)
    if not documents:
        print("[DISCOVERY] Error: No documents found to ingest.")
        sys.exit(1)
    print(f"Total discovered documents: {len(documents)}\n")

    # 2. Parsing & Cleaning
    print("[PARSING]")
    provider_name = "LlamaParse" if settings.PARSER_PROVIDER in ("llamaparse", "llama_parse", "llama_cloud") else "Local Markdown Parser"
    print(f"Provider: {provider_name}")
    
    parsed_docs = []
    for doc in documents:
        parsed = parse_document(doc)
        parsed_docs.append(parsed)

    print(f"\n[CLEANING]")
    print(f"Normalized whitespace and validated {len(parsed_docs)} parsed documents.\n")

    # 3. Semantic Chunking
    print("[CHUNKING]")
    all_chunks = []
    for parsed in parsed_docs:
        chunks = chunk_document(parsed, max_chunk_size=700)
        all_chunks.extend(chunks)

    print(f"Total generated semantic chunks: {len(all_chunks)}\n")

    # 4. Embedding Generation
    print("[EMBEDDING]")
    print(f"Provider: {settings.EMBEDDING_PROVIDER} ({settings.EMBEDDING_MODEL})")
    embedding_provider = get_embedding_provider()
    
    texts_to_embed = [f"{c['metadata']['section']}\n{c['content']}" for c in all_chunks]
    print(f"Generating dense vector embeddings for {len(texts_to_embed)} chunks...")
    embeddings = embedding_provider.embed_documents(texts_to_embed)
    print(f"Generated {len(embeddings)} vector embeddings (dim={len(embeddings[0])})\n")

    # 5. Indexing & Persistence
    print("[INDEXING]")
    print(f"Target Store: {settings.VECTOR_DB_PATH} (Persistent local vector store for development)")
    vector_store = get_vector_store()
    vector_store.clear()
    vector_store.add_records(all_chunks, embeddings)
    print(f"Indexed and saved {len(all_chunks)} records.\n")

    # 6. Complete
    print("=" * 60)
    print("[COMPLETE]")
    print(f"- Documents Processed: {len(documents)}")
    print(f"- Chunks Created: {len(all_chunks)}")
    print(f"- Embedding Dimensions: {len(embeddings[0])}")
    print(f"- Vector Records: {len(vector_store.records)}")
    print(f"- Parser Used: {provider_name}")
    print(f"- Vector Store File: {settings.VECTOR_DB_PATH.name} ({settings.VECTOR_DB_PATH.stat().st_size} bytes)")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    run_ingestion()
