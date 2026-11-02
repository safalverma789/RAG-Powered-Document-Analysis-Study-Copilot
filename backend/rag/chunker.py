from typing import List, Dict, Any


def chunk_text(text: str, chunk_size: int = 800, chunk_overlap: int = 150) -> List[str]:
    """
    Splits a single string into overlapping chunks.

    Args:
        text: Source text to split.
        chunk_size: Maximum character length per chunk (default: 800).
        chunk_overlap: Overlapping character count between consecutive chunks (default: 150).

    Returns:
        List of chunk strings.
    """
    cleaned = text.strip()
    if not cleaned:
        return []

    if len(cleaned) <= chunk_size:
        return [cleaned]

    chunks: List[str] = []
    text_len = len(cleaned)
    start = 0

    while start < text_len:
        end = min(start + chunk_size, text_len)

        # If we are not at the end of text, attempt to find a natural break (space or newline)
        if end < text_len:
            # Look back up to 80 characters for a whitespace boundary
            search_start = max(start + (chunk_size - 80), start)
            best_space = max(
                cleaned.rfind(" ", search_start, end),
                cleaned.rfind("\n", search_start, end)
            )
            if best_space > start:
                end = best_space

        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= text_len:
            break

        # Calculate next starting position with overlap
        next_start = end - chunk_overlap
        # Guarantee forward progress
        if next_start <= start:
            next_start = start + (chunk_size - chunk_overlap)
        start = next_start

    return chunks


def chunk_document_pages(
    pages: List[Dict[str, Any]],
    doc_id: str,
    filename: str,
    chunk_size: int = 800,
    chunk_overlap: int = 150
) -> List[Dict[str, Any]]:
    """
    Chunks document pages and attaches metadata (doc_id, filename, page, chunk_index).

    Args:
        pages: List of dicts [{"page": int, "text": str}].
        doc_id: Document ID.
        filename: Document filename.
        chunk_size: Target chunk size in characters (800).
        chunk_overlap: Overlap in characters (150).

    Returns:
        List of chunk dicts ready for embedding and ChromaDB indexing.
    """
    all_chunks: List[Dict[str, Any]] = []
    chunk_idx = 0

    for page_info in pages:
        page_num = page_info.get("page", 1)
        page_text = page_info.get("text", "")

        page_chunks = chunk_text(page_text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        for chunk_str in page_chunks:
            all_chunks.append({
                "chunk_id": f"{doc_id}_{chunk_idx}",
                "text": chunk_str,
                "doc_id": doc_id,
                "filename": filename,
                "page": page_num,
                "chunk_index": chunk_idx
            })
            chunk_idx += 1

    return all_chunks
