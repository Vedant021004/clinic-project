import os
from pathlib import Path
from typing import List, Dict
from app.config import settings

def discover_knowledge_documents(directory: Path = None) -> List[Dict[str, any]]:
    """
    Discovers all markdown knowledge documents in the knowledge directory.
    """
    target_dir = directory or settings.KNOWLEDGE_DIR
    if not target_dir.exists():
        print(f"[DISCOVERY] Warning: Directory {target_dir} does not exist. Creating it.")
        target_dir.mkdir(parents=True, exist_ok=True)
        return []

    documents = []
    supported_exts = [".md", ".txt", ".json"]
    
    for file_path in sorted(target_dir.iterdir()):
        if file_path.is_file() and file_path.suffix.lower() in supported_exts:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            documents.append({
                "file_name": file_path.name,
                "file_path": str(file_path),
                "extension": file_path.suffix.lower(),
                "size_bytes": len(content.encode("utf-8")),
                "raw_content": content
            })
            print(f"[DISCOVERY] Found document: {file_path.name} ({len(content)} chars)")
            
    print(f"[DISCOVERY] Total discovered documents: {len(documents)}")
    return documents
