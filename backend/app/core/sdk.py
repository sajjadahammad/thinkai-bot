import time
import asyncio
import httpx
import logging
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

from app.core.config import settings
from app.services.pii_service import PIIRedactor

logger = logging.getLogger(__name__)

class InferenceLoggerSDK:
    """
    A lightweight SDK that captures inference metadata and sends it to the
    ingestion pipeline API in near real-time.
    """
    
    def __init__(self, ingestion_url: Optional[str] = None):
        # Read ingestion endpoint from config settings
        self.ingestion_url = ingestion_url or settings.INGESTION_URL
        self.client = httpx.AsyncClient(timeout=3.0)
        self.background_tasks = set()
        logger.info(f"InferenceLoggerSDK initialized targeting {self.ingestion_url}")

    async def _send_log_request(self, payload: Dict[str, Any]):
        """Send the log payload via HTTP to the ingestion API."""
        try:
            response = await self.client.post(self.ingestion_url, json=payload)
            if response.status_code != 200:
                logger.error(f"Ingestion service returned status {response.status_code}: {response.text}")
        except Exception as e:
            # The SDK must fail-safe and never break the client application
            logger.error(f"SDK failed to send log: {e}")

    def capture_log(self, payload: Dict[str, Any]):
        """
        Triggers ingestion in a background task (fire-and-forget) to avoid blocking
        the main thread or response flow.
        """
        task = asyncio.create_task(self._send_log_request(payload))
        self.background_tasks.add(task)
        task.add_done_callback(self.background_tasks.discard)

    @asynccontextmanager
    async def log_inference(
        self,
        model: str,
        provider: str,
        input_text: str,
        conversation_id: Optional[str] = None,
        message_id: Optional[str] = None,
    ):
        """
        An async context manager to wrap LLM calls.
        It automatically tracks latency, status, exceptions, and sends metadata.
        """
        start_time = time.perf_counter()
        tracker = InferenceTracker()
        
        try:
            yield tracker
            status_code = 200
            error_message = None
        except Exception as e:
            status_code = 500
            error_message = str(e)
            tracker.set_error(error_message)
            raise e
        finally:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            
            # Redact previews before logging
            redacted_input = PIIRedactor.redact(input_text)
            redacted_output = PIIRedactor.redact(tracker.output_text)
            
            payload = {
                "conversation_id": conversation_id,
                "message_id": message_id,
                "model": model,
                "provider": provider,
                "latency_ms": latency_ms,
                "prompt_tokens": tracker.prompt_tokens,
                "completion_tokens": tracker.completion_tokens,
                "total_tokens": tracker.prompt_tokens + tracker.completion_tokens,
                "status_code": status_code,
                "error_message": error_message,
                "input_preview": redacted_input[:500],
                "output_preview": redacted_output[:500]
            }
            
            # Trigger ingestion
            self.capture_log(payload)

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()


class InferenceTracker:
    """Helper class to collect dynamic outputs and token details inside the context manager."""
    def __init__(self):
        self.output_text = ""
        self.prompt_tokens = 0
        self.completion_tokens = 0
        self.error_message = None

    def set_output(self, text: str):
        self.output_text = text

    def set_tokens(self, prompt_tokens: int, completion_tokens: int):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens

    def set_error(self, error_message: str):
        self.error_message = error_message


# Global instance of the SDK
sdk_logger = InferenceLoggerSDK()
