import io
import uuid
import logging
import asyncio
import pypdf
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from langchain_text_splitters import RecursiveCharacterTextSplitter
from google import genai
from google.genai import types
from app.core.config import settings
from app.models.document import DocumentChunk

logger = logging.getLogger("uvicorn.error")

_client = None

def get_genai_client():
    """Lazily initialize Google GenAI Client."""
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client

def parse_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF file bytes using pypdf."""
    try:
        pdf_file = io.BytesIO(file_bytes)
        reader = pypdf.PdfReader(pdf_file)
        text_parts = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        return "\n\n".join(text_parts)
    except Exception as e:
        logger.error(f"Error parsing PDF: {e}", exc_info=True)
        raise ValueError(f"Could not parse PDF file: {str(e)}")

def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> list[str]:
    """Split text into smaller chunks recursively."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""]
    )
    return splitter.split_text(text)

async def get_embeddings(chunks: list[str]) -> list[list[float]]:
    """Generate vector embeddings for a list of text chunks using Gemini (1024 dimensions)."""
    if not chunks:
        return []
    try:
        client = get_genai_client()
        tasks = [
            client.aio.models.embed_content(
                model="gemini-embedding-2",
                contents=chunk,
                config=types.EmbedContentConfig(output_dimensionality=1024)
            )
            for chunk in chunks
        ]
        results = await asyncio.gather(*tasks)
        return [r.embeddings[0].values for r in results]
    except Exception as e:
        logger.error(f"Error generating Gemini embeddings: {e}", exc_info=True)
        return [[0.0] * 1024 for _ in chunks]

async def save_document_chunks(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    filename: str,
    chunks: list[str],
    embeddings: list[list[float]]
) -> None:
    """Save text chunks and their embeddings into the database."""
    try:
        for idx, (chunk_txt, chunk_emb) in enumerate(zip(chunks, embeddings)):
            db_chunk = DocumentChunk(
                conversation_id=conversation_id,
                filename=filename,
                chunk_index=idx,
                chunk_text=chunk_txt,
                embedding=chunk_emb
            )
            db.add(db_chunk)
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Error saving document chunks: {e}", exc_info=True)
        raise e

async def retrieve_relevant_chunks(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    query: str,
    top_k: int = 3
) -> list[DocumentChunk]:
    """Retrieve top_k most similar document chunks for a query in a specific conversation."""
    try:
        client = get_genai_client()
        res = await client.aio.models.embed_content(
            model="gemini-embedding-2",
            contents=query,
            config=types.EmbedContentConfig(output_dimensionality=1024)
        )
        query_emb = res.embeddings[0].values
        
        stmt = select(DocumentChunk).where(
            DocumentChunk.conversation_id == conversation_id
        ).order_by(
            DocumentChunk.embedding.cosine_distance(query_emb)
        ).limit(top_k)
        
        result = await db.execute(stmt)
        return list(result.scalars().all())
    except Exception as e:
        logger.error(f"Error retrieving relevant chunks: {e}", exc_info=True)
        return []
