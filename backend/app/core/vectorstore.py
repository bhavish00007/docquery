import chromadb
from chromadb.utils import embedding_functions
import os

CHROMA_DIR = "chroma_data"
os.makedirs(CHROMA_DIR, exist_ok=True)

chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)

collection = chroma_client.get_or_create_collection(name="documents")


def add_chunks(chunks: list[str], document_id: int, company_id: int):
    ids = [f"doc{document_id}_chunk{i}" for i in range(len(chunks))]
    metadatas = [{"company_id": company_id, "document_id": document_id} for _ in chunks]

    collection.add(
        documents=chunks,
        ids=ids,
        metadatas=metadatas,
    )


def query_chunks(question: str, company_id: int, top_k: int = 3):
    results = collection.query(
        query_texts=[question],
        n_results=top_k,
        where={"company_id": company_id},
    )
    return results