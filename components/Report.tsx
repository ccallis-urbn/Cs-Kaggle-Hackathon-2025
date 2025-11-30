
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Smartphone, Monitor } from 'lucide-react';
import { AnalysisResult, FormFactorAnalysis } from '../types';

interface ReportProps {
  markdown: string;
  data: AnalysisResult;
}

const MetricsGrid = ({ metrics }: { metrics: FormFactorAnalysis['metrics'] }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {[
      { label: 'LCP (Loading)', val: metrics.lcp, unit: 'ms' },
      { label: 'CLS (Stability)', val: metrics.cls, unit: '' },
      { label: 'INP (Interactivity)', val: metrics.inp, unit: 'ms' },
    ].map((m, i) => (
      <div key={i} className={`p-4 rounded-lg border ${
        m.val.rating === 'good' ? 'bg-emerald-950/30 border-emerald-900/50' : 
        m.val.rating === 'needs-improvement' ? 'bg-amber-950/30 border-amber-900/50' : 
        'bg-red-950/30 border-red-900/50'
      }`}>
        <div className="text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-1">{m.label}</div>
        <div className={`text-2xl font-mono font-bold ${
           m.val.rating === 'good' ? 'text-emerald-400' : 
           m.val.rating === 'needs-improvement' ? 'text-amber-400' : 
           'text-red-400'
        }`}>
          {m.val.value}{m.unit}
        </div>
        <div className="text-xs mt-2 capitalize opacity-70">
          Rating: {m.val.rating.replace('-', ' ')}
        </div>
      </div>
    ))}
  </div>
);

export const Report: React.FC<ReportProps> = ({ markdown, data }) => {
  const [activeTab, setActiveTab] = useState<'phone' | 'desktop'>('phone');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Tab Switcher */}
      <div className="flex space-x-2 border-b border-zinc-800 pb-2">
        <button
            onClick={() => setActiveTab('phone')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                activeTab === 'phone' 
                ? 'bg-zinc-800 text-indigo-400 border-b-2 border-indigo-500' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
        >
            <Smartphone size={16} />
            <span className="font-medium text-sm">Mobile</span>
        </button>
        <button
            onClick={() => setActiveTab('desktop')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                activeTab === 'desktop' 
                ? 'bg-zinc-800 text-indigo-400 border-b-2 border-indigo-500' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
        >
            <Monitor size={16} />
            <span className="font-medium text-sm">Desktop</span>
        </button>
      </div>

      {/* Conditional Metrics */}
      <div className="min-h-[140px]">
          {activeTab === 'phone' ? (
              <MetricsGrid metrics={data.phone.metrics} />
          ) : (
              <MetricsGrid metrics={data.desktop.metrics} />
          )}
      </div>

      {/* Regressions Warning (Context Sensitive) */}
      {data[activeTab].regressions.length > 0 && (
          <div className="bg-amber-950/20 border border-amber-900/50 p-4 rounded-lg">
              <h4 className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-2">Detected Issues ({activeTab})</h4>
              <ul className="list-disc list-inside text-sm text-amber-200/70 space-y-1">
                  {data[activeTab].regressions.map((reg, i) => (
                      <li key={i}>{reg}</li>
                  ))}
              </ul>
          </div>
      )}

      {/* LLM Content */}
      <div className="prose prose-invert prose-sm max-w-none bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
        <ReactMarkdown
          components={{
            h1: ({node, ...props}) => <h1 className="text-xl font-bold text-indigo-300 mb-4" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-zinc-200 mt-6 mb-3 border-b border-zinc-800 pb-2" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-md font-medium text-zinc-300 mt-4 mb-2" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 text-zinc-400" {...props} />,
            li: ({node, ...props}) => <li className="ml-2" {...props} />,
            p: ({node, ...props}) => <p className="mb-4 text-zinc-400 leading-relaxed" {...props} />,
            strong: ({node, ...props}) => <strong className="text-indigo-200 font-semibold" {...props} />
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
};
