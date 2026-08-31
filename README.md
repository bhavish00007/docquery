<div align="center">

# DocQuery

### Multi-Tenant AI Document Q&A Platform

<p>
  Ask questions about your documents using grounded RAG, semantic search, and Google Gemini.
</p>

<p>
  <strong>Next.js</strong> · <strong>FastAPI</strong> · <strong>PostgreSQL</strong> · <strong>ChromaDB</strong> · <strong>Google Gemini</strong> · <strong>JWT</strong>
</p>

</div>

---

## Overview

DocQuery is a full-stack, multi-tenant AI document Q&A platform that allows organizations to upload documents and ask questions in natural language.

Documents are processed into chunks and stored as vectors in ChromaDB. When a user asks a question, DocQuery retrieves relevant chunks belonging only to that user's organization and uses Google Gemini to generate a context-grounded answer with source information.

The project is designed with authentication, tenant isolation, modular backend architecture, rate limiting, and automated testing.

## Features

- 📄 **Document ingestion** — PDF extraction, chunking, and vector storage
- 🔎 **Semantic search** — retrieves relevant document chunks using ChromaDB
- 🤖 **Grounded RAG** — Gemini answers using retrieved document context
- 🔐 **JWT authentication** — protected API access
- 🏢 **Multi-tenant isolation** — users can access only their organization's data
- 🛡️ **Rate limiting** — protects API endpoints from excessive requests
- 📚 **Source metadata** — answers can include document, page, and chunk information
- 🧪 **Automated tests** — authentication, dependencies, RAG, and rate limiting

## How It Works

```text
User
  │
  ▼
Next.js Frontend
  │
  │ JWT
  ▼
FastAPI Backend
  │
  ├── Authentication & Authorization
  │
  ├── PDF Processing
  │      └── Extract → Chunk → Embed
  │
  ├── ChromaDB
  │      └── Tenant-filtered semantic retrieval
  │
  └── RAG Pipeline
         ├── Retrieve relevant context
         ├── Check relevance
         ├── Generate answer with Gemini
         └── Return sources
```
## Tech Stack

| Layer           | Technology                        |
| --------------- | --------------------------------- |
| Frontend        | Next.js, TypeScript, Tailwind CSS |
| Backend         | Python, FastAPI                   |
| Database        | PostgreSQL                        |
| Vector Database | ChromaDB                          |
| LLM             | Google Gemini API                 |
| Authentication  | JWT, Bcrypt                       |
| API Protection  | Rate Limiting                     |
| Testing         | Pytest                            |
| Tools           | Git, GitHub, Postman              |

## Project Structure
```
docquery/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── chunking.py
│   │   │   ├── database.py
│   │   │   ├── deps.py
│   │   │   ├── rag.py
│   │   │   ├── rate_limit.py
│   │   │   ├── security.py
│   │   │   └── vectorstore.py
│   │   ├── models/
│   │   └── routes/
│   ├── tests/
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── next.config.ts
│
└── .gitignore
```
## RAG Pipeline
```
PDF
 ↓
Text Extraction
 ↓
Text Chunking
 ↓
Embeddings
 ↓
ChromaDB
 ↓
User Question
 ↓
Tenant-filtered Retrieval
 ↓
Relevance Filtering
 ↓
Relevant Context
 ↓
Google Gemini
 ↓
Grounded Answer + Sources
```
## Security
DocQuery uses JWT-based authentication and associates users with organizations.
Each stored document and vector chunk is linked to a company, while retrieval applies the corresponding tenant filter.
This prevents one organization's documents from being returned to another organization.
Protected API routes also use authenticated user context rather than accepting a company ID directly from the client.

## Running Locally

## Backend
```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
## Frontend
```
cd frontend
npm install
npm run dev
```
## Backend: http://127.0.0.1:8000
## Frontend: http://localhost:3000
## Environment variables are required in backend/.env

## Testing
From the backend directory:
```
pytest -q
```
