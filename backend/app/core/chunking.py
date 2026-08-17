from dataclasses import dataclass


@dataclass
class TextChunk:
    text: str
    page_number: int
    chunk_index: int


def chunk_text(
    text: str,
    page_number: int,
    chunk_size: int = 500,
    overlap: int = 50,
) -> list[TextChunk]:
    words = text.split()
    chunks = []

    start = 0
    chunk_index = 0

    while start < len(words):
        end = start + chunk_size
        chunk_words = words[start:end]
        chunk = " ".join(chunk_words)

        chunks.append(
            TextChunk(
                text=chunk,
                page_number=page_number,
                chunk_index=chunk_index,
            )
        )

        chunk_index += 1
        start += chunk_size - overlap

    return chunks