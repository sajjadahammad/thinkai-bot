import json
import uuid
import asyncio
from typing import AsyncIterator, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import tiktoken
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage

from datetime import datetime
from app.api.dependencies import get_db, get_current_user
from app.schemas.chat import ChatRequest
from app.models.chat import Conversation, Message, User
from app.services.pii_service import PIIRedactor
from app.services.agent_service import get_llm
from app.core.database import AsyncSessionLocal
from app.core.sdk import sdk_logger

router = APIRouter()

def estimate_tokens(text: str, model_name: str = "gpt-3.5-turbo") -> int:
    """Helper to count/estimate tokens using tiktoken."""
    try:
        encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
        return len(encoding.encode(text))
    except Exception:
        return max(1, int(len(text) / 4))


@router.post("/stream")
async def chat_stream(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Core Chat Endpoint. Handles incoming queries, applies PII Redaction,
    saves logs, streams responses using SSE, and fires the logging SDK.
    """
    # 1. Setup conversation
    conv_id = req.conversation_id
    if not conv_id:
        # Create a new conversation
        conv_title = req.message[:40] + ("..." if len(req.message) > 40 else "")
        new_conv = Conversation(title=conv_title, user_id=current_user.id)
        db.add(new_conv)
        await db.flush()
        conv_id = str(new_conv.id)
    else:
        # Update updated_at of conversation and verify ownership
        conv_uuid = uuid.UUID(conv_id)
        res = await db.execute(
            select(Conversation).where(
                Conversation.id == conv_uuid,
                Conversation.user_id == current_user.id
            )
        )
        conv = res.scalar_one_or_none()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conv.updated_at = datetime.utcnow()
        db.add(conv)
        await db.flush()

    # 2. Redact PII in user message
    redacted_prompt = PIIRedactor.redact(req.message)

    # 3. Store User message in DB
    user_msg_id = uuid.uuid4()
    user_msg = Message(
        id=user_msg_id,
        conversation_id=uuid.UUID(conv_id),
        role="user",
        content=redacted_prompt,
        raw_content=req.message
    )
    db.add(user_msg)
    await db.flush()

    # 4. Fetch history messages for conversational context
    history_res = await db.execute(
        select(Message)
        .where(Message.conversation_id == uuid.UUID(conv_id))
        .order_by(Message.created_at)
    )
    history_db_messages = history_res.scalars().all()
    
    langchain_messages: List[BaseMessage] = []
    for m in history_db_messages:
        if m.role == "user":
            langchain_messages.append(HumanMessage(content=m.raw_content))
        elif m.role == "assistant":
            langchain_messages.append(AIMessage(content=m.raw_content))

    async def sse_generator() -> AsyncIterator[str]:
        assistant_msg_id = uuid.uuid4()
        full_completion = []
        
        try:
            yield f"data: {json.dumps({'type': 'meta', 'conversation_id': conv_id, 'message_id': str(assistant_msg_id)})}\n\n"
            
            async with sdk_logger.log_inference(
                model=req.model,
                provider=req.provider,
                input_text=req.message,
                conversation_id=conv_id,
                message_id=str(assistant_msg_id)
            ) as tracker:
                
                llm = get_llm(req.provider, req.model)
                
                async for chunk in llm.astream(langchain_messages):
                    content_chunk = chunk.content
                    full_completion.append(content_chunk)
                    yield f"data: {json.dumps({'type': 'chunk', 'content': content_chunk})}\n\n"
                    await asyncio.sleep(0.005)
                
                final_text = "".join(full_completion)
                redacted_response = PIIRedactor.redact(final_text)
                
                tracker.set_output(final_text)
                tracker.set_tokens(
                    prompt_tokens=estimate_tokens(req.message, req.model),
                    completion_tokens=estimate_tokens(final_text, req.model)
                )

                # Store Assistant Message in DB
                assistant_msg = Message(
                    id=assistant_msg_id,
                    conversation_id=uuid.UUID(conv_id),
                    role="assistant",
                    content=redacted_response,
                    raw_content=final_text
                )
                
                async with AsyncSessionLocal() as local_session:
                    local_session.add(assistant_msg)
                    await local_session.commit()

            yield "data: [DONE]\n\n"

        except asyncio.CancelledError:
            print("[Info] Client cancelled streaming connection.")
            partial_text = "".join(full_completion)
            redacted_partial = PIIRedactor.redact(partial_text)
            
            async with AsyncSessionLocal() as local_session:
                partial_msg = Message(
                    id=assistant_msg_id,
                    conversation_id=uuid.UUID(conv_id),
                    role="assistant",
                    content=redacted_partial,
                    raw_content=partial_text + " [Generation Cancelled]"
                )
                local_session.add(partial_msg)
                await local_session.commit()
            
        except Exception as err:
            yield f"data: {json.dumps({'type': 'error', 'error': str(err)})}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")
