import os

from google import genai

from app.core.vectorstore import query_chunks


client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def answer_question(question: str, company_id: int) -> dict:
    results = query_chunks(
        question,
        company_id=company_id,
        top_k=3,
    )

    retrieved_chunks = results["documents"][0]
    retrieved_metadatas = results["metadatas"][0]

    context = "\n\n".join(retrieved_chunks)

    prompt = f"""You are a helpful assistant answering questions based ONLY on the provided context.

If the answer is not in the context, say "I don't have enough information to answer that."

Context:
{context}

Question: {question}

Answer:"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    sources = []

    for text, metadata in zip(retrieved_chunks, retrieved_metadatas):
        sources.append(
            {
                "filename": metadata["filename"],
                "page_number": metadata["page_number"],
                "chunk_index": metadata["chunk_index"],
                "text": text,
            }
        )

    return {
        "answer": response.text,
        "sources": sources,
    }