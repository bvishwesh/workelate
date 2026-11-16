import React, { useState, useEffect } from 'react';
import { 
  History, 
  X, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Terminal,
  Code,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { TaskExecution } from '../types';

interface ExecutionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExecutionForInspection: (executionId: string) => void;
  onRetryExecution: (executionId: string) => void;
}

export const ExecutionHistoryModal: React.FC<ExecutionHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectExecutionForInspection,
  onRetryExecution
}) => {
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<TaskExecution | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'json' | 'logs'>('timeline');

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.listExecutions(30);
      setExecutions(data);
      if (data.length > 0) {
        // Load details for first execution
        loadExecutionDetail(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  const loadExecutionDetail = async (id: string) => {
    try {
      const detail = await api.getExecution(id);
      setSelectedExecution(detail);
    } catch (err) {
      console.error('Failed to load execution detail', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-800 flex items-center justify-between bg-dark-950/60">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-brand-cyan" />
            <div>
              <h2 className="text-base font-semibold text-white">Task Execution History</h2>
              <p className="text-xs text-slate-500">Persistent database records of previous autonomous runs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-dark-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split view (List on left, Details on right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Execution List */}
          <div className="w-80 border-r border-dark-800 overflow-y-auto p-3 space-y-1.5 bg-dark-950/40">
            {loading ? (
              <div className="text-center py-8 text-xs text-slate-500">Loading history...</div>
            ) : executions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No previous tasks recorded</div>
            ) : (
              executions.map((ex) => {
                const isSelected = selectedExecution?.id === ex.id;
                return (
                  <div
                    key={ex.id}
                    onClick={() => loadExecutionDetail(ex.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-dark-800 border-brand-purple/50 shadow-sm'
                        : 'bg-dark-900/60 border-dark-800 hover:bg-dark-850 hover:border-dark-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-slate-500">
                        {ex.id.slice(0, 8)}...
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        ex.execution_status === 'Completed'
                          ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                          : ex.execution_status === 'Running'
                          ? 'bg-indigo-950 border border-indigo-800 text-indigo-300'
                          : 'bg-red-950 border border-red-800 text-red-300'
                      }`}>
                        {ex.execution_status}
                      </span>
                    </div>

                    <p className="font-medium text-slate-200 line-clamp-2 leading-relaxed">
                      {ex.user_prompt}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{ex.pages_crawled} page(s)</span>
                      <span>{ex.execution_duration_seconds ? `${ex.execution_duration_seconds}s` : ''}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Selected Execution Detailed Inspector */}
          <div className="flex-1 overflow-y-auto flex flex-col bg-dark-900">
            {selectedExecution ? (
              <div className="flex-1 flex flex-col">
                {/* Detail Header */}
                <div className="p-4 border-b border-dark-800 bg-dark-950/40 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">User Prompt</div>
                    <div className="text-sm font-medium text-white mt-0.5">{selectedExecution.user_prompt}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRetryExecution(selectedExecution.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 text-xs font-medium transition-colors"
                      title="Rerun this task"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-brand-purple" />
                      <span>Rerun Task</span>
                    </button>
                  </div>
                </div>

                {/* Sub-tabs for Details */}
                <div className="px-4 py-2 border-b border-dark-800 bg-dark-900 flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setActiveTab('timeline')}
                    className={`px-3 py-1 rounded-md font-medium ${
                      activeTab === 'timeline' ? 'bg-dark-800 text-brand-purple border border-dark-700' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Timeline Events
                  </button>
                  <button
                    onClick={() => setActiveTab('json')}
                    className={`px-3 py-1 rounded-md font-medium ${
                      activeTab === 'json' ? 'bg-dark-800 text-brand-purple border border-dark-700' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    JSON Output
                  </button>
                  <button
                    onClick={() => setActiveTab('logs')}
                    className={`px-3 py-1 rounded-md font-medium ${
                      activeTab === 'logs' ? 'bg-dark-800 text-brand-purple border border-dark-700' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Technical Logs (stdout/stderr)
                  </button>
                </div>

                {/* Detail View Container */}
                <div className="p-5 flex-1 overflow-y-auto">
                  {activeTab === 'timeline' && (
                    <div className="space-y-3">
                      {selectedExecution.timeline_events && selectedExecution.timeline_events.length > 0 ? (
                        selectedExecution.timeline_events.map((ev, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-dark-950/60 border border-dark-800/80 text-xs">
                            <span className="font-mono text-slate-500">{String(idx + 1).padStart(2, '0')}.</span>
                            <div className="flex-1">
                              <div className="text-slate-200 font-medium">{ev.message}</div>
                              {ev.timestamp && <div className="text-[10px] text-slate-500 font-mono mt-0.5">{ev.timestamp}</div>}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              ev.status === 'completed' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                            }`}>
                              {ev.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-500 text-xs">No timeline events recorded for this task.</div>
                      )}
                    </div>
                  )}

                  {activeTab === 'json' && (
                    <pre className="font-mono text-xs text-purple-200 p-4 rounded-xl bg-dark-950 border border-dark-800 overflow-auto max-h-[500px] leading-relaxed">
                      {JSON.stringify(selectedExecution.final_output || {}, null, 2)}
                    </pre>
                  )}

                  {activeTab === 'logs' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div>
                        <div className="text-[11px] text-slate-400 font-semibold uppercase mb-1">Process Stderr</div>
                        <pre className="text-amber-300 bg-dark-950 p-3 rounded-lg border border-dark-800 max-h-48 overflow-y-auto whitespace-pre-wrap">
                          {selectedExecution.stderr || "No stderr recorded."}
                        </pre>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 font-semibold uppercase mb-1">Process Stdout</div>
                        <pre className="text-emerald-300 bg-dark-950 p-3 rounded-lg border border-dark-800 max-h-48 overflow-y-auto whitespace-pre-wrap">
                          {selectedExecution.stdout || "No stdout recorded."}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                Select an execution on the left to inspect
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
