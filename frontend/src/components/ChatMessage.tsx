import React, { useState } from 'react';
import { Bot, User, Copy, Check, Terminal, Cpu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType } from '../types';
import { StructuredResultView } from './StructuredResultView';

interface ChatMessageProps {
  message: ChatMessageType;
  onInspectExecution?: (executionId: string) => void;
  isCurrentStreaming?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onInspectExecution, isCurrentStreaming }) => {
  const isUser = message.role === 'user';
  const isInFlight = message.id.startsWith('in-flight-') || isCurrentStreaming;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`py-6 px-4 md:px-8 border-b border-dark-800/60 ${isUser ? 'bg-dark-950/30' : 'bg-dark-900/40'}`}>
      <div className="max-w-4xl mx-auto flex items-start gap-4">
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
          isUser 
            ? 'bg-dark-800 border-dark-600 text-slate-300' 
            : 'bg-brand-purple/20 border-brand-purple/50 text-brand-purple shadow-sm shadow-brand-purple/20'
        }`}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-300">
              {isUser ? 'You' : 'WorkElate Agent'}
            </span>
            <div className="flex items-center gap-2">
              {message.execution_id && onInspectExecution && (
                <button
                  onClick={() => onInspectExecution(message.execution_id!)}
                  className="flex items-center gap-1 text-[11px] text-brand-purple hover:text-purple-300 bg-brand-purple/10 hover:bg-brand-purple/20 px-2 py-0.5 rounded border border-brand-purple/30 transition-colors"
                  title="Inspect real-time execution steps"
                >
                  <Cpu className="w-3 h-3" />
                  <span>Activity Logs</span>
                </button>
              )}
              <button
                onClick={handleCopy}
                className="text-slate-500 hover:text-slate-300 p-1 rounded transition-colors"
                title="Copy message"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Message Text */}
          <div className="text-sm text-slate-200 leading-relaxed break-words prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-dark-950 prose-pre:border prose-pre:border-dark-800">
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : isInFlight ? (
              <div className="flex items-center gap-2.5 py-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-purple animate-ping"></span>
                <span className="font-mono text-xs text-purple-200 pulse-glow">
                  {message.content}
                </span>
              </div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {/* Structured Crawl Result Viewer if structured_data is present */}
          {message.structured_data && (
            <StructuredResultView
              data={message.structured_data}
              executionId={message.execution_id}
            />
          )}
        </div>
      </div>
    </div>
  );
};
