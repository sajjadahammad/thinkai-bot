import React from "react";
import { User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Message } from "../../lib/api";
import "../../styles/markdown.css";

interface ChatWindowProps {
  messages: Message[];
  isGenerating: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatWindow({ messages, isGenerating, messagesEndRef }: ChatWindowProps) {
  return (
    <div className="flex-1 max-w-3xl w-full flex flex-col space-y-6 relative z-10 pb-24">
      {messages.map((m) => {
        const isUser = m.role === "user";
        return (
          <div
            key={m.id}
            className={`flex gap-4 p-4 rounded-xl border ${
              isUser
                ? "bg-zinc-900/10 border-zinc-900/30 self-end max-w-[85%]"
                : "bg-[#0b0b0d] border-zinc-900/50 self-start max-w-[85%]"
            }`}
          >
            {/* Role Icon */}
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                isUser
                  ? "bg-zinc-800 text-zinc-300 border-zinc-700/60"
                  : "bg-emerald-950/40 text-emerald-400 border-emerald-900/30"
              }`}
            >
              {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            {/* Content */}
            <div className="space-y-1 overflow-hidden min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {isUser ? "User Query" : "OliveBot Response"}
              </span>
              {isUser ? (
                <p className="text-zinc-200 text-xs md:text-sm font-light leading-relaxed whitespace-pre-wrap">
                  {m.content}
                </p>
              ) : m.content ? (
                <div className="prose-chat">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              ) : (
                isGenerating && (
                  <span className="inline-block w-1.5 h-3.5 bg-emerald-400 animate-pulse" />
                )
              )}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
export default ChatWindow;

