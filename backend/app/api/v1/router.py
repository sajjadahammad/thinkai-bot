from fastapi import APIRouter
from app.api.v1.endpoints import chat, logs, conversations, dashboard, auth

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(logs.router, prefix="/logs", tags=["logs"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

