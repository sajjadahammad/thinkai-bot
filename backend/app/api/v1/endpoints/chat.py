import json
import uuid
import asyncio
import os
import base64
import mimetypes
from typing import Any, AsyncIterator, List, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import tiktoken
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage, SystemMessage

from datetime import datetime
from app.api.dependencies import get_db, get_current_user
from app.schemas.chat import ChatRequest
from app.models.chat import Conversation, Message, User
from app.services.pii_service import PIIRedactor
from app.services.agent_service import get_llm, normalize_model_name
from app.core.database import AsyncSessionLocal
from app.core.sdk import sdk_logger
from app.services import document_service

router = APIRouter()

def estimate_tokens(text: str, model_name: str = "gpt-3.5-turbo") -> int:
    """Helper to count/estimate tokens using tiktoken."""
    try:
        encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
        return len(encoding.encode(text))
    except Exception:
        return max(1, int(len(text) / 4))


def is_simple_greeting(message: str) -> bool:
    normalized = message.strip().lower().strip("!.?, ")
    return normalized in {
        "hello",
        "hi",
        "hey",
        "hhello",
        "helo",
        "good morning",
        "good afternoon",
        "good evening",
    }


def extract_text_content(content: Any) -> str:
    """Flatten provider-specific streamed content parts into displayable text."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, (list, tuple)):
        return "".join(extract_text_content(item) for item in content)
    if isinstance(content, dict):
        if "text" in content:
            return extract_text_content(content["text"])
        if "content" in content:
            return extract_text_content(content["content"])
        if "parts" in content:
            return extract_text_content(content["parts"])
        return ""
    if hasattr(content, "model_dump"):
        return extract_text_content(content.model_dump())
    if hasattr(content, "text"):
        return extract_text_content(content.text)
    if hasattr(content, "content"):
        return extract_text_content(content.content)
    return str(content)


@router.post("/upload")
async def upload_file(
    conversation_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload endpoint for PDF and image attachments.
    For PDFs: extracts text, chunks, embeds using Gemini text-embedding-004, and stores in pgvector.
    For Images: saves file to disk to be served statically and passed to vision LLM.
    """
    if not conversation_id or conversation_id == "null" or conversation_id == "undefined":
        # Create a new conversation if not specified
        new_conv = Conversation(title=f"Uploaded {file.filename}", user_id=current_user.id)
        db.add(new_conv)
        await db.flush()
        conversation_id = str(new_conv.id)
    else:
        # Verify ownership
        conv_uuid = uuid.UUID(conversation_id)
        res = await db.execute(
            select(Conversation).where(
                Conversation.id == conv_uuid,
                Conversation.user_id == current_user.id
            )
        )
        conv = res.scalar_one_or_none()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

    conv_uuid = uuid.UUID(conversation_id)
    filename = file.filename
    file_bytes = await file.read()

    # Determine file type
    file_lower = filename.lower()
    if file_lower.endswith(".pdf"):
        try:
            # RAG pipeline
            text = document_service.parse_pdf(file_bytes)
            if not text.strip():
                raise HTTPException(status_code=400, detail="PDF has no extractable text.")
            
            chunks = document_service.chunk_text(text)
            embeddings = await document_service.get_embeddings(chunks)
            await document_service.save_document_chunks(db, conv_uuid, filename, chunks, embeddings)
            
            return {
                "status": "success",
                "conversation_id": conversation_id,
                "filename": filename,
                "type": "pdf",
                "chunks_count": len(chunks)
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
            
    elif file_lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
        try:
            # Image saving pipeline
            unique_filename = f"{uuid.uuid4()}_{filename}"
            dest_dir = "app/uploads"
            os.makedirs(dest_dir, exist_ok=True)
            local_path = os.path.join(dest_dir, unique_filename)
            
            # Save file bytes
            with open(local_path, "wb") as buffer:
                buffer.write(file_bytes)
                
            relative_url = f"/uploads/{unique_filename}"
            return {
                "status": "success",
                "conversation_id": conversation_id,
                "filename": filename,
                "type": "image",
                "url": relative_url
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Only PDF and PNG/JPG/JPEG/WEBP/GIF images are supported."
        )


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
    model_name = normalize_model_name(req.provider, req.model)

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
        .where(
            Message.conversation_id == uuid.UUID(conv_id),
            Message.id != user_msg_id  # Fetch history before the current message
        )
        .order_by(Message.created_at)
    )
    history_db_messages = history_res.scalars().all()
    
    langchain_messages: List[BaseMessage] = []
    for m in history_db_messages:
        if m.role == "user":
            langchain_messages.append(HumanMessage(content=m.raw_content))
        elif m.role == "assistant":
            langchain_messages.append(AIMessage(content=m.raw_content))

    # 5. Construct current user message (handling vision for Gemini)
    if req.attachments and req.provider == "gemini":
        content_parts = [{"type": "text", "text": req.message}]
        for att in req.attachments:
            if att.get("type") == "image":
                url_path = att.get("url", "")
                filename = os.path.basename(url_path)
                local_path = os.path.join("app", "uploads", filename)
                if os.path.exists(local_path):
                    try:
                        with open(local_path, "rb") as img_f:
                            encoded = base64.b64encode(img_f.read()).decode("utf-8")
                        mime, _ = mimetypes.guess_type(local_path)
                        mime = mime or "image/jpeg"
                        content_parts.append({
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime};base64,{encoded}"
                            }
                        })
                    except Exception as e:
                        print(f"[Error] Failed to read image for vision input: {e}")
        langchain_messages.append(HumanMessage(content=content_parts))
    else:
        langchain_messages.append(HumanMessage(content=req.message))

    # 6. Build system instruction (incorporating requested tone and RAG context)
    system_parts = [
        (
            "You are OliveBot, a helpful assistant. For simple greetings or small talk, "
            "reply naturally and briefly. Do not ask for documents unless the user asks "
            "about a document or an uploaded document is directly relevant."
        )
    ]
    
    # Add tone instructions if specified
    if req.tone:
        tone_lower = req.tone.lower()
        if tone_lower == "formal":
            system_parts.append("Respond in a formal, professional, and structured tone. Use polished, sophisticated language.")
        elif tone_lower == "creative":
            system_parts.append("Respond in a creative, expressive, and engaging tone. Feel free to use rich language, analogies, or storytelling.")
        elif tone_lower == "precise":
            system_parts.append("Respond in a highly precise, objective, and factual tone. Avoid fluff and keep details accurate and structured.")
        elif tone_lower == "concise":
            system_parts.append("Respond in a very concise, direct, and brief tone. Answer the question as directly as possible and minimize explanation length.")

    # Retrieve relevant document chunks (RAG) if available
    relevant_chunks = []
    if not is_simple_greeting(req.message):
        relevant_chunks = await document_service.retrieve_relevant_chunks(db, uuid.UUID(conv_id), req.message, top_k=3)
    if relevant_chunks:
        context_text = "\n\n".join([
            f"[Source: {c.filename}, Chunk {c.chunk_index}]:\n{c.chunk_text}"
            for c in relevant_chunks
        ])
        system_parts.append(
            "Answer the user's question using the provided context. "
            "If the context doesn't contain the answer, use your general knowledge but clearly state that the answer "
            "was not found in the uploaded documents.\n\n"
            f"--- PROVIDER CONTEXT ---\n{context_text}\n-------------------"
        )
    
    if system_parts:
        system_instruction = "You are an intelligent assistant.\n\n" + "\n\n".join(system_parts)
        langchain_messages.insert(0, SystemMessage(content=system_instruction))

    async def sse_generator() -> AsyncIterator[str]:
        assistant_msg_id = uuid.uuid4()
        full_completion = []
        
        try:
            yield f"data: {json.dumps({'type': 'meta', 'conversation_id': conv_id, 'message_id': str(assistant_msg_id)})}\n\n"
            
            async with sdk_logger.log_inference(
                model=model_name,
                provider=req.provider,
                input_text=req.message,
                conversation_id=conv_id,
                message_id=str(assistant_msg_id)
            ) as tracker:
                
                llm = get_llm(req.provider, model_name)
                
                async for chunk in llm.astream(langchain_messages):
                    content_chunk = extract_text_content(chunk.content)
                    if not content_chunk:
                        continue
                    full_completion.append(content_chunk)
                    yield f"data: {json.dumps({'type': 'chunk', 'content': content_chunk})}\n\n"
                    await asyncio.sleep(0.005)
                
                final_text = "".join(full_completion)
                redacted_response = PIIRedactor.redact(final_text)
                
                tracker.set_output(final_text)
                tracker.set_tokens(
                    prompt_tokens=estimate_tokens(req.message, model_name),
                    completion_tokens=estimate_tokens(final_text, model_name)
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
