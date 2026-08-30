import io
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, UploadFile

from app.routes import documents


class FakeQuery:
    def __init__(self, result=None):
        self.result = result

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def all(self):
        return self.result or []

    def first(self):
        return self.result


class FakeDB:
    def __init__(self, existing_document=None):
        self.existing_document = existing_document
        self.added = None
        self.committed = 0

    def query(self, model):
        return FakeQuery(self.existing_document)

    def add(self, document):
        self.added = document
        document.id = 123

    def commit(self):
        self.committed += 1

    def refresh(self, document):
        document.id = 123


def make_upload(
    filename="test.pdf",
    content=b"%PDF-1.7\nTest PDF",
):
    return UploadFile(
        file=io.BytesIO(content),
        filename=filename,
    )


def make_user(company_id=1):
    return SimpleNamespace(
        id=10,
        company_id=company_id,
    )


def test_upload_rejects_missing_filename():
    file = make_upload(filename="")

    with pytest.raises(HTTPException) as exc:
        documents.upload_document(
            file=file,
            db=FakeDB(),
            current_user=make_user(),
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Filename is required"


def test_upload_rejects_non_pdf():
    file = make_upload(
        filename="document.txt",
        content=b"not a pdf",
    )

    with pytest.raises(HTTPException) as exc:
        documents.upload_document(
            file=file,
            db=FakeDB(),
            current_user=make_user(),
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Only PDF files are supported"


def test_upload_rejects_duplicate_filename():
    existing = SimpleNamespace(
        id=50,
        filename="test.pdf",
        company_id=1,
        status="ready",
    )

    file = make_upload()

    with pytest.raises(HTTPException) as exc:
        documents.upload_document(
            file=file,
            db=FakeDB(existing_document=existing),
            current_user=make_user(company_id=1),
        )

    assert exc.value.status_code == 400
    assert (
        exc.value.detail
        == "A document with this filename already exists."
    )


def test_save_uploaded_file_rejects_invalid_pdf(tmp_path):
    file = make_upload(
        filename="fake.pdf",
        content=b"this is not a pdf",
    )

    file_path = tmp_path / "fake.pdf"

    with pytest.raises(HTTPException) as exc:
        documents.save_uploaded_file(
            file,
            str(file_path),
        )

    assert exc.value.status_code == 400
    assert (
        exc.value.detail
        == "The uploaded file is not a valid PDF."
    )


def test_save_uploaded_file_rejects_file_over_10mb(tmp_path):
    content = b"%PDF-1.7\n" + b"x" * (
        documents.MAX_FILE_SIZE + 1
    )

    file = make_upload(
        filename="large.pdf",
        content=content,
    )

    file_path = tmp_path / "large.pdf"

    with pytest.raises(HTTPException) as exc:
        documents.save_uploaded_file(
            file,
            str(file_path),
        )

    assert exc.value.status_code == 413
    assert (
        exc.value.detail
        == "PDF file size must not exceed 10 MB."
    )


def test_documents_are_company_scoped():
    documents_list = [
        SimpleNamespace(
            id=1,
            filename="company1.pdf",
            status="ready",
        )
    ]

    db = FakeDB()
    query = FakeQuery(documents_list)
    db.query = lambda model: query

    result = documents.get_documents(
        db=db,
        current_user=make_user(company_id=1),
    )

    assert result == [
        {
            "document_id": 1,
            "filename": "company1.pdf",
            "status": "ready",
        }
    ]


def test_delete_rejects_missing_document():
    db = FakeDB(existing_document=None)

    with pytest.raises(HTTPException) as exc:
        documents.delete_document(
            document_id=999,
            db=db,
            current_user=make_user(company_id=1),
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == "Document not found"


def test_filename_path_traversal_is_sanitized():
    result = documents.sanitize_filename(
        "../../secret.pdf"
    )

    assert result == "secret.pdf"


def test_filename_special_characters_are_sanitized():
    result = documents.sanitize_filename(
        'my<file>|test.pdf'
    )

    assert result == "my_file__test.pdf"


def test_filename_is_limited_to_255_characters():
    filename = "a" * 300 + ".pdf"

    result = documents.sanitize_filename(filename)

    assert len(result) == 255
    assert result.endswith(".pdf")


def test_filename_with_backslashes_is_sanitized():
    result = documents.sanitize_filename(
        r"..\..\secret.pdf"
    )

    assert result == "secret.pdf"


def test_filename_control_characters_are_removed():
    result = documents.sanitize_filename(
        "report\x00\x01.pdf"
    )

    assert result == "report.pdf"