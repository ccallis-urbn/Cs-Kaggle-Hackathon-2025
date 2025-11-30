import React, { useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Smartphone, Monitor, ChevronDown } from 'lucide-react';
import { AnalysisResult, FormFactorAnalysis } from '../types';
import { TimeSeriesChart } from './TimeSeriesChart';

interface ReportProps {
  markdown: string;
  data: AnalysisResult;
  batchData?: AnalysisResult[];
  individualReports?: string[];
}

/**
 * A single, comprehensive configuration for rendering all markdown content.
 * This ensures styling is consistent across all reports.
 */
const MARKDOWN_COMPONENTS: Components = {
    h1: ({node, ...props}) => <h1 className="text-xl font-bold text-indigo-300 mb-4" {...props} />,
    h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-zinc-200 mt-6 mb-3 border-b border-zinc-800 pb-2" {...props} />,
    h3: ({node, ...props}) => <h3 className="text-md font-semibold text-zinc-300 mt-4 mb-2" {...props} />,
    p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
    strong: ({node, ...props}) => <strong className="text-indigo-200 font-semibold" {...props} />,
    ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 my-4 pl-4" {...props} />,
    ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-2 my-4 pl-4" {...props} />,
    li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
    table: ({node, ...props}) => (
        <div className="overflow-x-auto">
            <table className="table-auto w-full my-6 text-left border-collapse border border-zinc-800" {...props} />
        </div>
    ),
    thead: ({node, ...props}) => <thead className="bg-zinc-800/50" {...props} />,
    th: ({node, ...props}) => <th className="text-xs font-semibold text-zinc-300 uppercase p-3 border-b border-zinc-700" {...props} />,
    td: ({node, ...props}) => <td className="p-3 border-t border-zinc-800 text-sm align-top" {...props} />,
};


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

const IndividualSiteReport = ({ site, reportMarkdown }: { site: AnalysisResult, reportMarkdown: string }) => {
    const [activeTab, setActiveTab] = useState<'phone' | 'desktop'>('phone');
    const activeData = site[activeTab];

    return (
         <div className="space-y-6">
            <h3 className="text-xl font-bold text-zinc-200">Intelligence Report</h3>
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
                <MetricsGrid metrics={activeData.metrics} />
            </div>
            
            {/* Trend Chart */}
            <div className="space-y-4 pt-4">
                 <h4 className="text-md font-semibold text-zinc-300">Trend Analysis (Last 25 Weeks)</h4>
                 <div className="h-64 bg-zinc-950/50 p-4 rounded-lg border border-zinc-800">
                    <TimeSeriesChart 
                        history={activeData.history} 
                        formFactor={activeTab}
                    />
                 </div>
            </div>

            {/* Regressions Warning (Context Sensitive) */}
            {activeData.regressions.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-900/50 p-4 rounded-lg">
                    <h4 className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-2">Detected Issues ({activeTab})</h4>
                    <ul className="list-disc list-inside text-sm text-amber-200/70 space-y-1">
                        {activeData.regressions.map((reg, i) => (
                            <li key={i}>{reg}</li>
                        ))}
                    </ul>
                </div>
            )}
            
            {/* AI Analysis for this specific site */}
            <div className="text-zinc-400 text-sm">
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={MARKDOWN_COMPONENTS}
                >
                    {reportMarkdown}
                </ReactMarkdown>
            </div>
        </div>
    )
}

export const Report: React.FC<ReportProps> = ({ markdown, data, batchData, individualReports }) => {
  const [selectedSiteIndex, setSelectedSiteIndex] = useState(0);
  const isBatchMode = batchData && batchData.length > 1 && individualReports;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {isBatchMode ? (
        <>
            {/* Batch View: Dropdown + Individual Report */}
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-6">
                <h2 className="text-xl font-bold text-zinc-200 border-b border-zinc-800 pb-3">Intelligence Report</h2>
                
                <div>
                    <label htmlFor="site-selector" className="block text-xs font-medium text-zinc-400 mb-2">Select a site to inspect its detailed report:</label>
                    <div className="relative">
                        <select
                            id="site-selector"
                            value={selectedSiteIndex}
                            onChange={(e) => setSelectedSiteIndex(Number(e.target.value))}
                            className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-4 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {batchData.map((site, index) => (
                                <option key={site.domain} value={index}>
                                    {site.domain}
                                </option>
                            ))}
                        </select>
                         <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                    </div>
                </div>

                <IndividualSiteReport 
                    site={batchData[selectedSiteIndex]}
                    reportMarkdown={individualReports[selectedSiteIndex]}
                />
            </div>
            
            {/* Batch View: Final Comparative Conclusion */}
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                <div className="text-zinc-400 text-sm">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={MARKDOWN_COMPONENTS}
                    >
                        {markdown}
                    </ReactMarkdown>
                </div>
            </div>
        </>
      ) : (
        // Single Site View
        <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
            <IndividualSiteReport site={data} reportMarkdown={markdown} />
        </div>
      )}
    </div>
  );
};