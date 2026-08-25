from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rag import answer_question
from app.core.deps import get_current_user

from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message


router = APIRouter()


class QueryRequest(BaseModel):
    question: str
    chat_id: int | None = None


def create_chat_title(question: str) -> str:
    title = question.strip()

    if len(title) > 60:
        title = title[:57] + "..."

    return title or "New Chat"


@router.post("/query")
def query_documents(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty",
        )

    conversation = None

    if request.chat_id is not None:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == request.chat_id,
                Conversation.user_id == current_user.id,
                Conversation.company_id == current_user.company_id,
            )
            .first()
        )

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Chat not found",
            )

    else:
        conversation = Conversation(
            title=create_chat_title(question),
            user_id=current_user.id,
            company_id=current_user.company_id,
        )

        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    try:
        result = answer_question(
            question,
            current_user.company_id,
        )

        answer = result["answer"]
        sources = result.get("sources", [])

        user_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=question,
            sources=None,
        )

        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=answer,
            sources=sources,
        )

        db.add(user_message)
        db.add(assistant_message)

        db.commit()

        return {
            "chat_id": conversation.id,
            "answer": answer,
            "sources": sources,
        }

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to process query",
        )