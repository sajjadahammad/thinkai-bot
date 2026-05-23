import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.schemas.chat import LogPayload
from app.models.chat import InferenceLog

router = APIRouter()

@router.post("/", status_code=status.HTTP_200_OK)
async def ingest_log(payload: LogPayload, db: AsyncSession = Depends(get_db)):
    """
    Ingestion Pipeline endpoint. Receives logging payload from the SDK,
    validates the metrics and previews, and stores it in the database.
    """
    try:
        conv_id = None
        if payload.conversation_id:
            try:
                conv_id = uuid.UUID(payload.conversation_id)
            except ValueError:
                pass
                
        msg_id = None
        if payload.message_id:
            try:
                msg_id = uuid.UUID(payload.message_id)
            except ValueError:
                pass

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
