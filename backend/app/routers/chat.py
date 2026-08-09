"""
Placeholder chat endpoint.

This is intentionally NOT connected to a medical AI model yet — per
the project's development order (frontend -> backend -> MySQL ->
hospitals -> AI chatbot), this endpoint exists so the frontend chat
UI has a real API contract to call against today, and so the model
can be dropped in later (see the TODO below) without changing the
request/response shape or the frontend code that calls it.

Auth is optional here on purpose: an unauthenticated visitor can
still try the chat UI, but their messages are not persisted. Signed-in
users get their conversation saved to MySQL so it appears in the
sidebar history.
"""

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import bearer_scheme
from app.auth_utils import decode_access_token

router = APIRouter(prefix="/chat", tags=["chat"])

PLACEHOLDER_REPLY = "Curoa.AI chatbot is currently being developed."


@router.post("", response_model=schemas.ChatResponse)
def send_chat_message(
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    # ------------------------------------------------------------------
    # TODO (final development phase): replace this block with a call to
    # the medical AI model/service, e.g.:
    #
    #   ai_reply = medical_ai_client.ask(
    #       message=payload.message,
    #       history=conversation.messages,
    #   )
    #
    # Keep the response model (schemas.ChatResponse) and the medical
    # disclaimer unchanged when that integration happens.
    # ------------------------------------------------------------------
    reply_text = PLACEHOLDER_REPLY

    conversation_id = payload.conversation_id
    user_id = decode_access_token(credentials.credentials) if credentials else None

    if user_id:
        conversation = None
        if conversation_id:
            conversation = (
                db.query(models.Conversation)
                .filter(models.Conversation.id == conversation_id, models.Conversation.user_id == user_id)
                .first()
            )
        if conversation is None:
            conversation = models.Conversation(
                user_id=user_id,
                title=payload.message[:60] + ("…" if len(payload.message) > 60 else ""),
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

        db.add(models.Message(conversation_id=conversation.id, role=models.MessageRole.user, content=payload.message))
        db.add(models.Message(conversation_id=conversation.id, role=models.MessageRole.assistant, content=reply_text))
        db.commit()
        conversation_id = conversation.id

    return schemas.ChatResponse(reply=reply_text, conversation_id=conversation_id)
