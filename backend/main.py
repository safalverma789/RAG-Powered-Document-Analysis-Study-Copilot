import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from config import CORS_ORIGINS, HOST, PORT
from schemas import HealthResponse, ErrorResponse
from routers.documents import router as documents_router
from routers.rag import router as rag_router
from rag.vector_store import get_vector_store

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize services on startup."""
    logger.info("Initializing RAG-Powered Document Analysis & Study Copilot backend...")
    # Pre-warm vector store and collection connections
    try:
        get_vector_store()
        logger.info("Vector store initialized and ready.")
    except Exception as e:
        logger.error(f"Failed to initialize vector store on startup: {e}")
    yield
    logger.info("Shutting down backend service.")


app = FastAPI(
    title="RAG-Powered Document Analysis & Study Copilot API",
    description=(
        "Backend API for document upload, text extraction, semantic chunking, "
        "local embeddings (all-MiniLM-L6-v2), persistent vector storage (ChromaDB), "
        "and Google Gemini powered Q&A, map-reduce summaries, key points, quizzes, and tutoring."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# ------------------------------------------------------------------------------
# CORS Middleware
# ------------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# Global Exception Handlers
# ------------------------------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Ensures all HTTP exceptions return a standardized JSON error message."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Formats Pydantic request validation errors into a clean, readable message."""
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        errors.append(f"{field}: {msg}")
    error_msg = "; ".join(errors) if errors else "Request validation failed."
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": f"Validation error: {error_msg}"}
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catches unhandled exceptions and prevents server crash with a 500 JSON response."""
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error: {str(exc)}"}
    )


# ------------------------------------------------------------------------------
# 9. Health Check Endpoint
# ------------------------------------------------------------------------------
@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check endpoint",
    tags=["System"]
)
async def health_check():
    """Returns {"status": "ok"} if server is running and healthy."""
    return HealthResponse(status="ok")


# ------------------------------------------------------------------------------
# Include Routers
# ------------------------------------------------------------------------------
app.include_router(documents_router)
app.include_router(rag_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
