
/**
 * App.tsx - The Main Orchestrator
 * 
 * ARCHITECTURE: ADK WORKFLOW AGENTS
 * This component acts as the "Coordinator Agent" implementing standard ADK patterns:
 * 
 * 1. LOOP WORKFLOW: Iterates through the list of target domains (Batch Processing).
 * 2. ROUTER: Validates configuration and routes to the appropriate starting state.
 * 3. SEQUENTIAL WORKFLOW: Chains the specialized sub-agents (Query -> Historian -> Interpreter).
 * 
 * STATE MANAGEMENT:
 * Uses a 'Session Memory' pattern to persist intermediate outputs from each agent step.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Activity, Play, Settings, Key, Server, Globe, Sparkles, Lock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AgentGraph } from './components/AgentGraph';
import { MCPServerView } from './components/MCPServerView';
import { Report } from './components/Report';
import { Logs } from './components/Logs';
import { fetchCrUXData } from './services/cruxService';
import { runInterpreterAgent, runHistorianAgent, generateBatchComparison } from './services/geminiService';
import { AgentState, LogEntry, AnalysisResult, AgentMemory } from './types';
import { INITIAL_LOGS } from './constants';

const PRESET_DOMAINS = [
    'https://www.wikipedia.org',
    'https://www.amazon.com',
    'https://www.nytimes.com',
    'https://www.reddit.com'
];

const STORAGE_KEY = 'crux_agent_config_key';

const INITIAL_MEMORY: AgentMemory = {
    query: { lastDomain: '', lastRawResults: null },
    historian: { lastTrend: null, lastHistoryData: null },
    interpreter: { lastAnalysis: null, lastRecommendations: '' }
};

export default function App() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // --- STATE ---
  const [domain, setDomain] = useState('');
  
  // Structured Session Memory
  const [memory, setMemory] = useState<AgentMemory>(INITIAL_MEMORY);

  // --- CONFIGURATION MANAGEMENT ---
  const getEnvKey = () => {
    try {
      if (typeof process !== 'undefined' && process.env) {
        return process.env.CRUX_API_KEY || '';
      }
    } catch (e) { return ''; }
    return '';
  };

  const envCruxKey = getEnvKey();
  
  const [cruxKey, setCruxKey] = useState(() => {
    if (envCruxKey) return envCruxKey;
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(STORAGE_KEY) || '';
    }
    return '';
  });

  useEffect(() => {
    if (!envCruxKey && cruxKey) {
        localStorage.setItem(STORAGE_KEY, cruxKey);
    }
  }, [cruxKey, envCruxKey]);
  
  const [agentState, setAgentState] = useState<AgentState>(AgentState.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [activeTab, setActiveTab] = useState<'auditor' | 'server'>('auditor');

  const addLog = (source: LogEntry['source'], message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      source,
      message,
      type
    }]);
  };

  /**
   * THE INTELLIGENCE WORKFLOW
   */
  const startAudit = useCallback(async (manualDomain?: string) => {
    let targetDomain = typeof manualDomain === 'string' ? manualDomain : domain;
    
    // Normalization
    if (targetDomain && !/^https?:\/\//i.test(targetDomain)) {
        targetDomain = `https://${targetDomain}`;
    }
    
    if (!targetDomain) return;
    if (targetDomain !== domain) setDomain(targetDomain);
    
    if (!cruxKey) {
        addLog('Assistant', 'MISSING CONFIGURATION: Please enter your CrUX API Key or Proxy URL.', 'error');
        setAgentState(AgentState.ERROR);
        return;
    }

    // BATCH PARSING
    const targets = targetDomain.split(',').map(s => s.trim()).filter(s => s);
    const isBatch = targets.length > 1;

    // RESET STATE
    setAgentState(AgentState.QUERY);
    setLogs(INITIAL_LOGS);
    setMemory(INITIAL_MEMORY); 
    
    addLog('Assistant', `Initializing Intelligence System. Queue: ${targets.length}`, 'info');
    const batchReports: string[] = [];
    const batchData: AnalysisResult[] = [];

    try {
      // ADK PATTERN: LOOP WORKFLOW
      // Iterates through the list of targets to process them one by one.
      for (let i = 0; i < targets.length; i++) {
        let currentTarget = targets[i];
        if (!/^https?:\/\//i.test(currentTarget)) currentTarget = `https://${currentTarget}`;

        addLog('Assistant', `[${i+1}/${targets.length}] Routing ${currentTarget}`, 'info');

        // ============================================
        // ADK PATTERN: PARALLEL AGENT (Fan-out)
        // Responsibility: Fetch Mobile + Desktop data simultaneously.
        // ============================================
        setAgentState(AgentState.QUERY);
        if (cruxKey.startsWith('http')) {
            addLog('Query Agent', `Calling Tools: fetch + history (via Proxy)`, 'info');
        } else {
            addLog('Query Agent', `Calling Tools: CrUX API (Direct)`, 'info');
        }

        const analyzedData = await fetchCrUXData(currentTarget, cruxKey);
        
        // MEMORY COMMIT
        setMemory(prev => ({
            ...prev,
            query: { lastDomain: currentTarget, lastRawResults: analyzedData }
        }));
        addLog('Query Agent', `Committed raw results to Session Memory.`, 'success');
        
        // ============================================
        // ADK PATTERN: SEQUENTIAL CHAIN (Step 1)
        // Historian Agent analyzes the data from the Query Agent.
        // ============================================
        setAgentState(AgentState.HISTORIAN);
        addLog('Historian', `Reading raw data from memory...`, 'info');
        await new Promise(r => setTimeout(r, 600)); 
        
        const historianNotes = await runHistorianAgent(currentTarget, analyzedData);
        
        // MEMORY COMMIT
        setMemory(prev => ({
            ...prev,
            historian: { 
                lastTrend: historianNotes,
                lastHistoryData: {
                    phone: analyzedData.phone.history.lcpTrend,
                    desktop: analyzedData.desktop.history.lcpTrend
                }
            }
        }));
        addLog('Historian', `Committed trend analysis to Session Memory.`, 'success');

        // ============================================
        // ADK PATTERN: SEQUENTIAL CHAIN (Step 2)
        // Interpreter Agent synthesizes findings from previous steps.
        // ============================================
        setAgentState(AgentState.INTERPRETER);
        addLog('Interpreter', `Synthesizing final report...`, 'info');
        
        const markdown = await runInterpreterAgent(currentTarget, analyzedData, historianNotes);
        
        // MEMORY COMMIT
        setMemory(prev => ({
            ...prev,
            interpreter: {
                lastAnalysis: analyzedData,
                lastRecommendations: markdown
            }
        }));
        
        batchReports.push(markdown);
        batchData.push(analyzedData);

        // --- BATCH COMPLETION & COMPARISON ---
        if (i === targets.length - 1) {
             let finalMarkdownOutput = "";
             if (isBatch) finalMarkdownOutput += "# 📑 Batch Audit Report\n\n";
             
             batchReports.forEach((report, idx) => {
                if (isBatch) finalMarkdownOutput += `\n---\n\n## 🔍 Origin: ${batchData[idx].domain}\n\n`;
                finalMarkdownOutput += report;
             });

             if (isBatch) {
                addLog('Interpreter', `Comparing batch results...`, 'info');
                const comparison = await generateBatchComparison(batchData);
                finalMarkdownOutput += `\n\n---\n\n# 📊 Comparative Conclusion\n\n${comparison}`;
                
                setMemory(prev => ({
                    ...prev,
                    interpreter: {
                        ...prev.interpreter,
                        lastRecommendations: finalMarkdownOutput
                    }
                }));
             }

             addLog('Assistant', `Intelligence cycle complete.`, 'success');
             setAgentState(AgentState.COMPLETE);
        } else {
             addLog('Assistant', `Cycle complete for ${currentTarget}. Next...`, 'success');
             await new Promise(r => setTimeout(r, 800)); 
        }
      }

    } catch (err: any) {
      addLog('Assistant', `System Failure: ${err.message}`, 'error');
      setAgentState(AgentState.ERROR);
    }
  }, [domain, cruxKey]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Activity className="text-white" size={18} />
            </div>
            <h1 className="font-bold text-lg tracking-tight">
              CrUX <span className="text-zinc-500">Intelligence Assistant</span>
            </h1>
          </div>
          
          <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button 
                onClick={() => setActiveTab('auditor')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'auditor' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Assistant
            </button>
            <button 
                onClick={() => setActiveTab('server')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'server' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                MCP Server
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full space-y-8">
        
        {activeTab === 'auditor' ? (
            <>
                {/* Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Input */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-xl relative z-10">
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                        Target Origin (or comma-separated list)
                      </label>
                      
                      <div className="flex gap-2 relative">
                        <div className="absolute left-4 top-3.5 text-zinc-500 pointer-events-none">
                            <Globe size={18} />
                        </div>
                        <input 
                          type="text" 
                          value={domain}
                          onChange={(e) => setDomain(e.target.value)}
                          placeholder="e.g. https://example.com, https://google.com"
                          className="flex-1 bg-black/50 border border-zinc-700 rounded-lg pl-11 pr-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono transition-all"
                        />
                        <button 
                          onClick={() => startAudit()}
                          disabled={!domain || (agentState !== AgentState.IDLE && agentState !== AgentState.COMPLETE && agentState !== AgentState.ERROR)}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20 whitespace-nowrap"
                        >
                          {agentState === AgentState.IDLE || agentState === AgentState.COMPLETE || agentState === AgentState.ERROR ? (
                            <><Play size={18} /> Start Audit</>
                          ) : (
                            <><div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> Processing</>
                          )}
                        </button>
                      </div>

                      {/* Presets */}
                      <div className="mt-4 flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-zinc-500 mr-2 flex items-center gap-1">
                            <Sparkles size={12} />
                            Try examples:
                        </span>
                        {PRESET_DOMAINS.map((d) => (
                            <button
                                key={d}
                                onClick={() => startAudit(d)}
                                disabled={agentState === AgentState.QUERY || agentState === AgentState.HISTORIAN || agentState === AgentState.INTERPRETER}
                                className="px-3 py-1 rounded-full bg-zinc-800/50 hover:bg-zinc-700 border border-zinc-700/50 text-xs text-zinc-400 hover:text-indigo-300 transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {new URL(d).hostname.replace('www.', '')}
                            </button>
                        ))}
                      </div>
                    </div>

                    {/* API Keys Config (Optional) */}
                    <div className={`bg-zinc-900/30 p-4 rounded-xl border transition-colors duration-300 ${!cruxKey && agentState === AgentState.ERROR ? 'border-red-500/50 bg-red-950/10' : 'border-zinc-800/50'}`}>
                      <div className="flex items-center gap-2 mb-3 text-zinc-400">
                        <Settings size={14} />
                        <span className="text-xs font-medium uppercase">Configuration</span>
                        {!cruxKey && agentState === AgentState.ERROR && (
                            <span className="text-xs text-red-400 font-bold ml-auto flex items-center gap-1">
                                <AlertTriangle size={12} /> Required
                            </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Google CrUX: API Key <span className="text-zinc-600">OR</span> Proxy URL</label>
                            <div className="relative">
                                {cruxKey.startsWith('http') ? (
                                     <ShieldCheck className="absolute left-3 top-2.5 text-emerald-500" size={14} />
                                ) : (
                                     <Server className={`absolute left-3 top-2.5 ${envCruxKey ? 'text-emerald-500' : 'text-zinc-600'}`} size={14} />
                                )}
                               
                                <input 
                                    type={cruxKey.startsWith('http') ? 'text' : 'password'}
                                    value={cruxKey}
                                    onChange={(e) => setCruxKey(e.target.value)}
                                    placeholder={envCruxKey ? "Loaded from Environment" : "Paste API Key or Apps Script URL"}
                                    className={`w-full bg-black/30 border rounded px-3 py-2 pl-9 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none ${envCruxKey ? 'border-emerald-500/50' : 'border-zinc-800'}`}
                                />
                                {envCruxKey ? (
                                    <span className="absolute right-3 top-2.5 text-[10px] text-emerald-500 font-mono flex items-center gap-1 select-none">
                                        <Lock size={10} /> ENV
                                    </span>
                                ) : cruxKey.startsWith('http') && (
                                     <span className="absolute right-3 top-2.5 text-[10px] text-emerald-500 font-mono flex items-center gap-1 select-none">
                                        <ShieldCheck size={10} /> PROXY
                                    </span>
                                )}
                            </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Logs */}
                  <div className="lg:col-span-1">
                     <Logs logs={logs} />
                  </div>
                </div>

                {/* Agent Visualization */}
                <div className="border-t border-b border-zinc-800 bg-zinc-900/20 -mx-6 px-6 py-4">
                    <AgentGraph state={agentState} />
                </div>

                {/* Results Area */}
                <div className="min-h-[300px]">
                    {agentState === AgentState.COMPLETE && memory.query.lastRawResults && (
                        <Report 
                            markdown={memory.interpreter.lastRecommendations} 
                            data={memory.query.lastRawResults} 
                        />
                    )}
                    
                    {agentState === AgentState.ERROR && !cruxKey && (
                         <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                           <Key size={48} className="mb-4 opacity-50 text-red-500" />
                           <p>Missing Configuration</p>
                           <p className="text-xs mt-2 text-zinc-600">Please enter your API Key or Proxy URL above.</p>
                        </div>
                    )}
                    
                    {agentState === AgentState.ERROR && cruxKey && (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                           <Activity size={48} className="mb-4 opacity-50 text-red-500" />
                           <p>Analysis Sequence Failed</p>
                           <p className="text-xs mt-2 text-zinc-600">Check logs for details</p>
                        </div>
                    )}
                    
                    {agentState === AgentState.IDLE && (
                        <div className="h-64 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-2xl">
                            <Activity size={48} className="mb-4 opacity-20" />
                            <p>Ready to analyze origin performance.</p>
                        </div>
                    )}
                </div>
            </>
        ) : (
            <MCPServerView />
        )}
      </main>
    </div>
  );
}