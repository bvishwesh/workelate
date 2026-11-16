import React, { useState } from 'react';
import { SlidersHorizontal, ShieldCheck, X } from 'lucide-react';
import { CrawlConfig } from '../types';

interface CrawlConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CrawlConfig;
  onSave: (config: CrawlConfig) => void;
}

export const CrawlConfigModal: React.FC<CrawlConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave
}) => {
  const [maxPages, setMaxPages] = useState(config.max_pages);
  const [depth, setDepth] = useState(config.depth);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ max_pages: maxPages, depth });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-dark-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-brand-purple" />
            <h3 className="text-sm font-semibold text-white">Crawler Parameters</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Max Pages Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-medium text-slate-300">Max Pages</label>
              <span className="font-mono px-2 py-0.5 rounded bg-dark-800 border border-dark-700 text-brand-purple font-semibold">
                {maxPages}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="w-full accent-brand-purple bg-dark-800 h-1.5 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Maximum number of unique pages to extract per crawl request (safe limit: 15).
            </p>
          </div>

          {/* Depth Slider */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center">
              <label className="font-medium text-slate-300">Crawl Depth</label>
              <span className="font-mono px-2 py-0.5 rounded bg-dark-800 border border-dark-700 text-brand-cyan font-semibold">
                {depth}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full accent-brand-cyan bg-dark-800 h-1.5 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Link traversal depth: 1 = starting page only, 2 = direct links, 3 = secondary links.
            </p>
          </div>

          {/* Security Safeguards Banner */}
          <div className="p-3 bg-dark-950 rounded-xl border border-dark-800 space-y-1 text-slate-400">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Security Controls Active</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500">
              <li>Anti-SSRF prevents loopback & private subnets</li>
              <li>Strict 60s subprocess timeout enforcement</li>
              <li>Whitelisted command execution without shell interpolation</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-dark-800 flex justify-end gap-2 bg-dark-950/50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-brand-purple hover:bg-purple-600 shadow-md shadow-brand-purple/20 transition-all"
          >
            Save Parameters
          </button>
        </div>
      </div>
    </div>
  );
};
