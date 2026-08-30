import re
import os
from typing import Dict, Any, List
from app.config import settings

def parse_document(doc_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parses document content using LlamaParse or the local markdown parser based on configuration.
    Non-silent failure: If LlamaParse is selected and fails, it raises an exception to halt ingestion.
    """
    raw_content = doc_info["raw_content"]
    file_name = doc_info["file_name"]
    file_path = doc_info["file_path"]

    provider = settings.PARSER_PROVIDER

    if provider in ("llamaparse", "llama_parse", "llama_cloud"):
        if not settings.LLAMA_CLOUD_API_KEY or len(settings.LLAMA_CLOUD_API_KEY.strip()) < 5:
            raise ValueError(
                f"Cannot parse '{file_name}' using LlamaParse: LLAMA_CLOUD_API_KEY is missing or invalid. "
                f"Please set LLAMA_CLOUD_API_KEY in .env or set PARSER_PROVIDER=local for local development."
            )
        
        print(f"  [PARSING] Provider: LlamaParse -> Processing {file_name} via LlamaCloud API...")
        from llama_parse import LlamaParse
        
        parser = LlamaParse(
            api_key=settings.LLAMA_CLOUD_API_KEY,
            result_type="markdown",
            verbose=False
        )

        # Non-silent execution: errors from LlamaCloud will raise and halt the pipeline as required
        llama_docs = parser.load_data(file_path)
        if not llama_docs or len(llama_docs) == 0:
            raise RuntimeError(f"LlamaParse returned empty result for '{file_name}'.")

        parsed_text = "\n\n".join([d.text for d in llama_docs])
        parser_used = "LlamaParse"
        page_count = len(llama_docs)
        print(f"  [PARSING] Provider: LlamaParse -> {file_name} successfully parsed ({page_count} section(s)/page(s)).")

    elif provider in ("local", "markdown", "native"):
        print(f"  [PARSING] Provider: Local Markdown Parser -> Processing {file_name}...")
        parsed_text = raw_content
        parser_used = "Local Markdown Parser"
        page_count = 1

    else:
        raise ValueError(f"Unknown PARSER_PROVIDER '{provider}'. Supported options: 'llamaparse', 'local'.")

    # Cleaning: normalize newlines and trailing whitespace
    cleaned_text = clean_text(parsed_text)
    print(f"  [CLEANING] Cleaned {file_name} -> {len(cleaned_text)} characters")

    return {
        "file_name": file_name,
        "file_path": file_path,
        "parser_used": parser_used,
        "page_count": page_count,
        "cleaned_content": cleaned_text
    }

def clean_text(text: str) -> str:
    """
    Normalizes whitespace and removes unwanted artifacts while preserving markdown structure.
    """
    text = re.sub(r'\n{3,}', '\n\n', text)
    lines = [line.rstrip() for line in text.splitlines()]
    return '\n'.join(lines).strip()
