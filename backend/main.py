from fastapi import FastAPI
from app.core.database import Base, engine
from app.models import company, user
from app.routes import auth
from app.routes import documents
from app.routes import query

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DocQuery API")
app.include_router(query.router, prefix="", tags=["Query"])

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(documents.router, prefix="/documents", tags=["Documents"])

@app.get("/")
def root():
    return {"message": "DocQuery API is running"}