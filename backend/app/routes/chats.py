from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user

from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message


router = APIRouter()


@router.post("")
def create_chat(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = Conversation(
        title="New Chat",
        user_id=current_user.id,
        company_id=current_user.company_id,
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return {
        "chat_id": conversation.id,
        "title": conversation.title,
    }


@router.get("")
def get_chats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversations = (
        db.query(Conversation)
        .filter(
            Conversation.user_id == current_user.id,
            Conversation.company_id == current_user.company_id,
        )
        .order_by(
            Conversation.updated_at.desc(),
            Conversation.id.desc(),
        )
        .all()
    )

    return [
        {
            "chat_id": conversation.id,
            "title": conversation.title,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
        }
        for conversation in conversations
    ]


@router.get("/{chat_id}")
def get_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == chat_id,
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

    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation.id
        )
        .order_by(Message.created_at.asc(), Message.id.asc())
        .all()
    )

    return {
        "chat_id": conversation.id,
        "title": conversation.title,
        "messages": [
            {
                "message_id": message.id,
                "role": message.role,
                "content": message.content,
                "sources": message.sources or [],
                "created_at": message.created_at,
            }
            for message in messages
        ],
    }