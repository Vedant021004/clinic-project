from typing import List, Dict, Any, Tuple

class ContextCompressor:
    """
    Context Compressor that removes duplicated information, prunes irrelevant sentences,
    and formats the highest-evidence passages while preserving source metadata.
    """

    def compress(self, candidates: List[Dict[str, Any]], max_total_chars: int = 1500) -> Tuple[str, List[Dict[str, str]]]:
        if not candidates:
            return "", []

        compressed_passages = []
        sources = []
        seen_sources = set()
        seen_snippets = set()
        total_chars = 0

        for cand in candidates:
            content = cand["content"].strip()
            meta = cand.get("metadata", {})
            doc_name = meta.get("document", "knowledge_base.md")
            section = meta.get("section", "General Information")
            location = meta.get("location", "general")

            # Deduplicate sources
            src_key = f"{doc_name}_{section}_{location}"
            if src_key not in seen_sources:
                seen_sources.add(src_key)
                sources.append({
                    "document": doc_name,
                    "section": section,
                    "location": location
                })

            # Sentence deduplication and compression
            lines = content.splitlines()
            cleaned_lines = []
            for line in lines:
                l_strip = line.strip()
                if not l_strip:
                    continue
                # Skip duplicate sentences across chunks
                if l_strip in seen_snippets:
                    continue
                seen_snippets.add(l_strip)
                cleaned_lines.append(l_strip)

            passage = "\n".join(cleaned_lines)
            if total_chars + len(passage) <= max_total_chars or len(compressed_passages) == 0:
                compressed_passages.append(f"[{doc_name} / {section}]\n{passage}")
                total_chars += len(passage)

        final_context = "\n\n---\n\n".join(compressed_passages)
        return final_context, sources
