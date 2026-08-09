"""
Curoa.AI API — FastAPI application entry point.

Run locally with:
    uvicorn app.main:app --reload --port 8000

Interactive API docs are then available at /docs (Swagger) and /redoc.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, users, hospitals, conversations, chat

# Creates tables if they don't exist yet. In production, prefer Alembic
# migrations (see database/schema.sql + alembic/) over this convenience
# call, but it keeps local setup to a single command.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=f"{settings.app_name} API",
    description=(
        "Backend API for Curoa.AI — a healthcare AI assistant platform. "
        "Provides authentication, user profiles, saved chat conversations, "
        "a nearby-hospitals directory, and a placeholder /chat endpoint "
        "reserved for the medical AI model."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(hospitals.router, prefix=API_PREFIX)
app.include_router(conversations.router, prefix=API_PREFIX)
app.include_router(chat.router, prefix=API_PREFIX)


@app.get("/", tags=["health"])
def root():
    return {
        "service": settings.app_name,
        "status": "ok",
        "message": "Curoa.AI API is running. See /docs for endpoints.",
    }


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok"}
