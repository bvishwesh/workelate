import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Terminal, 
  Shield, 
  SlidersHorizontal, 
  PanelRightClose, 
  PanelRightOpen,
  Sparkles,
  Bot,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from './services/api';
import { ChatSession, ChatMessage as ChatMessageType, CrawlConfig, TaskExecution } from './types';
import { useSSE } from './hooks/useSSE';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ActivityPanel } from './components/ActivityPanel';
import { CrawlConfigModal } from './components/CrawlConfigModal';
import { ExecutionHistoryModal } from './components/ExecutionHistoryModal';

export const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [inspectedExecutionId, setInspectedExecutionId] = useState<string | null>(null);
  const [inspectTaskData, setInspectTaskData] = useState<TaskExecution | null>(null);
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(true);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'technical'>('timeline');
  const [crawlConfig, setCrawlConfig] = useState<CrawlConfig>({ max_pages: 1, depth: 1 });
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentSessionIdRef = useRef<string | null>(currentSessionId);
  currentSessionIdRef.current = currentSessionId;
  const inspectedExecutionIdRef = useRef<string | null>(inspectedExecutionId);
  inspectedExecutionIdRef.current = inspectedExecutionId;

  // Load chat sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await api.listSessions();
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        selectSession(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  };

  const selectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    currentSessionIdRef.current = sessionId;
    setActiveStreamId(null);
    setLoadingMessages(true);
    try {
      const data = await api.getSession(sessionId);
      setMessages(data.messages || []);
      // If the latest message has an execution_id, inspect it without starting a stream
      const latestWithExec = [...(data.messages || [])].reverse().find(m => m.execution_id);
      if (latestWithExec?.execution_id) {
        setInspectedExecutionId(latestWithExec.execution_id);
        inspectedExecutionIdRef.current = latestWithExec.execution_id;
        loadExecutionDetails(latestWithExec.execution_id);
      } else {
        setInspectedExecutionId(null);
        setInspectTaskData(null);
      }
    } catch (err) {
      console.error('Failed to load session messages', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadExecutionDetails = async (executionId: string) => {
    try {
      const detail = await api.getExecution(executionId);
      setInspectTaskData(detail);
    } catch (err) {
      console.error('Failed to load execution detail', err);
    }
  };

  const handleNewSession = async () => {
    try {
      const newSession = await api.createSession('New Chat');
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      currentSessionIdRef.current = newSession.id;
      setMessages([]);
      setActiveStreamId(null);
      setInspectedExecutionId(null);
      setInspectTaskData(null);
    } catch (err) {
      console.error('Failed to create new session', err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await api.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          selectSession(remaining[0].id);
        } else {
          setCurrentSessionId(null);
          currentSessionIdRef.current = null;
          setMessages([]);
          setActiveStreamId(null);
          setInspectedExecutionId(null);
          setInspectTaskData(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  // Real-time SSE listener (only connects when activeStreamId is non-null)
  const {
    timelineEvents,
    stdoutLogs,
    stderrLogs,
    executionStatus,
    isStreaming,
    errorDetails,
    stop
  } = useSSE(activeStreamId, {
    onComplete: () => {
      // Reload messages to get assistant response & structured JSON
      const targetSessionId = currentSessionIdRef.current;
      if (targetSessionId) {
        api.getSession(targetSessionId).then((data) => {
          setMessages(data.messages || []);
        });
      }
      if (inspectedExecutionIdRef.current) {
        loadExecutionDetails(inspectedExecutionIdRef.current);
      }
      // Task finished, clear active stream
      setActiveStreamId(null);
    }
  });

  const handleStop = () => {
    stop();
    setActiveStreamId(null);
  };

  // Update in-flight message content with latest timeline step
  useEffect(() => {
    if (isStreaming && timelineEvents.length > 0) {
      const latest = timelineEvents[timelineEvents.length - 1];
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id.startsWith('in-flight-'));
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            content: latest.message
          };
          return next;
        }
        return prev;
      });
    }
  }, [timelineEvents, isStreaming]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (prompt: string, config: CrawlConfig) => {
    // Optimistic user message
    const tempUserMessage: ChatMessageType = {
      id: 'temp-' + Date.now(),
      session_id: currentSessionId || '',
      role: 'user',
      content: prompt,
      created_at: new Date().toISOString()
    };
    
    // In-flight placeholder for assistant response
    const inFlightPlaceholder: ChatMessageType = {
      id: 'in-flight-' + Date.now(),
      session_id: currentSessionId || '',
      role: 'assistant',
      content: 'Understanding your request...',
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMessage, inFlightPlaceholder]);
    setIsActivityPanelOpen(true);

    try {
      const res = await api.sendChatMessage(prompt, currentSessionId || undefined, config);
      setActiveStreamId(res.execution_id);
      setInspectedExecutionId(res.execution_id);
      inspectedExecutionIdRef.current = res.execution_id;
      if (!currentSessionId) {
        setCurrentSessionId(res.session_id);
        currentSessionIdRef.current = res.session_id;
        loadSessions();
      }
    } catch (err: any) {
      console.error('Failed to execute chat task', err);
      setActiveStreamId(null);
      // Replace in-flight message with error
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.id.startsWith('in-flight-'));
        const errMsg: ChatMessageType = {
          id: 'err-' + Date.now(),
          session_id: currentSessionId || '',
          role: 'assistant',
          content: `**Execution Error:** ${err.message || 'Could not initiate task.'}`,
          created_at: new Date().toISOString()
        };
        return [...filtered, errMsg];
      });
    }
  };

  const handleInspectExecution = (executionId: string) => {
    setInspectedExecutionId(executionId);
    inspectedExecutionIdRef.current = executionId;
    loadExecutionDetails(executionId);
    setIsActivityPanelOpen(true);
  };

  const handleRetryExecution = async (executionId: string) => {
    setIsHistoryModalOpen(false);
    try {
      const res = await api.retryExecution(executionId);
      setActiveStreamId(res.new_execution_id);
      setInspectedExecutionId(res.new_execution_id);
      inspectedExecutionIdRef.current = res.new_execution_id;
      setIsActivityPanelOpen(true);
      if (currentSessionId) {
        selectSession(currentSessionId);
      }
    } catch (err) {
      console.error('Failed to retry execution', err);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-dark-950 text-slate-100">
      {/* Sidebar */}
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onToggleActivityPanel={() => setIsActivityPanelOpen((prev) => !prev)}
        isActivityPanelOpen={isActivityPanelOpen}
      />

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-dark-900/40 relative">
        {/* Top Navbar */}
        <header className="h-14 border-b border-dark-800/80 px-6 flex items-center justify-between bg-dark-950/70 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-white tracking-wide">
              {sessions.find((s) => s.id === currentSessionId)?.title || 'New Conversation'}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-dark-800 text-slate-400 border border-dark-700">
              <Shield className="w-3 h-3 text-emerald-400" /> CLI Sandbox Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-xs text-slate-300 border border-dark-700/80 transition-colors"
              title="Crawler Parameters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-brand-purple" />
              <span className="hidden md:inline">Parameters</span>
            </button>

            <button
              onClick={() => setIsActivityPanelOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isActivityPanelOpen
                  ? 'bg-brand-purple/20 text-purple-200 border-brand-purple/40 shadow-sm'
                  : 'bg-dark-850 text-slate-400 hover:text-slate-200 border-dark-700/80'
              }`}
              title="Toggle Live Activity Transparency Panel"
            >
              <Cpu className="w-3.5 h-3.5 text-brand-purple" />
              <span className="hidden sm:inline">Live Activity</span>
              {isActivityPanelOpen ? <PanelRightClose className="w-3.5 h-3.5 ml-0.5" /> : <PanelRightOpen className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          </div>
        </header>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* Welcome / Landing Screen */
            <div className="h-full flex flex-col items-center justify-center p-6 max-w-2xl mx-auto text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-purple via-indigo-600 to-brand-blue flex items-center justify-center shadow-2xl shadow-brand-purple/30">
                <Bot className="w-8 h-8 text-white" />
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  WorkElate Autonomous CLI Agent
                </h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Converts natural language commands into verified CLI executions.
                  Crawl live websites, extract structured metadata, headings, paragraphs, and links,
                  and inspect complete chronological execution transparency.
                </p>
              </div>

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition-colors">
                  <div className="flex items-center gap-2 text-brand-purple text-xs font-semibold mb-1">
                    <Terminal className="w-4 h-4" /> Real CLI Process Invocation
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Spawns real subprocesses via controlled command registries with live stdout & stderr capture.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition-colors">
                  <div className="flex items-center gap-2 text-brand-cyan text-xs font-semibold mb-1">
                    <Cpu className="w-4 h-4" /> 15-Step Activity Transparency
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Verifies each step from request parsing, URL validation, and handshake to JSON synthesis.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition-colors">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                    <Shield className="w-4 h-4" /> Anti-SSRF & DNS Security
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enforces strict protocol checks, blocks internal IP ranges, and sanitizes API credentials.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition-colors">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                    <Sparkles className="w-4 h-4" /> Multi-tab Structured Results
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Browse AI executive summaries, extracted paragraphs, crawled pages, and downloadable JSON.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-dark-800/40">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onInspectExecution={handleInspectExecution}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isStreaming}
          onStop={handleStop}
          onOpenConfig={() => setIsConfigModalOpen(true)}
          crawlConfig={crawlConfig}
        />
      </div>

      {/* Right-Hand Live AI Activity Transparency Panel */}
      {isActivityPanelOpen && (
        <div className="w-96 shrink-0 h-full">
          <ActivityPanel
            executionId={inspectedExecutionId}
            events={activeStreamId === inspectedExecutionId && timelineEvents.length > 0 ? timelineEvents : (inspectTaskData?.timeline_events || [])}
            status={activeStreamId === inspectedExecutionId ? executionStatus : (inspectTaskData?.execution_status || (inspectedExecutionId ? 'Completed' : 'Pending'))}
            isStreaming={isStreaming && activeStreamId === inspectedExecutionId}
            errorDetails={activeStreamId === inspectedExecutionId ? errorDetails : (inspectTaskData?.error_message || null)}
            taskData={inspectTaskData}
            viewMode={viewMode}
            onToggleViewMode={setViewMode}
            onClose={() => setIsActivityPanelOpen(false)}
          />
        </div>
      )}

      {/* Crawl Parameters Configuration Modal */}
      <CrawlConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={crawlConfig}
        onSave={setCrawlConfig}
      />

      {/* Task Execution History Modal */}
      <ExecutionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onSelectExecutionForInspection={handleInspectExecution}
        onRetryExecution={handleRetryExecution}
      />
    </div>
  );
};
