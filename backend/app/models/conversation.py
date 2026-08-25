from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func

from app.core.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    company_id = Column(
        Integer,
        ForeignKey("companies.id"),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )