import logging
from typing import List
from fastapi import APIRouter, HTTPException, status
from schemas import (
    AskRequest, AskResponse, SourceChunk,
    SummarizeRequest, SummarizeResponse,
    KeypointsRequest, KeypointsResponse,
    QuizRequest, QuizResponse,
    ExplainRequest, ExplainResponse,
    ErrorResponse
)
from rag.vector_store import get_vector_store
from rag.llm import get_llm_service, GeminiConfigurationError, GeminiAPIException

logger = logging.getLogger(__name__)

router = APIRouter(tags=["RAG Operations"])


@router.post(
    "/ask",
    response_model=AskResponse,
    summary="Ask a question grounded strictly in uploaded documents",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request parameters"},
        404: {"model": ErrorResponse, "description": "Specified doc_id not found"},
        500: {"model": ErrorResponse, "description": "AI or search execution error"},
        503: {"model": ErrorResponse, "description": "Gemini API key unconfigured"}
    }
)
async def ask_question(request: AskRequest):
    """
    Retrieves the top 5 most relevant chunks from ChromaDB and prompts Gemini.
    Strictly answers from context or returns: 'I couldn't find this in your document.'
    """
    store = get_vector_store()

    # If doc_id is provided, verify it exists
    if request.doc_id:
        doc = store.get_document(request.doc_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{request.doc_id}' not found."
            )

    try:
        # Retrieve top 5 matching chunks
        chunks = store.search(
            query=request.question,
            doc_id=request.doc_id,
            top_k=5
        )

        sources = [
            SourceChunk(
                filename=c.get("filename", "Unknown"),
                page=c.get("page", 1),
                snippet=c.get("snippet", "")
            )
            for c in chunks
        ]

        if not chunks:
            return AskResponse(
                answer="I couldn't find this in your document.",
                sources=[]
            )

        llm = get_llm_service()
        answer = llm.answer_question(request.question, chunks)

        return AskResponse(
            answer=answer,
            sources=sources
        )

    except GeminiConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except GeminiAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error handling /ask request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process question: {str(e)}"
        )


@router.post(
    "/summarize",
    response_model=SummarizeResponse,
    summary="Generate a Map-Reduce summary of an uploaded document",
    responses={
        404: {"model": ErrorResponse, "description": "Document not found"},
        500: {"model": ErrorResponse, "description": "Summarization error"},
        503: {"model": ErrorResponse, "description": "Gemini API key unconfigured"}
    }
)
async def summarize_document(request: SummarizeRequest):
    """
    Summarizes whole documents using map-reduce:
    summarizes groups of chunks, then synthesizes the intermediate summaries.
    """
    store = get_vector_store()
    doc = store.get_document(request.doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{request.doc_id}' not found."
        )

    chunks = store.get_all_chunks_for_doc(request.doc_id)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No text chunks found for document '{request.doc_id}'."
        )

    try:
        llm = get_llm_service()
        summary = llm.summarize_document(chunks, style=request.style)
        return SummarizeResponse(
            doc_id=request.doc_id,
            summary=summary,
            style=request.style
        )
    except GeminiConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except GeminiAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error handling /summarize: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}"
        )


@router.post(
    "/keypoints",
    response_model=KeypointsResponse,
    summary="Extract bulleted key points from an uploaded document",
    responses={
        404: {"model": ErrorResponse, "description": "Document not found"},
        500: {"model": ErrorResponse, "description": "Key points generation error"},
        503: {"model": ErrorResponse, "description": "Gemini API key unconfigured"}
    }
)
async def extract_keypoints(request: KeypointsRequest):
    """
    Extracts high-value key points from the uploaded document context.
    """
    store = get_vector_store()
    doc = store.get_document(request.doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{request.doc_id}' not found."
        )

    chunks = store.get_all_chunks_for_doc(request.doc_id)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No text chunks found for document '{request.doc_id}'."
        )

    try:
        llm = get_llm_service()
        points = llm.extract_keypoints(chunks)
        return KeypointsResponse(
            doc_id=request.doc_id,
            key_points=points
        )
    except GeminiConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except GeminiAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error handling /keypoints: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract key points: {str(e)}"
        )


@router.post(
    "/quiz",
    response_model=QuizResponse,
    summary="Generate multiple-choice quiz questions based on document content",
    responses={
        404: {"model": ErrorResponse, "description": "Document not found"},
        500: {"model": ErrorResponse, "description": "Quiz generation error"},
        503: {"model": ErrorResponse, "description": "Gemini API key unconfigured"}
    }
)
async def generate_quiz(request: QuizRequest):
    """
    Forces structured JSON output and validates quiz questions with Pydantic,
    retrying once if the model output is invalid.
    """
    store = get_vector_store()
    doc = store.get_document(request.doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{request.doc_id}' not found."
        )

    chunks = store.get_all_chunks_for_doc(request.doc_id)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No text chunks found for document '{request.doc_id}'."
        )

    try:
        llm = get_llm_service()
        questions = llm.generate_quiz(
            chunks=chunks,
            num_questions=request.num_questions,
            difficulty=request.difficulty
        )
        return QuizResponse(
            doc_id=request.doc_id,
            questions=questions
        )
    except GeminiConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except GeminiAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error handling /quiz: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate quiz: {str(e)}"
        )


@router.post(
    "/explain",
    response_model=ExplainResponse,
    summary="Explain a specific topic like a tutor based only on document content",
    responses={
        404: {"model": ErrorResponse, "description": "Document not found"},
        500: {"model": ErrorResponse, "description": "Explanation error"},
        503: {"model": ErrorResponse, "description": "Gemini API key unconfigured"}
    }
)
async def explain_topic(request: ExplainRequest):
    """
    Explains the topic simply like a tutor.
    Rule: If not found in document, replies: 'I couldn't find this in your document.'
    """
    store = get_vector_store()
    doc = store.get_document(request.doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{request.doc_id}' not found."
        )

    # Search for chunks specifically relevant to the topic in this document
    relevant_chunks = store.search(
        query=request.topic,
        doc_id=request.doc_id,
        top_k=5
    )

    # Fallback to general chunks if search returns empty
    if not relevant_chunks:
        relevant_chunks = store.get_all_chunks_for_doc(request.doc_id)[:5]

    try:
        llm = get_llm_service()
        explanation = llm.explain_topic(request.topic, relevant_chunks)
        return ExplainResponse(
            doc_id=request.doc_id,
            topic=request.topic,
            explanation=explanation
        )
    except GeminiConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except GeminiAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error handling /explain: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate explanation: {str(e)}"
        )
