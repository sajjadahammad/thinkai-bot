import React from "react";
import { RotateCw } from "lucide-react";

interface PromptGridProps {
  promptCards: string[];
  onPromptClick: (prompt: string) => void;
  onShuffle: () => void;
}

export function PromptGrid({ promptCards, onPromptClick, onShuffle }: PromptGridProps) {
  return (
    <div className="flex flex-col items-center space-y-5 w-full">
      {/* 4 Quick Action Prompt Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
        {promptCards.map((prompt, index) => (
          <div
            key={index}
            onClick={() => onPromptClick(prompt)}
            className="p-4 bg-[#0d0d0f] border border-zinc-900 rounded-xl hover:border-zinc-850 cursor-pointer hover:bg-zinc-900/30 transition-all text-left group"
          >
            <p className="text-xs md:text-[13px] text-zinc-400 group-hover:text-zinc-200 transition-colors font-medium">
              {prompt}
            </p>
          </div>
        ))}
      </div>

      {/* Shuffle button */}
      <button
        onClick={onShuffle}
        className="flex items-center gap-1.5 text-[11px] text-zinc-550 hover:text-zinc-350 transition-colors group"
      >
        <RotateCw className="w-3 h-3 group-hover:rotate-180 transition-all duration-300" />
        Refresh prompts
      </button>
    </div>
  );
}
export default PromptGrid;
