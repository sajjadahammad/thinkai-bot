import time
from typing import List, Dict, Any, Optional, Iterator
from typing_extensions import TypedDict

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, AIMessageChunk
from langchain_core.outputs import ChatResult, ChatGeneration, ChatGenerationChunk
from langchain_core.runnables import RunnableConfig
from langchain_mistralai import ChatMistralAI
from langgraph.graph import StateGraph, START, END

from app.core.config import settings

# ==========================================
# 1. Custom Mock Chat Model for Testability
# ==========================================
class MockChatModel(BaseChatModel):
    """
    A custom mock ChatModel that acts as a plug-and-play replacement
    for Mistral/Gemini when no API keys are provided. Supports streaming.
    """
    model_name: str = "mock-model"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        user_msg = messages[-1].content if messages else ""
        content = (
            f"Hello! I am a simulated response from {self.model_name}.\n\n"
            f"You said: \"{user_msg}\"\n\n"
            "This mock response allows you to verify that the frontend chat box, "
            "streaming UI, SDK logger, and database ingestion pipeline are fully functioning. "
            "To connect to live providers, please configure MISTRAL_API_KEY in your .env file."
        )
        generation = ChatGeneration(message=AIMessage(content=content))
        return ChatResult(generations=[generation])

    def _stream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> Iterator[ChatGenerationChunk]:
        user_msg = messages[-1].content if messages else ""
        response_text = (
            f"Hello! This is a streaming response from the simulated {self.model_name}.\n\n"
            f"You wrote: \"{user_msg}\"\n\n"
            "The system is capturing token metrics, measuring latency, and redacting "
            "PII in real-time. If you enter an email (like user@test.com) or phone number "
            "(like 555-0199), you will see it redacted in the database and dashboard metrics!\n\n"
            "Configure MISTRAL_API_KEY in your .env file to enable live Mistral chat."
        )
        
        words = response_text.split(" ")
        for i, word in enumerate(words):
            chunk_content = word + (" " if i < len(words) - 1 else "")
            yield ChatGenerationChunk(message=AIMessageChunk(content=chunk_content))
            time.sleep(0.04)

    @property
    def _llm_type(self) -> str:
        return "mock"


# ==========================================
# 2. LLM Provider Resolver
# ==========================================
def get_llm(provider: str, model_name: str) -> BaseChatModel:
    """
    Returns the appropriate LangChain ChatModel based on provider and model.
    Raises ValueError if API keys are missing for live providers.
    """
    provider = provider.lower()
    
    if provider == "mistral":
        api_key = settings.MISTRAL_API_KEY.strip() if settings.MISTRAL_API_KEY else ""
        if api_key:
            return ChatMistralAI(
                model=model_name or "mistral-large-latest",
                mistral_api_key=api_key,
                streaming=True
            )
        else:
            raise ValueError("MISTRAL_API_KEY is not configured in the backend .env file.")
            
    elif provider == "gemini":
        api_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
        if api_key:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                return ChatGoogleGenerativeAI(
                    model=model_name or "gemini-2.5-flash",
                    google_api_key=api_key,
                    streaming=True
                )
            except ImportError:
                raise ImportError("langchain-google-genai package is not installed. Please run `pip install langchain-google-genai`.")
        else:
            raise ValueError("GEMINI_API_KEY is not configured in the backend .env file.")
            
    else:
        return MockChatModel(model_name=model_name or "mock-model")


# ==========================================
# 3. LangGraph Setup
# ==========================================
class AgentState(TypedDict):
    messages: List[BaseMessage]


async def call_model(state: AgentState, config: RunnableConfig) -> Dict[str, Any]:
    """Node that invokes the LLM based on dynamic configuration."""
    messages = state["messages"]
    trimmed_messages = messages[-10:] if len(messages) > 10 else messages
    
    configurable = config.get("configurable", {})
    provider = configurable.get("provider", "mock")
    model_name = configurable.get("model", "mock-model")
    
    llm = get_llm(provider, model_name)
    response = await llm.ainvoke(trimmed_messages, config=config)
    return {"messages": [response]}


# Build the Graph
workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
workflow.add_edge(START, "agent")
workflow.add_edge("agent", END)

# Compile graph
chat_agent = workflow.compile()
