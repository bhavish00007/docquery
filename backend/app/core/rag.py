import os

from google import genai

from app.core.vectorstore import query_chunks


FALLBACK_ANSWER = (
    "I don't have enough information to answer that."
)

RELEVANCE_DISTANCE_THRESHOLD = float(
    os.getenv(
        "RELEVANCE_DISTANCE_THRESHOLD",
        "1.2",
    )
)


def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured."
        )

    return genai.Client(
        api_key=api_key
    )


def answer_question(
    question: str,
    company_id: int,
) -> dict:

    results = query_chunks(
        question,
        company_id=company_id,
        top_k=3,
    )

    retrieved_chunks = results.get(
        "documents",
        [[]],
    )[0]

    retrieved_metadatas = results.get(
        "metadatas",
        [[]],
    )[0]

    distances = results.get(
        "distances",
        [[]],
    )[0]

    relevant_chunks = []
    relevant_metadatas = []

    for text, metadata, distance in zip(
        retrieved_chunks,
        retrieved_metadatas,
        distances,
    ):
        if distance <= RELEVANCE_DISTANCE_THRESHOLD:
            relevant_chunks.append(text)
            relevant_metadatas.append(metadata)

    if not relevant_chunks:
        return {
            "answer": FALLBACK_ANSWER,
            "sources": [],
        }

    context = "\n\n".join(
        relevant_chunks
    )

    prompt = f"""
You are a helpful assistant answering questions
based ONLY on the provided context.

Rules:

1. Use only the provided context.
2. Do not use outside knowledge.
3. If the answer is not clearly supported by
   the context, say exactly:
   "{FALLBACK_ANSWER}"
4. Do not guess or invent information.
5. Keep the answer concise and directly answer
   the question.

Context:
{context}

Question:
{question}

Answer:
"""

    client = get_gemini_client()

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    answer = response.text.strip()

    if answer.lower() == FALLBACK_ANSWER.lower():
        return {
            "answer": FALLBACK_ANSWER,
            "sources": [],
        }

    sources = []

    for text, metadata in zip(
        relevant_chunks,
        relevant_metadatas,
    ):
        sources.append(
            {
                "filename": metadata["filename"],
                "page_number": metadata["page_number"],
                "chunk_index": metadata["chunk_index"],
                "text": text,
            }
        )

    return {
        "answer": answer,
        "sources": sources,
    }