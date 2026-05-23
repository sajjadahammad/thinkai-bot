import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.schemas.chat import LogPayload
from app.models.chat import Conversation, InferenceLog, Message

router = APIRouter()


def parse_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(value)
    except ValueError:
        return None

@router.post("/", status_code=status.HTTP_200_OK)
async def ingest_log(payload: LogPayload, db: AsyncSession = Depends(get_db)):
    """
    Ingestion Pipeline endpoint. Receives logging payload from the SDK,
    validates the metrics and previews, and stores it in the database.
    """
    try:
        conv_id = parse_uuid(payload.conversation_id)
        msg_id = parse_uuid(payload.message_id)

        if conv_id:
            existing_conv_id = await db.scalar(
                select(Conversation.id).where(Conversation.id == conv_id)
            )
            if not existing_conv_id:
                conv_id = None

        if msg_id:
            message_conv_id = await db.scalar(
                select(Message.conversation_id).where(Message.id == msg_id)
            )
            if not message_conv_id:
                msg_id = None
            elif conv_id and message_conv_id != conv_id:
                msg_id = None
            elif not conv_id:
                conv_id = message_conv_id

        new_log = InferenceLog(
            conversation_id=conv_id,
            message_id=msg_id,
            model=payload.model,
            provider=payload.provider,
            latency_ms=payload.latency_ms,
            prompt_tokens=payload.prompt_tokens,
            completion_tokens=payload.completion_tokens,
            total_tokens=payload.total_tokens,
            status_code=payload.status_code,
            error_message=payload.error_message,
            input_preview=payload.input_preview,
            output_preview=payload.output_preview
        )
        db.add(new_log)
        await db.flush()
        return {"status": "success", "log_id": str(new_log.id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Log ingestion failed: {str(e)}")
