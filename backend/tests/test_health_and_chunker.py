import pytest
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app
from rag.chunker import chunk_text, chunk_document_pages
from rag.loader import load_file_content, EmptyDocumentError, InvalidFileTypeError

client = TestClient(app)


# ------------------------------------------------------------------------------
# Health Endpoint Tests
# ------------------------------------------------------------------------------
def test_health_endpoint():
    """Verify GET /health returns 200 OK and status 'ok'."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ------------------------------------------------------------------------------
# Chunker Unit Tests
# ------------------------------------------------------------------------------
def test_chunker_empty_string():
    """Empty or whitespace-only string should return no chunks."""
    assert chunk_text("") == []
    assert chunk_text("    ") == []
    assert chunk_text("\n\n") == []


def test_chunker_short_string():
    """Text shorter than chunk_size should return exactly 1 chunk unchanged."""
    text = "Machine learning is a subset of artificial intelligence."
    chunks = chunk_text(text, chunk_size=800, chunk_overlap=150)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunker_long_string_and_overlap():
    """Long text should be divided into chunks respecting size and overlap."""
    # Create 1800 character text composed of sentences
    sentence = "Neural networks learn hierarchical representations of input data through layers. "
    text = (sentence * 25).strip()
    assert len(text) > 1600

    chunk_size = 800
    chunk_overlap = 150
    chunks = chunk_text(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    assert len(chunks) >= 2
    # Check that all chunks respect maximum chunk size
    for c in chunks:
        assert len(c) <= chunk_size + 10  # allow minor whitespace snap

    # Check overlap between chunk 0 and chunk 1
    # End of chunk 0 should share text with start of chunk 1
    tail_chunk_0 = chunks[0][-80:]
    assert any(word in chunks[1] for word in tail_chunk_0.split() if len(word) > 5)


def test_chunk_document_pages_metadata():
    """Verify document pages are chunked with accurate metadata."""
    pages = [
        {"page": 1, "text": "Page one text. " * 30},
        {"page": 2, "text": "Page two text. " * 30}
    ]
    doc_id = "test_doc_123"
    filename = "notes.pdf"

    chunks = chunk_document_pages(pages, doc_id=doc_id, filename=filename, chunk_size=500, chunk_overlap=100)

    assert len(chunks) > 0
    for idx, c in enumerate(chunks):
        assert c["doc_id"] == doc_id
        assert c["filename"] == filename
        assert c["chunk_index"] == idx
        assert c["chunk_id"] == f"{doc_id}_{idx}"
        assert c["page"] in [1, 2]
        assert len(c["text"]) > 0


# ------------------------------------------------------------------------------
# Document Loader Tests
# ------------------------------------------------------------------------------
def test_loader_empty_txt():
    """Empty text file should raise EmptyDocumentError."""
    with pytest.raises(EmptyDocumentError):
        load_file_content(b"", "empty.txt")

    with pytest.raises(EmptyDocumentError):
        load_file_content(b"   \n\n  ", "blank.txt")


def test_loader_invalid_extension():
    """Unsupported file extension should raise InvalidFileTypeError."""
    with pytest.raises(InvalidFileTypeError):
        load_file_content(b"Some data", "document.docx")

    with pytest.raises(InvalidFileTypeError):
        load_file_content(b"Some data", "table.xlsx")


def test_loader_valid_txt():
    """Valid text file should return single page with decoded content."""
    content = "Introduction to Algorithms\nChapter 1: Sorting and Searching."
    pages = load_file_content(content.encode("utf-8"), "algorithms.txt")
    assert len(pages) == 1
    assert pages[0]["page"] == 1
    assert "Introduction to Algorithms" in pages[0]["text"]
