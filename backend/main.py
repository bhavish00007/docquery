from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.core.rate_limit import RateLimitMiddleware

from app.models import company
from app.models import user
from app.models import document
from app.models import conversation
from app.models import message

from app.routes import auth
from app.routes import documents
from app.routes import query
from app.routes import chats


app = FastAPI(
    title="DocQuery API"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_middleware(
    RateLimitMiddleware
)


Base.metadata.create_all(
    bind=engine
)


app.include_router(
    query.router,
    prefix="",
    tags=["Query"],
)

app.include_router(
    auth.router,
    prefix="/auth",
    tags=["Auth"],
)

app.include_router(
    documents.router,
    prefix="/documents",
    tags=["Documents"],
)

app.include_router(
    chats.router,
    prefix="/chats",
    tags=["Chats"],
)


@app.get("/")
def root():
    return {
        "message": "DocQuery API is running"
    }