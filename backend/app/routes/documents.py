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


def extract_text_from_pdf(file_path: str) -> str:
    full_text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                full_text += page_text + "\n"
    return full_text


@router.post("/upload")
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

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

    extracted_text = extract_text_from_pdf(file_path)
    chunks = chunk_text(extracted_text)
    add_chunks(chunks, document_id=new_document.id, company_id=current_user.company_id)

    new_document.status = "ready"
    db.commit()

    return {
        "document_id": new_document.id,
        "filename": new_document.filename,
        "status": new_document.status,
        "extracted_characters": len(extracted_text),
        "chunks_created": len(chunks),
    }