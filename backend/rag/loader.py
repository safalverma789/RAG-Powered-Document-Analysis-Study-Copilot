import io
import os
from typing import List, Dict, Any
from pypdf import PdfReader


class DocumentLoaderError(Exception):
    """Base exception for document loading errors."""
    pass


class EmptyDocumentError(DocumentLoaderError):
    """Raised when a document contains no extractable text."""
    pass


class InvalidFileTypeError(DocumentLoaderError):
    """Raised when an unsupported file type is provided."""
    pass


def load_file_content(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """
    Extracts text and page metadata from uploaded PDF or TXT files.

    Args:
        file_bytes: Raw bytes of the uploaded file.
        filename: Name of the uploaded file including extension.

    Returns:
        List of dicts: [{"page": int, "text": str}]

    Raises:
        InvalidFileTypeError: If file is not PDF or TXT.
        EmptyDocumentError: If document contains no readable text.
        DocumentLoaderError: For corrupted or unreadable files.
    """
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        return _load_pdf(file_bytes, filename)
    elif ext == ".txt":
        return _load_txt(file_bytes, filename)
    else:
        raise InvalidFileTypeError(
            f"Unsupported file format '{ext}'. Only .pdf and .txt files are supported."
        )


def _load_pdf(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """Extract text from a PDF file per page using pypdf."""
    if not file_bytes:
        raise EmptyDocumentError(f"The PDF file '{filename}' is completely empty (0 bytes).")

    try:
        reader = PdfReader(io.BytesIO(file_bytes))
    except Exception as e:
        raise DocumentLoaderError(f"Failed to parse PDF '{filename}'. File may be corrupt or encrypted: {str(e)}")

    if len(reader.pages) == 0:
        raise EmptyDocumentError(f"The PDF file '{filename}' contains 0 pages.")

    pages_data: List[Dict[str, Any]] = []
    total_text_length = 0

    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        try:
            page_text = page.extract_text() or ""
        except Exception:
            page_text = ""

        # Normalize line endings and extra whitespace
        cleaned_text = page_text.strip()
        if cleaned_text:
            total_text_length += len(cleaned_text)
            pages_data.append({
                "page": page_num,
                "text": cleaned_text
            })

    if total_text_length == 0 or not pages_data:
        raise EmptyDocumentError(
            f"The uploaded PDF '{filename}' contains no extractable text. "
            "It may be empty or contain only scanned images/photos without an OCR text layer."
        )

    return pages_data


def _load_txt(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """Extract text from a TXT file."""
    if not file_bytes:
        raise EmptyDocumentError(f"The text file '{filename}' is empty (0 bytes).")

    # Attempt decodings with common encodings
    decoded_text = None
    for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            decoded_text = file_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if decoded_text is None:
        raise DocumentLoaderError(f"Unable to decode text file '{filename}' using supported character encodings.")

    cleaned_text = decoded_text.strip()
    if not cleaned_text:
        raise EmptyDocumentError(f"The text file '{filename}' contains no readable text.")

    return [{"page": 1, "text": cleaned_text}]
