import { useState, useEffect, useRef } from "react";
import { Message, API_BASE_URL, getAccessToken } from "../lib/api";
import { useChatStore } from "../store/useChatStore";
import {
  useConversationsQuery,
  useConversationMessagesQuery,
  useDeleteConversationMutation,
} from "./useConversations";

const defaultPrompts = [
  "Get fresh perspectives on tricky problems",
  "Brainstorm creative ideas",
  "Rewrite message for maximum impact",
  "Summarize key points",
];

export function useChatSession() {
  const {
    sidebarOpen,
    setSidebarOpen,
    activeConversationId,
    setActiveConversationId,
    selectedModel,
    setSelectedModel,
    selectedTone,
    setSelectedTone,
    messages,
    setMessages,
    isGenerating,
    setIsGenerating,
    resetChat,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [promptCards, setPromptCards] = useState(defaultPrompts);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // TanStack Queries
  const { data: conversations = [], refetch: refetchConversations } = useConversationsQuery();
  const { data: fetchedMessages } = useConversationMessagesQuery(activeConversationId);
  const deleteConversationMutation = useDeleteConversationMutation();

  // Sync loaded messages with Zustand store
  useEffect(() => {
    if (activeConversationId && fetchedMessages) {
      setMessages(
        fetchedMessages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }))
      );
    }
  }, [fetchedMessages, activeConversationId, setMessages]);

  // Scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const startNewChat = () => {
    resetChat();
    setInput("");
    setSidebarOpen(false);
  };

  const selectConversation = (id: string) => {
    setActiveConversationId(id);
    setSidebarOpen(false);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat history?")) return;

    try {
      await deleteConversationMutation.mutateAsync(id);
      if (activeConversationId === id) {
        startNewChat();
      }
    } catch (err) {
      console.error("Error deleting conversation:", err);
    }
  };

  const handlePromptCardClick = (prompt: string) => {
    setInput(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const shufflePrompts = () => {
    const shuffled = [...promptCards].sort(() => Math.random() - 0.5);
    setPromptCards(shuffled);
  };

  // SSE Stream generator client handler
  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const userQuery = input.trim();
    setInput("");

    const tempUserMsgId = Math.random().toString();
    const newMessages: Message[] = [...messages, { id: tempUserMsgId, role: "user", content: userQuery }];
    setMessages(newMessages);
    setIsGenerating(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const assistantMsgId = Math.random().toString();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", content: "" }]);

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userQuery,
          conversation_id: activeConversationId,
          model: selectedModel.value,
          provider: selectedModel.provider,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("Streaming connection failure");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Body is not readable");

      const decoder = new TextDecoder();
      let assistantResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        const lines = textChunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") {
              break;
            }

            try {
              const dataObj = JSON.parse(dataStr);
              if (dataObj.type === "meta") {
                if (!activeConversationId) {
                  setActiveConversationId(dataObj.conversation_id);
                  refetchConversations();
                }
              } else if (dataObj.type === "chunk") {
                assistantResponse += dataObj.content;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantMsgId ? { ...m, content: assistantResponse } : m))
                );
              } else if (dataObj.type === "error") {
                throw new Error(dataObj.error);
              }
            } catch (jsonErr) {
              // Ignore invalid lines
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Stream aborted.");
      } else {
        console.error("Stream generation error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: `Error generating response: ${err.message || "Please check server status."}`,
                }
              : m
          )
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      refetchConversations();
    }
  };

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  return {
    sidebarOpen,
    setSidebarOpen,
    activeConversationId,
    selectedModel,
    setSelectedModel,
    selectedTone,
    setSelectedTone,
    messages,
    isGenerating,
    input,
    setInput,
    promptCards,
    messagesEndRef,
    textareaRef,
    conversations,
    startNewChat,
    selectConversation,
    deleteConversation,
    handlePromptCardClick,
    shufflePrompts,
    handleSendMessage,
    cancelGeneration,
  };
}
