import React, { useState } from 'react';
import { 
  FileText, 
  Database, 
  Layers, 
  Code, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  ExternalLink,
  ChevronRight,
  Globe
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StructuredMessageData, CrawledPageData } from '../types';

interface StructuredResultViewProps {
  data: StructuredMessageData;
  executionId?: string | null;
  stdoutLogs?: string;
  stderrLogs?: string;
}

export const StructuredResultView: React.FC<StructuredResultViewProps> = ({
  data,
  executionId,
  stdoutLogs,
  stderrLogs
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'extracted' | 'pages' | 'json' | 'logs'>('summary');
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data.structured_json, null, 2);

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crawl-result-${data.structured_json.base_domain || 'export'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const firstPage: CrawledPageData | undefined = data.structured_json?.pages?.[0];

  return (
    <div className="mt-3 border border-dark-700/80 rounded-xl overflow-hidden bg-dark-900/90 shadow-xl">
      {/* Tabs Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-dark-950/80 border-b border-dark-700/80 flex-wrap gap-2">
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'summary'
                ? 'bg-dark-800 text-brand-purple border border-dark-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-850'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            AI Summary
          </button>

          <button
            onClick={() => setActiveTab('extracted')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'extracted'
                ? 'bg-dark-800 text-brand-purple border border-dark-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-850'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Extracted Content
          </button>

          <button
            onClick={() => setActiveTab('pages')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'pages'
                ? 'bg-dark-800 text-brand-purple border border-dark-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-850'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Pages ({data.structured_json?.pages?.length || data.pages_crawled})
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'json'
                ? 'bg-dark-800 text-brand-purple border border-dark-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-850'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Structured JSON
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'logs'
                ? 'bg-dark-800 text-brand-purple border border-dark-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-850'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            CLI Logs
          </button>
        </div>

        {/* Action buttons (Copy / Download) */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleCopyJSON}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-700 text-slate-300 transition-colors border border-dark-700"
            title="Copy structured JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>

          <button
            onClick={handleDownloadJSON}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-700 text-slate-300 transition-colors border border-dark-700"
            title="Download JSON Report"
          >
            <Download className="w-3.5 h-3.5 text-brand-purple" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Tab 1: AI Summary */}
      {activeTab === 'summary' && (
        <div className="p-5 text-sm leading-relaxed text-slate-200 prose prose-invert max-w-none prose-headings:text-slate-100 prose-a:text-brand-purple prose-code:text-purple-300">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {data.summary}
          </ReactMarkdown>
        </div>
      )}

      {/* Tab 2: Extracted Content */}
      {activeTab === 'extracted' && firstPage && (
        <div className="p-4 space-y-4 text-xs">
          {/* Metadata Bar */}
          <div className="bg-dark-950 p-3 rounded-lg border border-dark-800 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Page Title</div>
              <div className="text-sm font-semibold text-slate-100 mt-0.5">{firstPage.title || 'Untitled'}</div>
            </div>
            <a
              href={firstPage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-brand-purple hover:underline"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{firstPage.url}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Meta Description */}
          {firstPage.meta_description && (
            <div className="p-3 bg-dark-850 rounded-lg border border-dark-700/60">
              <div className="text-[11px] text-slate-500 uppercase font-semibold mb-1">Meta Description</div>
              <p className="text-slate-300 italic">{firstPage.meta_description}</p>
            </div>
          )}

          {/* Headings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-dark-950 rounded-lg border border-dark-800">
              <div className="text-[11px] text-slate-400 font-semibold uppercase mb-2">H1 Headings ({firstPage.headings?.h1?.length || 0})</div>
              {firstPage.headings?.h1?.length ? (
                <ul className="space-y-1 text-slate-300">
                  {firstPage.headings.h1.map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-brand-purple shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-slate-500">No H1 tags found</span>
              )}
            </div>

            <div className="p-3 bg-dark-950 rounded-lg border border-dark-800">
              <div className="text-[11px] text-slate-400 font-semibold uppercase mb-2">H2 Headings ({firstPage.headings?.h2?.length || 0})</div>
              {firstPage.headings?.h2?.length ? (
                <ul className="space-y-1 text-slate-300">
                  {firstPage.headings.h2.slice(0, 6).map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-brand-cyan shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-slate-500">No H2 tags found</span>
              )}
            </div>
          </div>

          {/* Paragraphs */}
          <div className="p-3 bg-dark-950 rounded-lg border border-dark-800">
            <div className="text-[11px] text-slate-400 font-semibold uppercase mb-2">Key Extracted Paragraphs ({firstPage.paragraphs?.length || 0})</div>
            <div className="space-y-2 text-slate-300 leading-relaxed max-h-56 overflow-y-auto pr-2">
              {firstPage.paragraphs?.slice(0, 6).map((p, i) => (
                <p key={i} className="p-2 bg-dark-900 rounded border border-dark-800/80">{p}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Crawled Pages */}
      {activeTab === 'pages' && (
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-dark-700 bg-dark-950 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Title</th>
                <th className="py-2.5 px-3">URL</th>
                <th className="py-2.5 px-3">Depth</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">Paragraphs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {data.structured_json?.pages?.map((page, i) => (
                <tr key={i} className="hover:bg-dark-850/50 transition-colors">
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono">
                      {page.status_code}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-200 max-w-xs truncate">{page.title || 'Untitled'}</td>
                  <td className="py-2 px-3 font-mono text-brand-purple max-w-xs truncate">
                    <a href={page.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                      {page.url} <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </td>
                  <td className="py-2 px-3 font-mono">{page.depth}</td>
                  <td className="py-2 px-3 font-mono text-slate-400">{page.response_time_ms}ms</td>
                  <td className="py-2 px-3 font-mono text-slate-400">{page.total_paragraphs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Structured JSON */}
      {activeTab === 'json' && (
        <div className="p-3 bg-dark-950">
          <pre className="font-mono text-xs text-purple-200/90 max-h-96 overflow-auto p-3 rounded-lg bg-dark-900 border border-dark-800 leading-relaxed">
            {jsonString}
          </pre>
        </div>
      )}

      {/* Tab 5: CLI Logs */}
      {activeTab === 'logs' && (
        <div className="p-3 bg-dark-950 space-y-3 font-mono text-xs">
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase mb-1">Process Stderr (Execution Status Stream)</div>
            <pre className="text-amber-300/90 bg-dark-900 p-2.5 rounded border border-dark-800 max-h-48 overflow-y-auto whitespace-pre-wrap">
              {stderrLogs || "No stderr output recorded."}
            </pre>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase mb-1">Process Stdout (Raw CLI Output)</div>
            <pre className="text-emerald-300/90 bg-dark-900 p-2.5 rounded border border-dark-800 max-h-48 overflow-y-auto whitespace-pre-wrap">
              {stdoutLogs || jsonString}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
