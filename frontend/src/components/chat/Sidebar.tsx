import React from "react";
import { Plus, Database, MessageSquare, Trash2, X } from "lucide-react";
import { Conversation } from "../../lib/api";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onStartNewChat: () => void;
  onOpenDashboard: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onStartNewChat,
  onOpenDashboard,
}: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#09090b]/95 backdrop-blur-md border-r border-zinc-900/80 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-900">
          <span className="text-sm font-semibold tracking-tight text-zinc-200">Chat History</span>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Actions */}
        <div className="p-3 space-y-2">
          <button
            onClick={onStartNewChat}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-850 rounded-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            New Chat
          </button>

          <button
            onClick={onOpenDashboard}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-950/20 hover:bg-emerald-950/30 text-emerald-400 text-xs font-medium border border-emerald-900/30 rounded-lg transition-all"
          >
            <Database className="w-3.5 h-3.5" />
            Metrics Dashboard
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {conversations.length > 0 ? (
            conversations.map((conv) => {
              const isActive = activeConversationId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-xs font-medium transition-all ${
                    isActive
                      ? "bg-zinc-900 text-zinc-100 border border-zinc-800"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden pr-2">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-emerald-400" : "text-zinc-500"}`}
                    />
                    <span className="truncate">{conv.title}</span>
                  </div>
                  <button
                    onClick={(e) => onDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 rounded transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="h-40 flex items-center justify-center text-zinc-650 text-xs font-light">
              No saved chats
            </div>
          )}
        </div>
      </div>

      {/* Overlay background when sidebar is open */}
      {isOpen && (
        <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px]" />
      )}
    </>
  );
}
export default Sidebar;
