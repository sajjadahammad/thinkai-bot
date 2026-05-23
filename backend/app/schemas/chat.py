import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    model: str = "mock-model"
    provider: str = "mock"

class LogPayload(BaseModel):
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None
    model: str
    provider: str
    latency_ms: int
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    status_code: int = 200
    error_message: Optional[str] = None
    input_preview: str
    output_preview: str

class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
