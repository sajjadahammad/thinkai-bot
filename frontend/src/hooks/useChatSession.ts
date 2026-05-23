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

function getChunkContent(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(getChunkContent).join("");
  if (typeof content === "object") {
    const part = content as { text?: unknown; content?: unknown; parts?: unknown };
    return getChunkContent(part.text ?? part.content ?? part.parts);
  }
  return String(content);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

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
  const [attachedFiles, setAttachedFiles] = useState<{
    id: string;
    name: string;
    type: "image" | "pdf";
    url?: string;
    uploading: boolean;
  }[]>([]);

  const handleFileUpload = async (file: File) => {
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      alert("Unsupported file type. Only PDF and images (PNG/JPG/JPEG/GIF/WEBP) are supported.");
      return;
    }

    const tempId = Math.random().toString();
    const newAttachment = {
      id: tempId,
      name: file.name,
      type: (isPdf ? "pdf" as const : "image" as const),
      uploading: true,
    };

    setAttachedFiles((prev) => [...prev, newAttachment]);

    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("file", file);
      if (activeConversationId) {
        formData.append("conversation_id", activeConversationId);
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/chat/upload`, {
        method: "POST",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const data = await response.json();
      
      // Update activeConversationId if the backend generated one (e.g. upload on new chat)
      if (!activeConversationId && data.conversation_id) {
        setActiveConversationId(data.conversation_id);
      }

      setAttachedFiles((prev) =>
        prev.map((att) =>
          att.id === tempId
            ? { ...att, uploading: false, url: data.url || "" }
            : att
        )
      );
    } catch (err: unknown) {
      console.error("Upload error:", err);
      alert(`Failed to upload file: ${getErrorMessage(err, "Unknown error")}`);
      setAttachedFiles((prev) => prev.filter((att) => att.id !== tempId));
    }
  };

  const removeAttachment = (id: string) => {
    setAttachedFiles((prev) => prev.filter((att) => att.id !== id));
  };

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
        fetchedMessages.map((m) => ({
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
    const isUploading = attachedFiles.some((f) => f.uploading);
    if (isUploading) return;

    if ((!input.trim() && attachedFiles.length === 0) || isGenerating) return;

    let userQuery = input.trim();
    if (!userQuery && attachedFiles.length > 0) {
      userQuery = "Please analyze the uploaded document.";
    }
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
          tone: selectedTone,
          attachments: attachedFiles
            .filter((att) => !att.uploading)
            .map((att) => ({
              type: att.type,
              name: att.name,
              url: att.url,
            })),
        }),
        signal: abortController.signal,
      });

      // Clear attachments on submit
      setAttachedFiles([]);

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

            let dataObj: {
              type?: string;
              conversation_id?: string;
              content?: unknown;
              error?: unknown;
            };
            try {
              dataObj = JSON.parse(dataStr);
            } catch {
              continue;
            }

            if (dataObj.type === "meta") {
              if (!activeConversationId && dataObj.conversation_id) {
                setActiveConversationId(dataObj.conversation_id);
                refetchConversations();
              }
            } else if (dataObj.type === "chunk") {
              assistantResponse += getChunkContent(dataObj.content);
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, content: assistantResponse } : m))
              );
            } else if (dataObj.type === "error") {
              throw new Error(getChunkContent(dataObj.error) || "Streaming error");
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Stream aborted.");
      } else {
        console.error("Stream generation error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: `Error generating response: ${getErrorMessage(err, "Please check server status.")}`,
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
    attachedFiles,
    handleFileUpload,
    removeAttachment,
  };
}
