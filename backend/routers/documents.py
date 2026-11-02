import logging
import uuid
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from schemas import UploadResponse, DocumentInfo, DeleteResponse, ErrorResponse
from rag.loader import load_file_content, EmptyDocumentError, InvalidFileTypeError, DocumentLoaderError
from rag.chunker import chunk_document_pages
from rag.vector_store import get_vector_store
from config import CHUNK_SIZE, CHUNK_OVERLAP

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Documents"])


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and index a PDF or TXT document",
    responses={
        400: {"model": ErrorResponse, "description": "Empty, scanned, or invalid file format"},
        500: {"model": ErrorResponse, "description": "Internal processing error"}
    }
)
async def upload_document(file: UploadFile = File(...)):
    """
    Accepts PDF or .txt files, extracts text per page, chunks with 800 characters
    and 150 overlap, computes embeddings, and stores in persistent ChromaDB.
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided in the upload request."
        )

    filename = file.filename
    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The uploaded file '{filename}' is empty (0 bytes)."
            )

        # Extract text per page
        try:
            pages = load_file_content(file_bytes, filename)
        except (EmptyDocumentError, InvalidFileTypeError) as e:
            logger.warning(f"Document loading rejected for '{filename}': {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except DocumentLoaderError as e:
            logger.error(f"Loader error for '{filename}': {e}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e)
            )

        # Generate unique document ID
        doc_id = f"doc_{uuid.uuid4().hex[:12]}"

        # Split into chunks (800 chars, 150 overlap)
        chunks = chunk_document_pages(
            pages=pages,
            doc_id=doc_id,
            filename=filename,
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP
        )

        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No usable text chunks could be produced from '{filename}'."
            )

        # Embed and store in ChromaDB
        store = get_vector_store()
        store.add_document(
            doc_id=doc_id,
            filename=filename,
            chunks=chunks,
            total_pages=len(pages)
        )

        return UploadResponse(
            doc_id=doc_id,
            filename=filename,
            chunk_count=len(chunks),
            total_pages=len(pages),
            message=f"Successfully extracted {len(chunks)} chunks across {len(pages)} page(s) and indexed into vector store."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during upload of '{filename}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while processing the file: {str(e)}"
        )


@router.get(
    "/documents",
    response_model=List[DocumentInfo],
    summary="List all uploaded documents",
    responses={
        500: {"model": ErrorResponse, "description": "Database query error"}
    }
)
async def list_documents():
    """
    Returns list of all uploaded documents currently stored in ChromaDB catalog.
    """
    try:
        store = get_vector_store()
        docs = store.list_documents()
        return [DocumentInfo(**d) for d in docs]
    except Exception as e:
        logger.error(f"Failed to list documents: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve document list: {str(e)}"
        )


@router.delete(
    "/documents/{doc_id}",
    response_model=DeleteResponse,
    summary="Delete a document and all its chunks",
    responses={
        404: {"model": ErrorResponse, "description": "Document not found"},
        500: {"model": ErrorResponse, "description": "Deletion error"}
    }
)
async def delete_document(doc_id: str):
    """
    Deletes a document from the catalog and removes all of its associated chunks
    from the vector store.
    """
    try:
        store = get_vector_store()
        deleted = store.delete_document(doc_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{doc_id}' not found."
            )
        return DeleteResponse(
            message=f"Document '{doc_id}' and all associated chunks were successfully deleted.",
            doc_id=doc_id
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete document '{doc_id}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )
