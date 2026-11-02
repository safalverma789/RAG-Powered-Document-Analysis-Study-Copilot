import pytest
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_upload_empty_file():
    """Uploading an empty file should return 400 Bad Request."""
    files = {"file": ("empty.txt", b"", "text/plain")}
    response = client.post("/upload", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_upload_invalid_extension():
    """Uploading an invalid file extension should return 400 Bad Request."""
    files = {"file": ("notes.docx", b"some content", "application/vnd.openxmlformats")}
    response = client.post("/upload", files=files)
    assert response.status_code == 400
    assert "unsupported" in response.json()["detail"].lower()


def test_document_lifecycle():
    """Test full document upload, listing, and deletion cycle."""
    sample_text = (
        "Operating Systems: Three Easy Pieces.\n"
        "Virtualization allows multiple programs to run concurrently by abstracting the CPU and memory. "
        "The OS uses time sharing to virtualize the CPU and address spaces to virtualize physical memory. "
        "Concurrency introduces race conditions, requiring locks, semaphores, and condition variables. "
        "Persistence is achieved through file systems and crash-consistency mechanisms such as journaling."
    )

    # 1. Upload valid document
    files = {"file": ("os_notes.txt", sample_text.encode("utf-8"), "text/plain")}
    upload_res = client.post("/upload", files=files)
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert "doc_id" in upload_data
    assert upload_data["chunk_count"] >= 1
    assert upload_data["filename"] == "os_notes.txt"
    doc_id = upload_data["doc_id"]

    # 2. List documents
    list_res = client.get("/documents")
    assert list_res.status_code == 200
    docs = list_res.json()
    matching = [d for d in docs if d["doc_id"] == doc_id]
    assert len(matching) == 1
    assert matching[0]["filename"] == "os_notes.txt"

    # 3. Non-existent document checks for RAG endpoints
    not_found_id = "doc_999999999999"
    assert client.post("/summarize", json={"doc_id": not_found_id, "style": "short"}).status_code == 404
    assert client.post("/keypoints", json={"doc_id": not_found_id}).status_code == 404
    assert client.post("/quiz", json={"doc_id": not_found_id, "num_questions": 3}).status_code == 404
    assert client.post("/explain", json={"doc_id": not_found_id, "topic": "Virtualization"}).status_code == 404

    # 4. Delete document
    del_res = client.delete(f"/documents/{doc_id}")
    assert del_res.status_code == 200
    assert del_res.json()["doc_id"] == doc_id

    # 5. Verify deletion
    verify_res = client.get("/documents")
    remaining = [d for d in verify_res.json() if d["doc_id"] == doc_id]
    assert len(remaining) == 0

    # 6. Deleting again should return 404
    del_again = client.delete(f"/documents/{doc_id}")
    assert del_again.status_code == 404
