import os
from pathlib import Path
from dotenv import load_dotenv

# Suppress HuggingFace symlinks warning on Windows
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

# Base directory for the backend application
BASE_DIR = Path(__file__).resolve().parent

# Load environment variables from .env file
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# ChromaDB persistence directory: /backend/chroma_db
CHROMA_PERSIST_DIR = BASE_DIR / "chroma_db"
CHROMA_PERSIST_DIR.mkdir(parents=True, exist_ok=True)

# Google Gemini API Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

# Sentence Transformers embedding model (free local model)
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# RAG Chunking Parameters
CHUNK_SIZE = 800
CHUNK_OVERLAP = 150

# Server & CORS Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
cors_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CORS_ORIGINS = [origin.strip() for origin in cors_env.split(",") if origin.strip()]


def is_gemini_configured() -> bool:
    """Check if a non-placeholder Gemini API key is present."""
    return bool(GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_gemini_api_key"))
