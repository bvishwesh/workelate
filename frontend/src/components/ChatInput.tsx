import React, { useState, useRef, useEffect } from 'react';
import { Send, SlidersHorizontal, Square, Globe, Sparkles } from 'lucide-react';
import { CrawlConfig } from '../types';

interface ChatInputProps {
  onSendMessage: (message: string, config: CrawlConfig) => void;
  isLoading: boolean;
  onStop?: () => void;
  onOpenConfig: () => void;
  crawlConfig: CrawlConfig;
}

const EXAMPLE_PROMPTS = [
  "Crawl https://example.com and summarize it.",
  "Extract structured information from https://news.ycombinator.com into JSON.",
  "Find all relevant links and headings on https://python.org with depth 2.",
  "Generate a structured JSON report from https://httpbin.org/html"
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  onStop,
  onOpenConfig,
  crawlConfig
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim(), crawlConfig);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 pb-4">
      {/* Example Prompt Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2 mb-2 scrollbar-none text-xs">
        <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-brand-purple" /> Suggested:
        </span>
        {EXAMPLE_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handlePromptClick(prompt)}
            className="px-2.5 py-1 rounded-full bg-dark-850 hover:bg-dark-800 text-slate-300 hover:text-white border border-dark-700/60 whitespace-nowrap transition-all text-[11px]"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Main Input Box */}
      <div className="relative rounded-2xl bg-dark-900 border border-dark-700/80 shadow-2xl focus-within:border-brand-purple/60 focus-within:ring-1 focus-within:ring-brand-purple/50 transition-all p-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask WorkElate to crawl and summarize any website (e.g. 'Crawl https://example.com and summarize it')..."
          className="w-full bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-48 leading-relaxed font-sans"
        />

        {/* Bottom Bar: Config Indicators & Action Buttons */}
        <div className="flex items-center justify-between pt-2 px-2 border-t border-dark-800/80 mt-1 text-xs">
          {/* Crawl Settings Pill */}
          <button
            onClick={onOpenConfig}
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-slate-200 border border-dark-700 transition-colors"
            title="Configure crawl depth and max pages"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-purple" />
            <span>Max Pages: {crawlConfig.max_pages}</span>
            <span className="text-slate-600">|</span>
            <span>Depth: {crawlConfig.depth}</span>
          </button>

          {/* Send / Stop Buttons */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs shadow transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!input.trim()}
                className={`p-2 rounded-xl text-white transition-all shadow-md ${
                  input.trim()
                    ? 'bg-gradient-to-r from-brand-purple to-brand-accent hover:opacity-90 shadow-brand-purple/20'
                    : 'bg-dark-800 text-slate-600 cursor-not-allowed border border-dark-700'
                }`}
                title="Execute AI task"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
