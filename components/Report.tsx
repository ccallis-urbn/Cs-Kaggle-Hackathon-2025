import React, { useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Smartphone, Monitor, ChevronDown, Download, FileText, FileCode, FileJson, Globe as GlobeIcon, ExternalLink, Database } from 'lucide-react';
import { AnalysisResult, FormFactorAnalysis, ExportFormat } from '../types';
import { TimeSeriesChart } from './TimeSeriesChart';

interface ReportProps {
  markdown: string;
  data: AnalysisResult;
  batchData?: AnalysisResult[];
  individualReports?: string[];
  isExporting: boolean;
  onExport: (format: ExportFormat) => void;
}

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

const ExportButton = ({ isExporting, onExport }: { isExporting: boolean, onExport: (format: ExportFormat) => void }) => {
    const [isOpen, setIsOpen] = useState(false);

    const formats: { id: ExportFormat, label: string, icon: any }[] = [
        { id: 'google-docs', label: 'Google Docs', icon: ExternalLink },
        { id: 'docx', label: 'Word (.docx)', icon: FileText },
        { id: 'pdf', label: 'PDF Document', icon: Download },
        { id: 'html', label: 'HTML Page', icon: FileCode },
        { id: 'markdown', label: 'Markdown', icon: FileText },
        { id: 'json', label: 'Raw Data (JSON)', icon: FileJson },
        { id: 'csv', label: 'Metrics Table (CSV)', icon: Database },
    ];

    if (isExporting) {
        return (
            <div className="relative">
                <button disabled className="px-4 py-2 text-sm font-medium bg-zinc-800 text-zinc-500 rounded-lg flex items-center gap-2 border border-zinc-700">
                    <div className="animate-spin w-4 h-4 border-2 border-zinc-600 border-t-indigo-500 rounded-full"></div>
                    Exporting...
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
            >
                <Download size={16} />
                Export Report
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <div className="p-2 space-y-1">
                            {formats.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => {
                                        onExport(f.id);
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors group"
                                >
                                    <f.icon size={16} className="text-zinc-500 group-hover:text-indigo-400" />
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
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

// This component shows the detailed view for a single site, without the main header or export button.
// It's used for both the single-site view and the selected-site view in batch mode.
const DetailedReportView = ({ site, reportMarkdown }: { site: AnalysisResult, reportMarkdown: string }) => {
    const [activeTab, setActiveTab] = useState<'phone' | 'desktop'>('phone');
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [hoverTarget, setHoverTarget] = useState<'lcp' | 'cls' | 'inp' | null>(null);
    
    const handleHover = (index: number | null, metric: 'lcp' | 'cls' | 'inp') => {
        setHoveredPoint(index);
        setHoverTarget(index === null ? null : metric);
    };

    const activeData = site[activeTab];

    return (
         <div className="space-y-6">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['lcp', 'cls', 'inp'] as const).map((metric) => (
                        <div key={metric} className="h-64 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800 relative">
                            <TimeSeriesChart
                                id={`chart-${site.domain.replace(/[^a-z0-9]/gi, '-')}-${activeTab}-${metric}`}
                                history={activeData.history}
                                metric={metric}
                                hoveredPoint={hoveredPoint}
                                onHover={handleHover}
                                isHoverTarget={hoverTarget === metric}
                            />
                        </div>
                    ))}
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
    );
}

export const Report: React.FC<ReportProps> = ({ markdown, data, batchData, individualReports, ...exportProps }) => {
  const [selectedSiteIndex, setSelectedSiteIndex] = useState(0);
  const isBatchMode = batchData && batchData.length > 1 && individualReports;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {isBatchMode ? (
        <>
            {/* Batch View: Dropdown + Individual Report */}
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-6">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-zinc-200">Intelligence Report</h2>
                    <ExportButton {...exportProps} />
                </div>
                
                <div>
                    <label htmlFor="site-selector" className="block text-xs font-medium text-zinc-400 mb-2">
                      Select a site to view its detailed report:
                    </label>
                    <div className="relative">
                      <select
                        id="site-selector"
                        value={selectedSiteIndex}
                        onChange={(e) => setSelectedSiteIndex(parseInt(e.target.value, 10))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-4 pr-10 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                      >
                        {batchData.map((site, index) => (
                          <option key={site.domain} value={index}>
                            {site.domain}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 text-zinc-500 pointer-events-none" size={20} />
                    </div>
                </div>

                <div className="border-t border-zinc-800 pt-6">
                    <DetailedReportView 
                        site={batchData[selectedSiteIndex]}
                        reportMarkdown={individualReports[selectedSiteIndex]}
                    />
                </div>
            </div>

            {/* Batch Summary */}
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                 <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={MARKDOWN_COMPONENTS}
                >
                    {markdown}
                </ReactMarkdown>
            </div>
        </>
      ) : (
        /* Single Site View */
        <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-6">
            <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-zinc-200">Intelligence Report</h2>
                <ExportButton {...exportProps} />
            </div>
            <DetailedReportView site={data} reportMarkdown={markdown} />
        </div>
      )}
    </div>
  );
};