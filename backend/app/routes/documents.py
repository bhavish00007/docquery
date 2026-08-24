import os
import shutil

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import pdfplumber

from app.core.database import get_db
from app.models.document import Document
from app.core.chunking import chunk_text
from app.core.vectorstore import add_chunks
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter()

UPLOAD_DIR = "uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)


def extract_text_from_pdf(file_path: str) -> list[tuple[int, str]]:
    pages = []

    with pdfplumber.open(file_path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            page_text = page.extract_text()

            if page_text:
                pages.append((page_number, page_text))

    return pages


@router.post("/upload")
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported",
        )

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    new_document = Document(
        filename=file.filename,
        company_id=current_user.company_id,
        status="processing",
    )

    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    pages = extract_text_from_pdf(file_path)

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

    return {
        "document_id": new_document.id,
        "filename": new_document.filename,
        "status": new_document.status,
        "extracted_characters": sum(
            len(page_text) for _, page_text in pages
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
        .filter(Document.company_id == current_user.company_id)
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