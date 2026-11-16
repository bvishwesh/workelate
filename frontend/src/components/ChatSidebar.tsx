import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  History, 
  Terminal, 
  Trash2, 
  Cpu, 
  ShieldCheck, 
  Search,
  ChevronRight
} from 'lucide-react';
import { ChatSession } from '../types';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenHistoryModal: () => void;
  onToggleActivityPanel: () => void;
  isActivityPanelOpen: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenHistoryModal,
  onToggleActivityPanel,
  isActivityPanelOpen
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-72 bg-dark-950 border-r border-dark-800 flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-dark-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-purple to-brand-blue flex items-center justify-center shadow-lg shadow-brand-purple/20">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              WorkElate AI
              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-brand-purple/20 text-purple-300 border border-brand-purple/40">CLI</span>
            </h1>
            <p className="text-[11px] text-slate-500">Autonomous Agent</p>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-dark-850 hover:bg-dark-800 text-slate-200 border border-dark-700/80 font-medium text-xs transition-all shadow-sm hover:border-brand-purple/40"
        >
          <Plus className="w-4 h-4 text-brand-purple" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-900 border border-dark-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-purple/50"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-2 py-1">
          Recent Chats ({filteredSessions.length})
        </div>

        {filteredSessions.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-600">
            No chats found
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isSelected = session.id === currentSessionId;
            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-dark-800 text-white border border-dark-700 font-medium'
                    : 'text-slate-400 hover:bg-dark-900 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-brand-purple' : 'text-slate-500'}`} />
                  <span className="truncate">{session.title}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-slate-500 transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Navigation: Execution History & Activity Toggle */}
      <div className="p-3 border-t border-dark-800 space-y-1.5 bg-dark-950/80 text-xs">
        <button
          onClick={onOpenHistoryModal}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-300 hover:bg-dark-850 hover:text-white transition-colors border border-transparent hover:border-dark-700"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-brand-cyan" />
            <span>Task Execution History</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        </button>

        <button
          onClick={onToggleActivityPanel}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors border ${
            isActivityPanelOpen
              ? 'bg-brand-purple/10 text-purple-300 border-brand-purple/30'
              : 'text-slate-400 hover:bg-dark-850 hover:text-slate-200 border-transparent'
          }`}
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-purple" />
            <span>Activity Transparency</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-800 border border-dark-700 font-mono">
            {isActivityPanelOpen ? 'ON' : 'OFF'}
          </span>
        </button>

        <div className="pt-2 px-1 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Engine Online
          </span>
          <span className="font-mono text-[10px]">v1.0.0</span>
        </div>
      </div>
    </div>
  );
};
