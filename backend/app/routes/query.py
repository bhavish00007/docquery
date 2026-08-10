from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.rag import answer_question
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter()


class QueryRequest(BaseModel):
    question: str


@router.post("/query")
def query_documents(request: QueryRequest, current_user: User = Depends(get_current_user)):
    result = answer_question(request.question, current_user.company_id)
    return result