"""
SQLAlchemy ORM models — mirrors database/schema.sql.

Relationships:
  User (1) ---- (many) Conversation (1) ---- (many) Message

This lets a signed-in user save chatbot conversations and revisit them
later, which is the requirement the /conversations and /messages
endpoints are built around.
"""

import enum
import uuid

from sqlalchemy import (
    Column, String, Integer, Text, Boolean, DateTime, ForeignKey,
    Enum as SAEnum, Numeric, func,
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    full_name = Column(String(120), nullable=False)
    email = Column(String(190), unique=True, nullable=False, index=True)
    # bcrypt hash only — plaintext passwords are never stored (see auth_utils.py)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="New conversation")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="conversations")
    messages = relationship(
        "Message", back_populates="conversation",
        cascade="all, delete-orphan", order_by="Message.created_at",
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(SAEnum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    conversation = relationship("Conversation", back_populates="messages")


class Hospital(Base):
    """
    Hospital directory used by the Hospitals Near You rail and the
    hospitals search page. `latitude`/`longitude` are populated so a
    future maps/geolocation integration can compute real distances;
    until then, `distance_km` may be pre-computed or estimated by the
    hospitals router.
    """
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False, index=True)
    type = Column(String(100), nullable=True)          # e.g. "Urgent Care", "Pediatric Hospital"
    address = Column(String(300), nullable=False)
    phone = Column(String(40), nullable=True)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    is_open = Column(Boolean, nullable=True)            # null = unknown
    hours_note = Column(String(120), nullable=True)      # e.g. "Open 24 hours"
    emergency = Column(Boolean, default=False, nullable=False)
    rating = Column(Numeric(2, 1), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
