import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from config import CHROMA_PERSIST_DIR
from rag.embeddings import get_chroma_embedding_function

logger = logging.getLogger(__name__)


class VectorStoreManager:
    """Manages persistent ChromaDB vector storage and document catalog."""

    def __init__(self):
        logger.info(f"Initializing persistent ChromaDB at '{CHROMA_PERSIST_DIR}'...")
        self.client = chromadb.PersistentClient(
            path=str(CHROMA_PERSIST_DIR),
            settings=Settings(anonymized_telemetry=False)
        )
        self.embedding_fn = get_chroma_embedding_function()

        # Collection storing the embedded text chunks
        self.chunks_collection = self.client.get_or_create_collection(
            name="rag_chunks",
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"}
        )

        # Collection cataloging uploaded documents
        self.doc_catalog = self.client.get_or_create_collection(
            name="document_catalog",
            metadata={"hnsw:space": "cosine"}
        )
        logger.info("ChromaDB vector store initialized successfully.")

    def add_document(
        self,
        doc_id: str,
        filename: str,
        chunks: List[Dict[str, Any]],
        total_pages: int
    ) -> int:
        """
        Stores document chunks in ChromaDB and registers the document in the catalog.

        Args:
            doc_id: Unique ID for the document.
            filename: Original document filename.
            chunks: List of chunk dicts from chunker.py.
            total_pages: Total pages extracted from the original file.

        Returns:
            Number of chunks successfully stored.
        """
        if not chunks:
            raise ValueError(f"No chunks provided to store for document '{doc_id}'.")

        ids = [c["chunk_id"] for c in chunks]
        texts = [c["text"] for c in chunks]
        metadatas = [
            {
                "doc_id": str(c["doc_id"]),
                "filename": str(c["filename"]),
                "page": int(c.get("page", 1)),
                "chunk_index": int(c.get("chunk_index", 0))
            }
            for c in chunks
        ]

        # Batch insert chunks into ChromaDB (batch size: 100)
        batch_size = 100
        for i in range(0, len(chunks), batch_size):
            end = i + batch_size
            self.chunks_collection.upsert(
                ids=ids[i:end],
                documents=texts[i:end],
                metadatas=metadatas[i:end]
            )

        # Register document in catalog
        now_iso = datetime.now(timezone.utc).isoformat()
        self.doc_catalog.upsert(
            ids=[doc_id],
            documents=[filename],
            metadatas=[{
                "doc_id": doc_id,
                "filename": filename,
                "chunk_count": len(chunks),
                "total_pages": total_pages,
                "uploaded_at": now_iso
            }]
        )

        logger.info(f"Stored {len(chunks)} chunks for doc_id='{doc_id}' ({filename}).")
        return len(chunks)

    def list_documents(self) -> List[Dict[str, Any]]:
        """Lists all uploaded documents from the catalog."""
        records = self.doc_catalog.get(include=["metadatas"])
        docs: List[Dict[str, Any]] = []

        if records and records.get("metadatas"):
            for meta in records["metadatas"]:
                if meta:
                    docs.append({
                        "doc_id": meta.get("doc_id", ""),
                        "filename": meta.get("filename", ""),
                        "chunk_count": int(meta.get("chunk_count", 0)),
                        "total_pages": int(meta.get("total_pages", 1)),
                        "uploaded_at": meta.get("uploaded_at", "")
                    })

        # Sort newest first
        docs.sort(key=lambda d: d.get("uploaded_at", ""), reverse=True)
        return docs

    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves catalog metadata for a specific document ID."""
        records = self.doc_catalog.get(ids=[doc_id], include=["metadatas"])
        if records and records.get("ids") and len(records["ids"]) > 0:
            metas = records.get("metadatas", [])
            if metas and metas[0]:
                return metas[0]
        return None

    def delete_document(self, doc_id: str) -> bool:
        """
        Deletes a document and all its chunks from the vector store and catalog.

        Returns:
            True if document existed and was deleted, False if not found.
        """
        doc = self.get_document(doc_id)
        if not doc:
            return False

        # Delete all chunks for this doc_id
        try:
            self.chunks_collection.delete(where={"doc_id": doc_id})
        except Exception as e:
            logger.warning(f"Note on deleting chunks for {doc_id}: {e}")

        # Delete from catalog
        self.doc_catalog.delete(ids=[doc_id])
        logger.info(f"Deleted document '{doc_id}' and all associated chunks.")
        return True

    def search(
        self,
        query: str,
        doc_id: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Searches for top_k most relevant chunks using cosine similarity.

        Args:
            query: Question or search query.
            doc_id: Optional doc_id filter.
            top_k: Number of chunks to retrieve (default: 5).

        Returns:
            List of matching chunks with metadata, snippet, and distance.
        """
        count = self.chunks_collection.count()
        if count == 0:
            return []

        where_filter = {"doc_id": doc_id} if doc_id else None

        actual_k = min(top_k, count)
        try:
            results = self.chunks_collection.query(
                query_texts=[query],
                n_results=actual_k,
                where=where_filter,
                include=["documents", "metadatas", "distances"]
            )
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []

        hits: List[Dict[str, Any]] = []
        if not results or not results.get("ids") or len(results["ids"]) == 0:
            return hits

        doc_texts = results["documents"][0] if results.get("documents") else []
        metas = results["metadatas"][0] if results.get("metadatas") else []
        distances = results["distances"][0] if results.get("distances") else []

        for idx in range(len(doc_texts)):
            meta = metas[idx] if idx < len(metas) else {}
            chunk_text = doc_texts[idx]
            dist = distances[idx] if idx < len(distances) else 1.0

            # Generate a 200 character snippet
            snippet = chunk_text.replace("\n", " ").strip()
            if len(snippet) > 220:
                snippet = snippet[:220].rsplit(" ", 1)[0] + "..."

            hits.append({
                "text": chunk_text,
                "snippet": snippet,
                "filename": meta.get("filename", "Unknown"),
                "page": int(meta.get("page", 1)),
                "doc_id": meta.get("doc_id", ""),
                "chunk_index": int(meta.get("chunk_index", 0)),
                "distance": dist
            })

        return hits

    def get_all_chunks_for_doc(self, doc_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves all chunks for a document ordered by chunk_index.
        Used for map-reduce summarization, keypoints, and quiz generation.
        """
        results = self.chunks_collection.get(
            where={"doc_id": doc_id},
            include=["documents", "metadatas"]
        )

        chunks: List[Dict[str, Any]] = []
        if not results or not results.get("ids"):
            return chunks

        doc_texts = results.get("documents", [])
        metas = results.get("metadatas", [])

        for idx in range(len(doc_texts)):
            meta = metas[idx] if idx < len(metas) else {}
            chunks.append({
                "text": doc_texts[idx],
                "filename": meta.get("filename", ""),
                "page": int(meta.get("page", 1)),
                "doc_id": doc_id,
                "chunk_index": int(meta.get("chunk_index", 0))
            })

        # Ensure strictly ascending chunk order
        chunks.sort(key=lambda c: c["chunk_index"])
        return chunks


# Singleton store instance
_store_instance: Optional[VectorStoreManager] = None


def get_vector_store() -> VectorStoreManager:
    """Returns singleton instance of VectorStoreManager."""
    global _store_instance
    if _store_instance is None:
        _store_instance = VectorStoreManager()
    return _store_instance
