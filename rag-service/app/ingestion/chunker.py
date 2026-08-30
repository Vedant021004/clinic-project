import re
from typing import List, Dict, Any
from app.ingestion.metadata import extract_metadata

def chunk_document(parsed_doc: Dict[str, Any], max_chunk_size: int = 800) -> List[Dict[str, Any]]:
    """
    Performs semantic chunking on markdown text by preserving headings,
    subsections, and Q&A blocks with independent contextual integrity.
    """
    file_name = parsed_doc["file_name"]
    content = parsed_doc["cleaned_content"]

    chunks = []
    
    # Split content by markdown headers (#, ##, ###, ---)
    # Match headers
    header_pattern = re.compile(r'(?=(?:^|\n)#{1,4}\s+|(?:\n---\n))')
    raw_sections = header_pattern.split(content)

    chunk_idx = 0
    for section in raw_sections:
        cleaned_section = section.strip()
        if not cleaned_section or len(cleaned_section) < 20:
            continue

        # Extract title from first line if it's a heading
        lines = cleaned_section.splitlines()
        first_line = lines[0].strip()
        
        section_title = first_line.lstrip('#').strip() if first_line.startswith('#') else file_name.replace('.md', '').replace('_', ' ').title()

        # If section is within comfortable bounds, keep as a single semantic chunk
        if len(cleaned_section) <= max_chunk_size:
            meta = extract_metadata(file_name, section_title, cleaned_section)
            meta["chunk_id"] = f"{file_name}_chunk_{chunk_idx}"
            chunks.append({
                "chunk_id": meta["chunk_id"],
                "content": cleaned_section,
                "metadata": meta
            })
            chunk_idx += 1
        else:
            # Subdivide by paragraphs if section is large
            paragraphs = cleaned_section.split("\n\n")
            current_chunk = f"### {section_title}\n"
            
            for para in paragraphs:
                if len(current_chunk) + len(para) < max_chunk_size:
                    current_chunk += para + "\n\n"
                else:
                    if len(current_chunk.strip()) > len(f"### {section_title}"):
                        meta = extract_metadata(file_name, section_title, current_chunk.strip())
                        meta["chunk_id"] = f"{file_name}_chunk_{chunk_idx}"
                        chunks.append({
                            "chunk_id": meta["chunk_id"],
                            "content": current_chunk.strip(),
                            "metadata": meta
                        })
                        chunk_idx += 1
                    current_chunk = f"### {section_title} (Cont.)\n" + para + "\n\n"

            if len(current_chunk.strip()) > len(f"### {section_title} (Cont.)"):
                meta = extract_metadata(file_name, section_title, current_chunk.strip())
                meta["chunk_id"] = f"{file_name}_chunk_{chunk_idx}"
                chunks.append({
                    "chunk_id": meta["chunk_id"],
                    "content": current_chunk.strip(),
                    "metadata": meta
                })
                chunk_idx += 1

    print(f"[CHUNKING] Document {file_name} -> {len(chunks)} semantic chunks generated.")
    return chunks
