from app.core import rag


def test_rag_filters_irrelevant_chunks(monkeypatch):
    def fake_query_chunks(
        question,
        company_id,
        top_k=3,
    ):
        return {
            "documents": [
                [
                    "Relevant information about the role.",
                    "Completely unrelated information.",
                ]
            ],
            "metadatas": [
                [
                    {
                        "filename": "company.pdf",
                        "page_number": 5,
                        "chunk_index": 2,
                    },
                    {
                        "filename": "unrelated.pdf",
                        "page_number": 20,
                        "chunk_index": 8,
                    },
                ]
            ],
            "distances": [
                [
                    0.5,
                    2.0,
                ]
            ],
        }

    class FakeResponse:
        text = "The role is Software Engineer."

    class FakeModels:
        def generate_content(
            self,
            model,
            contents,
        ):
            return FakeResponse()

    class FakeClient:
        models = FakeModels()

    monkeypatch.setattr(
        rag,
        "query_chunks",
        fake_query_chunks,
    )

    monkeypatch.setattr(
        rag,
        "get_gemini_client",
        lambda: FakeClient(),
    )

    result = rag.answer_question(
        "What is the role?",
        company_id=5,
    )

    assert (
        result["answer"]
        == "The role is Software Engineer."
    )

    assert len(result["sources"]) == 1

    assert (
        result["sources"][0]["filename"]
        == "company.pdf"
    )

    assert (
        result["sources"][0]["page_number"]
        == 5
    )


def test_rag_returns_no_sources_when_nothing_is_relevant(
    monkeypatch,
):
    def fake_query_chunks(
        question,
        company_id,
        top_k=3,
    ):
        return {
            "documents": [
                [
                    "Unrelated information.",
                    "More unrelated information.",
                ]
            ],
            "metadatas": [
                [
                    {
                        "filename": "company.pdf",
                        "page_number": 1,
                        "chunk_index": 0,
                    },
                    {
                        "filename": "company.pdf",
                        "page_number": 2,
                        "chunk_index": 1,
                    },
                ]
            ],
            "distances": [
                [
                    2.0,
                    2.5,
                ]
            ],
        }

    monkeypatch.setattr(
        rag,
        "query_chunks",
        fake_query_chunks,
    )

    result = rag.answer_question(
        "What is the annual revenue?",
        company_id=5,
    )

    assert (
        result["answer"]
        == "I don't have enough information to answer that."
    )

    assert result["sources"] == []


def test_rag_passes_company_id_to_retrieval(
    monkeypatch,
):
    captured = {}

    def fake_query_chunks(
        question,
        company_id,
        top_k=3,
    ):
        captured["question"] = question
        captured["company_id"] = company_id
        captured["top_k"] = top_k

        return {
            "documents": [
                [
                    "Company-specific information."
                ]
            ],
            "metadatas": [
                [
                    {
                        "filename": "company.pdf",
                        "page_number": 1,
                        "chunk_index": 0,
                    }
                ]
            ],
            "distances": [
                [
                    0.5
                ]
            ],
        }

    class FakeResponse:
        text = "Company-specific answer."

    class FakeModels:
        def generate_content(
            self,
            model,
            contents,
        ):
            return FakeResponse()

    class FakeClient:
        models = FakeModels()

    monkeypatch.setattr(
        rag,
        "query_chunks",
        fake_query_chunks,
    )

    monkeypatch.setattr(
        rag,
        "get_gemini_client",
        lambda: FakeClient(),
    )

    result = rag.answer_question(
        "What is this?",
        company_id=123,
    )

    assert (
        result["answer"]
        == "Company-specific answer."
    )

    assert captured["company_id"] == 123
    assert captured["top_k"] == 3