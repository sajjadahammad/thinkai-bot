"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";

import { Sidebar } from "../components/chat/Sidebar";
import { PromptGrid } from "../components/chat/PromptGrid";
import { ChatWindow } from "../components/chat/ChatWindow";
import { ChatInput } from "../components/chat/ChatInput";
import { useAuth } from "../components/providers/AuthProvider";
import { useChatSession } from "../hooks/useChatSession";

export default function Home() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const {
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
  } = useChatSession();

  return (
    <div className="flex h-screen bg-[#070708] text-zinc-100 overflow-hidden font-sans relative">
      {/* 1. Left Drawer Sidebar (Chat History) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onDeleteConversation={deleteConversation}
        onStartNewChat={startNewChat}
        onOpenDashboard={() => router.push("/dashboard")}
      />

      {/* 2. Main Page Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Navigation Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-900/50 bg-[#070708]/80 backdrop-blur-md z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900/60 border border-zinc-850 rounded-lg flex items-center gap-2 group"
          >
            <Menu className="w-4 h-4" />
            <div className="flex items-center gap-1.5 font-semibold text-zinc-200 text-sm">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              OliveBot
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-900 rounded-lg px-2.5 py-1.5 bg-zinc-900/40 hover:bg-zinc-900"
            >
              Logout
            </button>
            <div className="w-8 h-8 rounded-full bg-zinc-850 border border-zinc-700/60 flex items-center justify-center text-zinc-200 text-xs font-semibold select-none">
              {user?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {/* Central Chat Thread / Landing State */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-8 relative">
          {messages.length === 0 ? (
            /* landing screen */
            <div className="flex-1 max-w-3xl w-full flex flex-col items-center justify-center space-y-8 my-auto relative z-10">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-[200px] h-[200px] bg-emerald-400/10 rounded-full blur-[60px] animate-pulse" />
                <div
                  className="w-16 h-16 rounded-full blur-[2px] shadow-[0_0_50px_15px_rgba(52,211,153,0.5)] border border-emerald-300/30"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(16,185,129,1) 0%, rgba(5,150,105,0.75) 45%, rgba(4,120,87,0.2) 100%)",
                  }}
                />
              </div>

              <div className="text-center space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight text-white">
                  Good evening, {user?.full_name || "User"}
                </h1>
                <h2 className="text-3xl md:text-4xl font-bold font-heading tracking-tight text-white/95">
                  Can I help you with anything?
                </h2>
                <p className="text-zinc-500 text-xs md:text-sm max-w-md mx-auto font-light">
                  Choose a prompt below or write your own to start chatting with OliveBot
                </p>
              </div>

              <PromptGrid
                promptCards={promptCards}
                onPromptClick={handlePromptCardClick}
                onShuffle={shufflePrompts}
              />
            </div>
          ) : (
            /* thread chat */
            <ChatWindow messages={messages} isGenerating={isGenerating} messagesEndRef={messagesEndRef} />
          )}
        </div>

        {/* Chat input box form */}
        <ChatInput
          input={input}
          setInput={setInput}
          isGenerating={isGenerating}
          onSend={handleSendMessage}
          onCancel={cancelGeneration}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          selectedTone={selectedTone}
          setSelectedTone={setSelectedTone}
          textareaRef={textareaRef}
          attachedFiles={attachedFiles}
          onFileUpload={handleFileUpload}
          onRemoveAttachment={removeAttachment}
        />
      </div>
    </div>
  );
}
