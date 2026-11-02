import logging
from typing import List
from chromadb.utils import embedding_functions
from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL_NAME

logger = logging.getLogger(__name__)

_model_instance = None
_chroma_ef_instance = None


def get_sentence_transformer() -> SentenceTransformer:
    """Singleton getter for the SentenceTransformer model."""
    global _model_instance
    if _model_instance is None:
        logger.info(f"Loading SentenceTransformer model '{EMBEDDING_MODEL_NAME}'...")
        _model_instance = SentenceTransformer(EMBEDDING_MODEL_NAME)
        logger.info(f"SentenceTransformer '{EMBEDDING_MODEL_NAME}' successfully loaded.")
    return _model_instance


def get_chroma_embedding_function():
    """Returns the ChromaDB SentenceTransformer embedding function."""
    global _chroma_ef_instance
    if _chroma_ef_instance is None:
        _chroma_ef_instance = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL_NAME
        )
    return _chroma_ef_instance


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Encodes a list of texts into embedding vectors."""
    model = get_sentence_transformer()
    embeddings = model.encode(texts, convert_to_numpy=True)
    return embeddings.tolist()


def embed_query(text: str) -> List[float]:
    """Encodes a single query text into an embedding vector."""
    return embed_texts([text])[0]
