/**
 * App.tsx - The Coordinator Agent
 * 
 * ARCHITECTURE: ADK WORKFLOW AGENT (Orchestrator)
 * This component acts as the "Coordinator Agent" implementing standard ADK patterns:
 * 
 * 1. STATE MACHINE: Manages the application flow by transitioning between agent states (QUERY -> HISTORIAN -> INTERPRETER).
 * 2. TASK QUEUE: Maintains a queue of domains for batch processing (Loop pattern).
 * 3. SEQUENTIAL WORKFLOW: Chains the specialized sub-agents, passing context through a shared 'Session Memory'.
 * 
 * This component's primary role is to manage state and orchestrate the other agents.
 * The logic for the specialized agents themselves is located in the `/agents` directory.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Activity, Play, Settings, Key, Server, Globe, Sparkles, Lock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AgentGraph } from './components/AgentGraph';
import { MCPServerView } from './components/MCPServerView';
import { Report } from './components/Report';
import { Logs } from './components/Logs';
import { runQueryAgent } from './agents/queryAgent';
import { runHistorianAgent } from './agents/historianAgent';
import { runInterpreterAgent, runBatchComparisonAgent } from './agents/interpreterAgent';
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

  // --- CORE STATE ---
  const [domain, setDomain] = useState('');
  const [memory, setMemory] = useState<AgentMemory>(INITIAL_MEMORY);
  const [agentState, setAgentState] = useState<AgentState>(AgentState.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  
  // --- WORKFLOW STATE ---
  const [taskQueue, setTaskQueue] = useState<string[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedData, setCompletedData] = useState<AnalysisResult[]>([]);
  const [individualReports, setIndividualReports] = useState<string[]>([]);
  const isProcessingRef = useRef(false);

  // --- UI & CONFIG STATE ---
  const [activeTab, setActiveTab] = useState<'auditor' | 'server'>('auditor');
  
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
  
  const addLog = useCallback((source: LogEntry['source'], message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      source,
      message,
      type
    }]);
  }, []);

  /**
   * Kicks off the intelligence workflow by setting up the initial state.
   */
  const startAudit = useCallback((manualDomain?: string) => {
    let targetInput = typeof manualDomain === 'string' ? manualDomain : domain;
    if (!targetInput) return;

    if (targetInput !== domain) setDomain(targetInput);
    
    if (!cruxKey) {
        addLog('Assistant', 'MISSING CONFIGURATION: Please enter your CrUX API Key or Proxy URL.', 'error');
        setAgentState(AgentState.ERROR);
        return;
    }

    const targets = targetInput.split(',').map(s => {
        let clean = s.trim();
        if (clean && !/^https?:\/\//i.test(clean)) {
            clean = `https://${clean}`;
        }
        return clean;
    }).filter(s => s);
    
    if (targets.length === 0) return;

    if (targets.length > 10) {
      addLog('Assistant', 'Batch size limited to 10. Processing the first 10 URLs.', 'warning');
      targets.splice(10); // Limit to 10
    }

    // RESET STATE for a new run
    setLogs(INITIAL_LOGS);
    setMemory(INITIAL_MEMORY);
    setCompletedData([]);
    setIndividualReports([]);
    setTotalTasks(targets.length);
    setTaskQueue(targets);
    
    addLog('Assistant', `Initializing Intelligence System. Queue: ${targets.length}`, 'info');
    setAgentState(AgentState.QUERY); // This kicks off the useEffect workflow
  }, [domain, cruxKey, addLog]);


  /**
   * THE INTELLIGENCE WORKFLOW - State Machine
   * This effect runs when the agent state or task queue changes,
   * orchestrating the sequence of agent operations.
   */
  useEffect(() => {
    const isWorkflowActive = agentState !== AgentState.IDLE && agentState !== AgentState.COMPLETE && agentState !== AgentState.ERROR;
    if (!isWorkflowActive || isProcessingRef.current) {
      return;
    }

    const processTask = async () => {
        isProcessingRef.current = true;
        const currentTarget = taskQueue[0];
        
        if (!currentTarget) {
            // Queue is empty, check if we need to finalize a batch job
            if (totalTasks > 1) {
                addLog('Interpreter', 'Finalizing batch comparison...', 'info');
                const comparison = await runBatchComparisonAgent(completedData);

                const finalMarkdownOutput = `# 📊 Comparative Conclusion\n\n${comparison}`;

                setMemory(prev => ({
                    ...prev,
                    // Store the last item for consistency, but completedData is the source of truth for batch reports
                    query: { ...prev.query, lastRawResults: completedData[completedData.length - 1] }, 
                    interpreter: { ...prev.interpreter, lastRecommendations: finalMarkdownOutput }
                }));
            }
            addLog('Assistant', 'Intelligence cycle complete.', 'success');
            setAgentState(AgentState.COMPLETE);
            isProcessingRef.current = false;
            return;
        }

        try {
            const taskNumber = totalTasks - taskQueue.length + 1;
            addLog('Assistant', `[${taskNumber}/${totalTasks}] Processing ${currentTarget}`, 'info');

            switch (agentState) {
                // ============================================
                // STEP 1: Invoke Query Agent
                // ============================================
                case AgentState.QUERY:
                    addLog('Assistant', 'Dispatching: Query Agent', 'info');
                    const analyzedData = await runQueryAgent(currentTarget, cruxKey);
                    
                    setMemory(prev => ({ ...prev, query: { lastDomain: currentTarget, lastRawResults: analyzedData } }));
                    addLog('Query Agent', 'Committed raw results to Session Memory.', 'success');
                    setAgentState(AgentState.HISTORIAN);
                    break;

                // ============================================
                // STEP 2: Invoke Historian Agent
                // ============================================
                case AgentState.HISTORIAN:
                    addLog('Assistant', 'Dispatching: Historian Agent', 'info');
                    const dataForHistorian = memory.query.lastRawResults;
                    if (!dataForHistorian) throw new Error("Memory inconsistency: Query data not found for Historian.");
                    
                    const historianNotes = await runHistorianAgent(currentTarget, dataForHistorian);
                    
                    setMemory(prev => ({ ...prev, historian: { lastTrend: historianNotes, lastHistoryData: null } }));
                    addLog('Historian', 'Committed trend analysis to Session Memory.', 'success');
                    setAgentState(AgentState.INTERPRETER);
                    break;
                
                // ============================================
                // STEP 3: Invoke Interpreter Agent
                // ============================================
                case AgentState.INTERPRETER:
                    addLog('Assistant', 'Dispatching: Interpreter Agent', 'info');
                    const dataForInterpreter = memory.query.lastRawResults;
                    const notesForInterpreter = memory.historian.lastTrend;
                    if (!dataForInterpreter || notesForInterpreter === null) throw new Error("Memory inconsistency: Data not found for Interpreter.");
                    
                    const markdown = await runInterpreterAgent(currentTarget, dataForInterpreter, notesForInterpreter);
                                        
                    setMemory(prev => ({ ...prev, interpreter: { lastAnalysis: dataForInterpreter, lastRecommendations: markdown } }));
                    
                    // Update batch tracking state
                    setCompletedData(prev => [...prev, dataForInterpreter]);
                    setIndividualReports(prev => [...prev, markdown]);

                    // Dequeue and decide next step
                    addLog('Assistant', `Cycle complete for ${currentTarget}.`, 'success');
                    const remainingTasks = taskQueue.slice(1);
                    setTaskQueue(remainingTasks);
                    
                    // If more tasks, loop back to QUERY. 
                    // If not, the effect will re-run with an empty queue and trigger completion.
                    if (remainingTasks.length > 0) {
                        await new Promise(r => setTimeout(r, 800)); // Pause before next cycle
                        setAgentState(AgentState.QUERY);
                    }
                    break;
            }
        } catch (err: any) {
            addLog('Assistant', `System Failure: ${err.message}`, 'error');
            setAgentState(AgentState.ERROR);
        } finally {
            isProcessingRef.current = false;
        }
    };

    processTask();
  }, [agentState, taskQueue, cruxKey, addLog, completedData, individualReports, memory, totalTasks]);


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
                            batchData={completedData.length > 1 ? completedData : undefined}
                            individualReports={completedData.length > 1 ? individualReports : undefined}
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