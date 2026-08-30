import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Reconfigure stdout for UTF-8
if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add rag-service to path
current_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(current_dir))

# Load .env
load_dotenv(current_dir / ".env")
load_dotenv(current_dir.parent / ".env")

def test_llamaparse(target_file: str = "data/knowledge/services.md", custom_key: str = None):
    print("\n" + "=" * 60)
    print("CareBridge - Direct LlamaParse API Verification")
    print("=" * 60 + "\n")

    api_key = custom_key if custom_key is not None else os.getenv("LLAMA_CLOUD_API_KEY", "").strip()
    is_configured = bool(api_key and len(api_key) > 5)

    print(f"LLAMA_CLOUD_API_KEY configured: {'YES' if is_configured else 'NO'}")
    
    file_path = Path(target_file)
    if not file_path.is_absolute():
        file_path = (current_dir.parent / target_file).resolve()

    if not file_path.exists():
        print(f"Error: Target file not found at {file_path}")
        return False

    print(f"Target Document: {file_path.name} ({file_path.stat().st_size} bytes)")

    if not is_configured:
        print("\n[PARSING]")
        print("Provider: LlamaParse")
        print("Status: SKIPPED (LLAMA_CLOUD_API_KEY not configured in environment)")
        print("Recommendation: Set LLAMA_CLOUD_API_KEY in rag-service/.env to enable cloud parsing.")
        print("=" * 60 + "\n")
        return True

    try:
        print("\n[PARSING]")
        print("Provider: LlamaParse")
        print(f"Calling real LlamaCloud LlamaParse API for {file_path.name}...")
        
        from llama_parse import LlamaParse
        
        parser = LlamaParse(
            api_key=api_key,
            result_type="markdown",
            verbose=False
        )

        # Call the live LlamaParse API
        documents = parser.load_data(str(file_path))

        if not documents or len(documents) == 0:
            raise ValueError("LlamaParse returned 0 parsed document pages.")

        total_text_len = sum(len(d.text) for d in documents)

        print("Status: SUCCESS")
        print(f"Pages/sections: {len(documents)}")
        print(f"Parsed Content Characters: {total_text_len}")
        print(f"Sample Parsed Header: {documents[0].text[:120].strip()}...")
        print("=" * 60 + "\n")
        return True

    except Exception as e:
        print("Status: FAILED")
        print(f"LlamaCloud API Error: {type(e).__name__} -> {str(e)}")
        print("=" * 60 + "\n")
        raise e

if __name__ == "__main__":
    test_llamaparse()
