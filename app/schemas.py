"""
Pydantic schemas — request/response shapes for the API.

Kept separate from the SQLAlchemy models (app/models.py) so the
database structure can evolve without automatically changing what the
API exposes to clients.
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ---------------- Auth ----------------

class SignupRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    full_name: str
    email: EmailStr
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------- Users ----------------

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=120)


# ---------------- Messages ----------------

class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    role: str
    content: str
    created_at: datetime


# ---------------- Conversations ----------------

class ConversationCreateRequest(BaseModel):
    title: Optional[str] = "New conversation"


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    created_at: datetime
    updated_at: datetime


class ConversationDetailOut(ConversationOut):
    messages: List[MessageOut] = []


# ---------------- Chat (placeholder) ----------------

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    conversation_id: Optional[str] = None
    disclaimer: str = (
        "Curoa.AI provides general health information and is not a substitute "
        "for professional medical advice, diagnosis, or treatment. If you are "
        "experiencing severe or emergency symptoms, contact a doctor or "
        "emergency services immediately."
    )


# ---------------- Hospitals ----------------

class HospitalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    type: Optional[str] = None
    address: str
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_open: Optional[bool] = None
    hours_note: Optional[str] = None
    emergency: bool = False
    rating: Optional[float] = None
    distance_km: Optional[float] = None  # computed at query time, not stored


class HospitalListResponse(BaseModel):
    results: List[HospitalOut]
    total: int
