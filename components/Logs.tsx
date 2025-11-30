import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogsProps {
  logs: LogEntry[];
}

export const Logs: React.FC<LogsProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip scrolling on the initial render to prevent the page from 
    // jumping down to the logs section on load.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-48 md:h-64 overflow-y-auto font-mono text-xs p-4 bg-black/40 rounded-lg border border-zinc-800 backdrop-blur-sm">
      <div className="space-y-1.5">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3 hover:bg-zinc-900/50 p-0.5 rounded transition-colors">
            <span className="text-zinc-600 shrink-0 select-none">[{log.timestamp}]</span>
            <span className={`w-24 shrink-0 font-bold ${
              log.source === 'Assistant' ? 'text-zinc-400' :
              log.source === 'Query Agent' ? 'text-blue-400' :
              log.source === 'Historian' ? 'text-purple-400' :
              'text-orange-400'
            }`}>
              {log.source}
            </span>
            <span className={`break-all ${
              log.type === 'error' ? 'text-red-400' :
              log.type === 'success' ? 'text-emerald-400' :
              log.type === 'warning' ? 'text-amber-400' :
              'text-zinc-400'
            }`}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};