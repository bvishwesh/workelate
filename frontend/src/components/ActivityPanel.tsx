import React from 'react';
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Loader2, 
  Clock, 
  Terminal, 
  ShieldCheck, 
  Cpu, 
  FileText,
  ExternalLink
} from 'lucide-react';
import { TimelineEvent, TaskExecution } from '../types';

interface ActivityPanelProps {
  executionId: string | null;
  events: TimelineEvent[];
  status: string;
  isStreaming: boolean;
  errorDetails?: string | null;
  taskData?: TaskExecution | null;
  viewMode: 'timeline' | 'technical';
  onToggleViewMode: (mode: 'timeline' | 'technical') => void;
  onClose?: () => void;
}

const EXPECTED_STEPS = [
  { step: 1, label: "Understanding your request..." },
  { step: 2, label: "Identified task: Website crawling." },
  { step: 3, label: "Extracted URL..." },
  { step: 4, label: "Validating URL and security restrictions..." },
  { step: 5, label: "Creating execution plan..." },
  { step: 6, label: "Selecting website crawler CLI..." },
  { step: 7, label: "Starting CLI process..." },
  { step: 8, label: "CLI process started successfully." },
  { step: 9, label: "Connecting to website..." },
  { step: 10, label: "Extracting page content..." },
  { step: 11, label: "Processing extracted information..." },
  { step: 12, label: "Generating structured JSON..." },
  { step: 13, label: "Validating JSON output..." },
  { step: 14, label: "Generating final summary..." },
  { step: 15, label: "Task completed successfully." }
];

export const ActivityPanel: React.FC<ActivityPanelProps> = ({
  executionId,
  events,
  status,
  isStreaming,
  errorDetails,
  taskData,
  viewMode,
  onToggleViewMode,
  onClose
}) => {
  if (!executionId && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
        <Cpu className="w-10 h-10 mb-3 text-slate-600 animate-pulse" />
        <h4 className="font-medium text-slate-300">Live AI Activity Transparency</h4>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Submit a crawling task to watch real-time step verification, security screening, and CLI execution.
        </p>
      </div>
    );
  }

  // Map received events by step_index
  const eventMap = new Map<number, TimelineEvent>();
  events.forEach((ev) => {
    if (ev.step_index !== undefined) {
      eventMap.set(ev.step_index, ev);
    }
  });

  const getStatusBadge = () => {
    switch (status) {
      case 'Completed':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/70 border border-emerald-700/60 text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed</span>;
      case 'Running':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-950/70 border border-indigo-700/60 text-indigo-300"><Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" /> Running</span>;
      case 'Failed':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-950/70 border border-red-700/60 text-red-300"><AlertCircle className="w-3.5 h-3.5 text-red-400" /> Failed</span>;
      case 'Timed out':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/70 border border-amber-700/60 text-amber-300"><Clock className="w-3.5 h-3.5 text-amber-400" /> Timed Out</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-900 border-l border-dark-700/80 shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between bg-dark-950/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-brand-purple" />
          <h3 className="text-sm font-semibold text-slate-200 tracking-wide">Live Activity Transparency</h3>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-dark-800 rounded text-slate-400 hover:text-slate-200 transition-colors ml-1 text-xs"
              title="Close panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* View Switcher Tabs: Timeline vs Technical */}
      <div className="px-4 py-2 border-b border-dark-800 bg-dark-900/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 bg-dark-800/80 p-0.5 rounded-lg border border-dark-700">
          <button
            onClick={() => onToggleViewMode('timeline')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              viewMode === 'timeline'
                ? 'bg-brand-purple text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Activity Timeline
          </button>
          <button
            onClick={() => onToggleViewMode('technical')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              viewMode === 'technical'
                ? 'bg-brand-purple text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Technical Logs
          </button>
        </div>

        {executionId && (
          <div className="font-mono text-[10px] text-slate-500 truncate max-w-[140px]" title={executionId}>
            ID: {executionId.slice(0, 8)}...
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {errorDetails && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-lg text-xs text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-300">Execution Error</div>
              <p className="mt-0.5 text-red-200/90 leading-relaxed">{errorDetails}</p>
            </div>
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-dark-700">
            {EXPECTED_STEPS.map((stepDef) => {
              const ev = eventMap.get(stepDef.step);
              let icon = <Circle className="w-4 h-4 text-slate-600 bg-dark-900" />;
              let textColor = 'text-slate-500';
              let message = stepDef.label;
              let isCurrent = false;

              if (ev) {
                message = ev.message || stepDef.label;
                if (ev.status === 'completed') {
                  icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 bg-dark-900" />;
                  textColor = 'text-slate-200 font-normal';
                } else if (ev.status === 'in_progress') {
                  icon = <Loader2 className="w-4 h-4 text-brand-purple animate-spin bg-dark-900" />;
                  textColor = 'text-brand-purple font-medium pulse-glow';
                  isCurrent = true;
                } else if (ev.status === 'failed') {
                  icon = <AlertCircle className="w-4 h-4 text-red-400 bg-dark-900" />;
                  textColor = 'text-red-400 font-medium';
                }
              }

              return (
                <div key={stepDef.step} className="relative flex items-start gap-3 group">
                  <span className="absolute -left-6 top-0.5 z-10">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs ${textColor} leading-tight break-words flex items-center justify-between`}>
                      <span>
                        <span className="font-mono text-[10px] text-slate-500 mr-1.5">
                          {String(stepDef.step).padStart(2, '0')}.
                        </span>
                        {message}
                      </span>
                      {ev && ev.timestamp && (
                        <span className="text-[10px] text-slate-500 ml-2 font-mono shrink-0">
                          {ev.timestamp.split(' ')[1] || ev.timestamp}
                        </span>
                      )}
                    </div>

                    {/* Step details snippet if available */}
                    {ev?.details && Object.keys(ev.details).length > 0 && (
                      <div className="mt-1 px-2 py-1 bg-dark-800/60 rounded border border-dark-700/50 text-[11px] text-slate-400 font-mono">
                        {ev.details.url && <div>URL: <span className="text-brand-cyan">{ev.details.url}</span></div>}
                        {ev.details.max_pages && <div>Max Pages: {ev.details.max_pages} | Depth: {ev.details.depth}</div>}
                        {ev.details.tool && <div>Selected CLI: <span className="text-purple-400">{ev.details.tool}</span></div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Technical Developer View */}
        {viewMode === 'technical' && (
          <div className="space-y-4 text-xs font-mono">
            {/* Metadata Card */}
            <div className="bg-dark-950 p-3 rounded-lg border border-dark-800 space-y-1.5">
              <div className="text-slate-400 font-semibold mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5 text-brand-purple" /> Execution Metadata
              </div>
              <div className="flex justify-between py-0.5 border-b border-dark-800/80">
                <span className="text-slate-500">Execution ID:</span>
                <span className="text-slate-300">{executionId || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-dark-800/80">
                <span className="text-slate-500">Selected CLI:</span>
                <span className="text-brand-purple">{taskData?.selected_tool || 'web_crawler'}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-dark-800/80">
                <span className="text-slate-500">Execution Status:</span>
                <span className="text-slate-200">{status}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-dark-800/80">
                <span className="text-slate-500">Exit Code:</span>
                <span className={taskData?.exit_code === 0 ? "text-emerald-400" : "text-amber-400"}>
                  {taskData?.exit_code !== undefined && taskData.exit_code !== null ? taskData.exit_code : (status === 'Completed' ? 0 : 'N/A')}
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-dark-800/80">
                <span className="text-slate-500">Pages Crawled:</span>
                <span className="text-slate-200">{taskData?.pages_crawled ?? 0}</span>
              </div>
              {taskData?.execution_duration_seconds !== undefined && (
                <div className="flex justify-between py-0.5 border-b border-dark-800/80">
                  <span className="text-slate-500">Duration:</span>
                  <span className="text-slate-200">{taskData.execution_duration_seconds}s</span>
                </div>
              )}
            </div>

            {/* Validated Arguments */}
            {taskData?.validated_arguments && (
              <div className="bg-dark-950 p-3 rounded-lg border border-dark-800">
                <div className="text-slate-400 font-semibold mb-1 text-[11px] uppercase tracking-wider">
                  Validated Arguments
                </div>
                <pre className="text-slate-300 text-[11px] overflow-x-auto p-2 bg-dark-900 rounded">
                  {JSON.stringify(taskData.validated_arguments, null, 2)}
                </pre>
              </div>
            )}

            {/* stdout Stream */}
            <div className="space-y-1">
              <div className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider flex items-center justify-between">
                <span>Process stdout (JSON Output)</span>
                <span className="text-[10px] text-slate-500">Sanitized</span>
              </div>
              <div className="bg-dark-950 p-2.5 rounded-lg border border-dark-800 text-[11px] max-h-48 overflow-y-auto text-emerald-300 leading-relaxed font-mono">
                {taskData?.stdout || (events.length > 0 ? "Streaming stdout in progress..." : "No stdout captured yet.")}
              </div>
            </div>

            {/* stderr Stream */}
            <div className="space-y-1">
              <div className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider flex items-center justify-between">
                <span>Process stderr (CLI Status stream)</span>
                <span className="text-[10px] text-slate-500">Real-time</span>
              </div>
              <div className="bg-dark-950 p-2.5 rounded-lg border border-dark-800 text-[11px] max-h-48 overflow-y-auto text-amber-300/90 leading-relaxed font-mono whitespace-pre-wrap">
                {taskData?.stderr || (events.length > 0 ? "Streaming stderr in progress..." : "No stderr captured yet.")}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
