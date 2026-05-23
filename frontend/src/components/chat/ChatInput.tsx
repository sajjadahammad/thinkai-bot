import React, { useState, useRef, useEffect } from "react";
import { Image as ImageIcon, Paperclip, ChevronDown, Send, Square, X, FileText, Loader2 } from "lucide-react";

interface ModelOption {
  name: string;
  value: string;
  provider: string;
  disabled?: boolean;
}

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  isGenerating: boolean;
  onSend: (e?: React.FormEvent) => void;
  onCancel: () => void;
  selectedModel: ModelOption;
  setSelectedModel: (m: ModelOption) => void;
  selectedTone: string;
  setSelectedTone: (t: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  attachedFiles: { id: string; name: string; type: "image" | "pdf"; url?: string; uploading: boolean }[];
  onFileUpload: (file: File) => void;
  onRemoveAttachment: (id: string) => void;
}

export function ChatInput({
  input,
  setInput,
  isGenerating,
  onSend,
  onCancel,
  selectedModel,
  setSelectedModel,
  selectedTone,
  setSelectedTone,
  textareaRef,
  attachedFiles,
  onFileUpload,
  onRemoveAttachment,
}: ChatInputProps) {
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showToneDropdown, setShowToneDropdown] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement | null>(null);
  const toneDropdownRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isUploading = attachedFiles.some((f) => f.uploading);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(e.target as Node)
      ) {
        setShowModelDropdown(false);
      }
      if (
        toneDropdownRef.current &&
        !toneDropdownRef.current.contains(e.target as Node)
      ) {
        setShowToneDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const modelsList: ModelOption[] = [
    { name: "Mistral Large (Smart)", value: "mistral-large-latest", provider: "mistral" },
    { name: "Gemini 2.5 Flash", value: "gemini-2.5-flash", provider: "gemini" },
    { name: "Gemini 2.5 Pro", value: "gemini-2.5-pro-preview-06-05", provider: "gemini" },
    { name: "Mock Chat Model", value: "mock-model", provider: "mock" },
    { name: "GPT-4o (OpenAI)", value: "gpt-4o", provider: "openai", disabled: true },
    { name: "Claude Sonnet 4 (Anthropic)", value: "claude-sonnet-4", provider: "anthropic", disabled: true },
    { name: "Grok 3 (xAI)", value: "grok-3", provider: "xai", disabled: true },
  ];

  const tonesList = ["Formal", "Creative", "Precise", "Concise"];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      e.target.value = ""; // Reset so same file can be uploaded again
    }
  };

  return (
    <div className="p-4 bg-gradient-to-t from-[#070708] via-[#070708]/95 to-transparent border-t border-zinc-950/20 sticky bottom-0 z-20 flex justify-center w-full">
      <div className="max-w-3xl w-full flex flex-col space-y-2">
        {/* Hidden inputs for uploading */}
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf"
          className="hidden"
        />

        {/* Input Box Card container */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
          className="bg-[#0c0c0e] border border-zinc-900 rounded-2xl flex flex-col p-3 shadow-2xl relative"
        >
          {/* File attachment preview chips */}
          {attachedFiles && attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2 pb-2">
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800/40 text-xs text-zinc-350 relative group animate-fade-in"
                >
                  {file.type === "image" ? (
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span className="max-w-[120px] truncate text-[11px] font-light text-zinc-300">
                    {file.name}
                  </span>
                  {file.uploading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-zinc-550" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(file.id)}
                      className="p-0.5 hover:bg-zinc-850 rounded text-zinc-500 hover:text-zinc-350 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How can OliveBot help you today?"
            rows={1}
            className="w-full text-zinc-200 text-sm bg-transparent border-0 focus:ring-0 outline-none resize-none placeholder:text-zinc-650 min-h-[40px] px-2 py-1"
          />

          {/* Action Buttons & Dropdowns Toolbar */}
          <div className="flex items-center justify-between border-t border-zinc-900/60 pt-2.5 mt-2.5 px-1 relative">
            {/* Left controls: Selectors */}
            <div className="flex items-center gap-1.5 z-40">
              {/* Model Selector Dropdown */}
              <div className="relative" ref={modelDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModelDropdown(!showModelDropdown);
                    setShowToneDropdown(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 bg-zinc-900/80 hover:bg-zinc-800 border border-transparent rounded-lg transition-all"
                >
                  {selectedModel.name}
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                </button>
                {showModelDropdown && (
                  <div className="absolute bottom-full left-0 mb-1.5 w-60 bg-[#0c0c0e] border border-zinc-900/50 rounded-lg shadow-xl overflow-hidden py-1">
                    {modelsList.map((m, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={m.disabled}
                        onClick={() => {
                          if (!m.disabled) {
                            setSelectedModel(m);
                            setShowModelDropdown(false);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                          m.disabled
                            ? "text-zinc-700 cursor-not-allowed"
                            : selectedModel.value === m.value
                            ? "text-emerald-400 font-semibold hover:bg-zinc-900"
                            : "text-zinc-400 hover:bg-zinc-900"
                        }`}
                      >
                        <span>{m.name}</span>
                        {m.disabled && (
                          <span className="text-[9px] bg-zinc-900 text-zinc-600 px-1.5 py-0.5 rounded-full">Soon</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tone selector dropdown */}
              <div className="relative" ref={toneDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowToneDropdown(!showToneDropdown);
                    setShowModelDropdown(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 bg-zinc-900/40 hover:bg-zinc-900/60 border border-transparent rounded-lg transition-all"
                >
                  {selectedTone}
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-650" />
                </button>
                {showToneDropdown && (
                  <div className="absolute bottom-full left-0 mb-1.5 w-32 bg-[#0c0c0e] border border-zinc-900/50 rounded-lg shadow-xl overflow-hidden py-1">
                    {tonesList.map((t, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedTone(t);
                          setShowToneDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-zinc-900 ${
                          selectedTone === t ? "text-emerald-400 font-semibold" : "text-zinc-400"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right controls: Upload files & Send button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="p-1.5 text-zinc-500 hover:text-zinc-350 transition-colors"
                title="Upload Image (Vision)"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-zinc-500 hover:text-zinc-350 transition-colors"
                title="Attach PDF (RAG)"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {isGenerating ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="p-2 bg-red-955/80 hover:bg-red-900 border border-red-900/50 text-red-400 rounded-lg transition-all"
                  title="Stop generating"
                >
                  <Square className="w-3.5 h-3.5 fill-red-400" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={(!input.trim() && attachedFiles.length === 0) || isUploading}
                  className="p-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-900/60 text-emerald-400 rounded-lg disabled:opacity-40 disabled:hover:bg-emerald-950 transition-all flex items-center justify-center min-w-[32px] min-h-[32px]"
                  title="Send message"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <Send className="w-3.5 h-3.5 fill-emerald-400" />
                  )}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Disclaimer and helper tags */}
        <div className="flex items-center justify-between text-[10px] text-zinc-650 px-1 font-light">
          <span>OliveBot can make mistakes. Please double-check responses.</span>
          <span>
            Use{" "}
            <kbd className="bg-zinc-900 border border-transparent px-1 rounded text-zinc-500 font-sans">
              shift + return
            </kbd>{" "}
            for new line
          </span>
        </div>
      </div>
    </div>
  );
}
export default ChatInput;
