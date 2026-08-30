import os
import re

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    HTTPException,
)
from sqlalchemy.orm import Session
import pdfplumber

from app.core.database import get_db
from app.models.document import Document
from app.core.chunking import chunk_text
from app.core.vectorstore import (
    add_chunks,
    delete_document_chunks,
)
from app.core.deps import get_current_user
from app.models.user import User


router = APIRouter()

UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024
UPLOAD_CHUNK_SIZE = 1024 * 1024

os.makedirs(UPLOAD_DIR, exist_ok=True)


def sanitize_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    filename = filename.strip()

    # Remove control characters.
    filename = re.sub(r"[\x00-\x1f\x7f]", "", filename)

    # Replace filesystem-special characters.
    filename = re.sub(r'[<>:"/\\|?*]', "_", filename)

    if not filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required",
        )

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported",
        )

    # Keep the stored/displayed filename reasonably bounded.
    if len(filename) > 255:
        filename = filename[:251] + ".pdf"

    return filename


def extract_text_from_pdf(
    file_path: str,
) -> list[tuple[int, str]]:
    pages = []

    with pdfplumber.open(file_path) as pdf:
        for page_number, page in enumerate(
            pdf.pages,
            start=1,
        ):
            page_text = page.extract_text()

            if page_text:
                pages.append(
                    (
                        page_number,
                        page_text,
                    )
                )

    return pages


def save_uploaded_file(
    file: UploadFile,
    file_path: str,
) -> None:
    total_size = 0
    first_chunk = True

    try:
        with open(file_path, "wb") as buffer:
            while True:
                chunk = file.file.read(
                    UPLOAD_CHUNK_SIZE
                )

                if not chunk:
                    break

                if first_chunk:
                    first_chunk = False

                    if not chunk.startswith(b"%PDF-"):
                        raise HTTPException(
                            status_code=400,
                            detail="The uploaded file is not a valid PDF.",
                        )

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="PDF file size must not exceed 10 MB.",
                    )

                buffer.write(chunk)

    except HTTPException:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise


@router.post("/upload")
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required",
        )

    original_filename = sanitize_filename(
        file.filename
    )

    existing_document = (
        db.query(Document)
        .filter(
            Document.filename == original_filename,
            Document.company_id
            == current_user.company_id,
        )
        .first()
    )

    if existing_document:
        raise HTTPException(
            status_code=400,
            detail="A document with this filename already exists.",
        )

    new_document = Document(
        filename=original_filename,
        company_id=current_user.company_id,
        status="processing",
    )

    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    file_path = os.path.join(
        UPLOAD_DIR,
        f"document_{new_document.id}.pdf",
    )

    try:
        save_uploaded_file(
            file,
            file_path,
        )

        pages = extract_text_from_pdf(
            file_path
        )

        chunks = []
        global_chunk_index = 0

        for page_number, page_text in pages:
            page_chunks = chunk_text(
                page_text,
                page_number=page_number,
            )

            for chunk in page_chunks:
                chunk.chunk_index = global_chunk_index
                chunks.append(chunk)
                global_chunk_index += 1

        add_chunks(
            chunks,
            document_id=new_document.id,
            company_id=current_user.company_id,
            filename=new_document.filename,
        )

        new_document.status = "ready"
        db.commit()

    except HTTPException:
        new_document.status = "failed"
        db.commit()

        if os.path.exists(file_path):
            os.remove(file_path)

        raise

    except Exception:
        new_document.status = "failed"
        db.commit()

        if os.path.exists(file_path):
            os.remove(file_path)

        raise HTTPException(
            status_code=500,
            detail="Failed to process document",
        )

    return {
        "document_id": new_document.id,
        "filename": new_document.filename,
        "status": new_document.status,
        "extracted_characters": sum(
            len(page_text)
            for _, page_text in pages
        ),
        "chunks_created": len(chunks),
    }


@router.get("")
def get_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    documents = (
        db.query(Document)
        .filter(
            Document.company_id
            == current_user.company_id
        )
        .order_by(Document.id.desc())
        .all()
    )

    return [
        {
            "document_id": document.id,
            "filename": document.filename,
            "status": document.status,
        }
        for document in documents
    ]


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.company_id
            == current_user.company_id,
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    filename = document.filename

    file_path = os.path.join(
        UPLOAD_DIR,
        f"document_{document.id}.pdf",
    )

    deleted_chunks = delete_document_chunks(
        document_id=document.id,
        company_id=current_user.company_id,
    )

    db.delete(document)
    db.commit()

    if os.path.exists(file_path):
        os.remove(file_path)

    return {
        "document_id": document_id,
        "filename": filename,
        "deleted_chunks": deleted_chunks,
        "status": "deleted",
    }