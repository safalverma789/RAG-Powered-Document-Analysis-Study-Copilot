# RAG-Powered Document Analysis & Study Copilot (Backend)

An enterprise-grade, high-performance FastAPI backend designed for intelligent document analysis, question answering, map-reduce summarization, key concept extraction, automated quiz generation, and personalized tutoring.

All responses are strictly grounded in user-uploaded documents (PDF or .txt) using local sentence embeddings and Google Gemini generative AI.

---

## 🛠️ Tech Stack

- **Framework**: Python 3.11, [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/)
- **Vector Database**: [ChromaDB](https://www.trychroma.com/) (Persistent local store saved in `/backend/chroma_db`)
- **Embedding Model**: [sentence-transformers](https://www.sbert.net/) (`all-MiniLM-L6-v2`, runs locally & free)
- **Document Ingestion**: [pypdf](https://pypdf.readthedocs.io/) (PDF text extraction per page)
- **Generative AI (LLM)**: [Google Gemini](https://ai.google.dev/) via the modern official `google-genai` SDK
- **Data Validation & Config**: Pydantic v2, `python-dotenv`, `python-multipart`
- **Testing**: `pytest`, `httpx`

---

## 📁 Project Structure

```
backend/
├── .env                  # Active environment variables (API keys, ports)
├── .env.example          # Template environment file
├── requirements.txt      # Pinned dependency versions
├── config.py             # App configurations, constants & paths
├── schemas.py            # Pydantic request/response models
├── main.py               # FastAPI application entrypoint & middleware
├── chroma_db/            # Persistent ChromaDB storage directory
├── rag/                  # Core RAG pipeline
│   ├── __init__.py
│   ├── loader.py         # PDF & TXT text extraction + error shielding
│   ├── chunker.py        # Semantic chunking (800 chars, 150 overlap)
│   ├── embeddings.py     # all-MiniLM-L6-v2 sentence transformer
│   ├── vector_store.py   # ChromaDB collection & document catalog manager
│   └── llm.py            # Gemini client, Map-Reduce, Quiz validator/retry
├── routers/              # API Route Handlers
│   ├── __init__.py
│   ├── documents.py      # /upload, /documents, /documents/{doc_id}
│   └── rag.py            # /ask, /summarize, /keypoints, /quiz, /explain
└── tests/                # Automated tests
    ├── __init__.py
    ├── test_health_and_chunker.py
    └── test_api_endpoints.py
```

---

## ⚡ Quick Start on Windows

### 1. Prerequisites
- Python 3.11 installed (or accessible via `py -3.11` or `uv`)
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### 2. Set Up Virtual Environment

Open PowerShell in the `backend` directory:

```powershell
# Navigate to the backend directory
cd "c:\my thing\backend"

# Create a Python 3.11 virtual environment
py -3.11 -m venv .venv
# (Or using uv: uv venv --python 3.11 .venv)

# Activate the virtual environment
.\.venv\Scripts\Activate.ps1
```

> **Note for PowerShell execution policy**: If you see a script execution policy restriction, run:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### 3. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Edit `.env` (or copy from `.env.example`):

```powershell
# In PowerShell:
Copy-Item .env.example .env
```

Open `.env` and set your `GEMINI_API_KEY`:

```env
GEMINI_API_KEY=AIzaSy...YourKeyHere...
GEMINI_MODEL=gemini-2.5-flash
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 5. Start the Server

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will now be live at:
- **API URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

---

## 🧪 Running Tests

Run the full automated test suite (including chunker verification, edge cases, error handlers, and integration flows):

```powershell
pytest
```

---

## 📡 API Reference

### 1. Health Check
- **Endpoint**: `GET /health`
- **Description**: Verifies backend server health and readiness.
- **Response** (`200 OK`):
  ```json
  {
    "status": "ok"
  }
  ```

---

### 2. Upload Document
- **Endpoint**: `POST /upload`
- **Content-Type**: `multipart/form-data`
- **Description**: Ingests `.pdf` or `.txt` files. Automatically extracts text per page, chunks (800 chars, 150 overlap), computes vector embeddings, and stores them in persistent ChromaDB.
- **Error Handling**: Friendly 400 error on empty or scanned PDFs without OCR.
- **Curl Example**:
  ```bash
  curl -X POST "http://localhost:8000/upload" -F "file=@lecture_notes.pdf"
  ```
- **PowerShell Example**:
  ```powershell
  $form = @{ file = Get-Item "lecture_notes.pdf" }
  Invoke-RestMethod -Uri "http://localhost:8000/upload" -Method Post -Form $form
  ```
- **Response** (`201 Created`):
  ```json
  {
    "doc_id": "doc_a1b2c3d4e5f6",
    "filename": "lecture_notes.pdf",
    "chunk_count": 18,
    "total_pages": 4,
    "message": "Successfully extracted 18 chunks across 4 page(s) and indexed into vector store."
  }
  ```

---

### 3. List Documents
- **Endpoint**: `GET /documents`
- **Description**: Retrieves all uploaded documents stored in the ChromaDB catalog.
- **Response** (`200 OK`):
  ```json
  [
    {
      "doc_id": "doc_a1b2c3d4e5f6",
      "filename": "lecture_notes.pdf",
      "chunk_count": 18,
      "total_pages": 4,
      "uploaded_at": "2026-10-25T17:45:00.000000+00:00"
    }
  ]
  ```

---

### 4. Delete Document
- **Endpoint**: `DELETE /documents/{doc_id}`
- **Description**: Removes the document from the catalog and purges all of its vector embeddings from ChromaDB.
- **Response** (`200 OK`):
  ```json
  {
    "message": "Document 'doc_a1b2c3d4e5f6' and all associated chunks were successfully deleted.",
    "doc_id": "doc_a1b2c3d4e5f6"
  }
  ```

---

### 5. Ask Questions (Strictly Grounded Q&A)
- **Endpoint**: `POST /ask`
- **Description**: Retrieves top 5 most relevant semantic chunks from ChromaDB and passes them to Google Gemini.
- **Strict Grounding Rule**: Answers ONLY using the retrieved context. If not present in context, returns: `"I couldn't find this in your document."`
- **Request Body**:
  ```json
  {
    "question": "What is the primary difference between a process and a thread?",
    "doc_id": "doc_a1b2c3d4e5f6"  // Optional: omit to search across all uploaded documents
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "answer": "A process has its own dedicated address space and resources, whereas threads share the memory space and open files of their parent process.",
    "sources": [
      {
        "filename": "lecture_notes.pdf",
        "page": 2,
        "snippet": "Processes vs Threads: A process encapsulates memory management and isolation. Threads share the address space..."
      }
    ]
  }
  ```

---

### 6. Summarize Document (Map-Reduce)
- **Endpoint**: `POST /summarize`
- **Description**: Summarizes entire documents using a hierarchical **Map-Reduce** pattern:
  1. **Map**: Groups chunks into batches and produces intermediate summaries of each section.
  2. **Reduce**: Synthesizes intermediate summaries into a polished, structured summary.
- **Request Body**:
  ```json
  {
    "doc_id": "doc_a1b2c3d4e5f6",
    "style": "short" // "short" or "detailed"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "doc_id": "doc_a1b2c3d4e5f6",
    "summary": "This document covers operating system fundamentals with a focus on CPU virtualization and memory isolation...",
    "style": "short"
  }
  ```

---

### 7. Extract Key Points
- **Endpoint**: `POST /keypoints`
- **Description**: Analyzes document context to extract clear, high-value bullet points.
- **Request Body**:
  ```json
  {
    "doc_id": "doc_a1b2c3d4e5f6"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "doc_id": "doc_a1b2c3d4e5f6",
    "key_points": [
      "Virtual memory provides isolation by giving each process a private address space.",
      "Context switching incurs overhead due to saving CPU registers and cache invalidation.",
      "Deadlock requires four conditions: mutual exclusion, hold-and-wait, no preemption, and circular wait."
    ]
  }
  ```

---

### 8. Generate Quiz (Forced JSON + Auto-Retry)
- **Endpoint**: `POST /quiz`
- **Description**: Generates multiple-choice quiz questions strictly based on the uploaded notes. Enforces JSON output and validates the schema using Pydantic. If generation fails syntax or schema validation, it automatically retries with targeted error feedback.
- **Request Body**:
  ```json
  {
    "doc_id": "doc_a1b2c3d4e5f6",
    "num_questions": 3,
    "difficulty": "medium" // "easy", "medium", or "hard"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "doc_id": "doc_a1b2c3d4e5f6",
    "questions": [
      {
        "question": "Which of the following is NOT one of Coffman's deadlock conditions?",
        "options": [
          "A) Mutual exclusion",
          "B) Preemptive scheduling",
          "C) Hold and wait",
          "D) Circular wait"
        ],
        "correct_answer": "B",
        "explanation": "According to the document, the four Coffman conditions are mutual exclusion, hold and wait, no preemption, and circular wait. Preemptive scheduling prevents deadlocks."
      }
    ]
  }
  ```

---

### 9. Tutor Explanation
- **Endpoint**: `POST /explain`
- **Description**: Acts as an encouraging, patient tutor explaining a specific concept in simple terms, using analogies and easy-to-understand language grounded only in the uploaded document.
- **Request Body**:
  ```json
  {
    "doc_id": "doc_a1b2c3d4e5f6",
    "topic": "Virtual Memory"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "doc_id": "doc_a1b2c3d4e5f6",
    "topic": "Virtual Memory",
    "explanation": "Think of virtual memory like giving every student their own private notebook. Even though all students share the same library desk (physical RAM), each student sees only their own pages numbered from 0 to N without worrying about other students writing over their notes..."
  }
  ```

---

## 🛡️ Robustness & Quality Guarantees

1. **Scanned & Empty PDF Guard**:
   - `pypdf` extracts text per page.
   - If an empty document or un-OCRed scanned PDF is uploaded, a friendly `400 Bad Request` is returned:
     `"The uploaded PDF contains no extractable text. It may be empty or contain only scanned images/photos without an OCR text layer."`
2. **Chunking Fidelity**:
   - Chunks are precisely partitioned to 800 characters with 150-character overlap.
   - Natural whitespace boundaries are preserved without splitting words in half.
3. **Strict Grounding**:
   - System prompts instruct Gemini to answer *only* from retrieved chunks.
   - Hallucination safeguard: Returns `"I couldn't find this in your document."` when information is absent.
4. **CORS Ready**:
   - Pre-configured for Vite/React frontends running at `http://localhost:5173`.
