import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, get_current_user
from app.schemas.chat import ConversationResponse, MessageResponse
from app.models.chat import Conversation, Message, User

router = APIRouter()

@router.get("/", response_model=List[ConversationResponse])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all authenticated user conversations ordered by updated time."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(desc(Conversation.updated_at))
    )
    return result.scalars().all()


@router.get("/{conv_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conv_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all messages in a specific conversation for resuming."""
    try:
        conv_uuid = uuid.UUID(conv_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")
        
    # Check ownership
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conv_uuid, Conversation.user_id == current_user.id)
    )
    conv = conv_result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv_uuid)
        .order_by(Message.created_at)
    )
    return result.scalars().all()


@router.delete("/{conv_id}", status_code=status.HTTP_200_OK)
async def delete_conversation(
    conv_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a conversation (cascades deletes to messages & inference logs)."""
    try:
        conv_uuid = uuid.UUID(conv_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")

    # Check ownership
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conv_uuid, Conversation.user_id == current_user.id)
    )
    conv = conv_result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.execute(delete(Conversation).where(Conversation.id == conv_uuid))
    return {"status": "success", "message": f"Conversation {conv_id} deleted."}
