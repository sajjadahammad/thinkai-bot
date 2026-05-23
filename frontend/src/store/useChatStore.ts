import { create } from "zustand";
import { Message } from "../types";

export interface ModelOption {
  name: string;
  value: string;
  provider: string;
  disabled?: boolean;
}

interface ChatState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  selectedModel: ModelOption;
  setSelectedModel: (model: ModelOption) => void;
  selectedTone: string;
  setSelectedTone: (tone: string) => void;
  messages: Message[];
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  selectedModel: {
    name: "Mistral Large (Smart)",
    value: "mistral-large-latest",
    provider: "mistral",
  },
  setSelectedModel: (model) => set({ selectedModel: model }),
  selectedTone: "Formal",
  setSelectedTone: (tone) => set({ selectedTone: tone }),
  messages: [],
  setMessages: (messages) =>
    set((state) => ({
      messages: typeof messages === "function" ? messages(state.messages) : messages,
    })),
  isGenerating: false,
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  resetChat: () => set({ activeConversationId: null, messages: [] }),
}));
