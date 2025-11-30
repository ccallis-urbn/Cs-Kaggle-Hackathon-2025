
import React from 'react';
import { motion } from 'framer-motion';
import { Database, History, Brain, FileText } from 'lucide-react';
import { AgentState } from '../types';

interface AgentGraphProps {
  state: AgentState;
}

const Node = ({ 
  active, 
  completed, 
  icon: Icon, 
  label,
  subLabel
}: { 
  active: boolean; 
  completed: boolean; 
  icon: React.ElementType; 
  label: string;
  subLabel?: string;
}) => {
  return (
    <div className="relative flex flex-col items-center z-10 w-24">
      <motion.div
        initial={false}
        animate={{
          scale: active ? 1.1 : 1,
          borderColor: active ? '#818cf8' : completed ? '#10b981' : '#3f3f46',
          boxShadow: active ? '0 0 20px rgba(129, 140, 248, 0.5)' : 'none',
        }}
        className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center bg-zinc-900 transition-colors duration-500
          ${active ? 'border-indigo-400 text-indigo-400' : completed ? 'border-emerald-500 text-emerald-500' : 'border-zinc-700 text-zinc-600'}
        `}
      >
        <Icon size={20} />
      </motion.div>
      <div className={`mt-2 text-[10px] font-mono font-bold tracking-wider ${active ? 'text-indigo-400' : completed ? 'text-emerald-500' : 'text-zinc-600'}`}>
        {label}
      </div>
      {subLabel && (
        <div className="text-[9px] text-zinc-600 uppercase mt-0.5">{subLabel}</div>
      )}
      
      {active && (
        <motion.div
            layoutId="active-indicator"
            className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
        </motion.div>
      )}
    </div>
  );
};

const Connection = ({ active }: { active: boolean }) => (
  <div className="h-[2px] w-8 md:w-16 bg-zinc-800 relative overflow-hidden">
    {active && (
       <motion.div
       initial={{ x: '-100%' }}
       animate={{ x: '100%' }}
       transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
       className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"
     />
    )}
  </div>
);

export const AgentGraph: React.FC<AgentGraphProps> = ({ state }) => {
  // Determine completion status
  const isQueryDone = state !== AgentState.IDLE && state !== AgentState.QUERY;
  const isHistorianDone = isQueryDone && state !== AgentState.HISTORIAN;
  const isInterpreterDone = isHistorianDone && state !== AgentState.INTERPRETER;
  
  // Determine active status
  const isQueryActive = state === AgentState.QUERY;
  const isHistorianActive = state === AgentState.HISTORIAN;
  const isInterpreterActive = state === AgentState.INTERPRETER;

  return (
    <div className="w-full py-12 flex items-center justify-center select-none">
      <div className="flex items-center gap-0 md:gap-1">
        <Node 
            label="QUERY" 
            subLabel="PARALLEL"
            icon={Database} 
            active={isQueryActive} 
            completed={isQueryDone} 
        />
        <Connection active={isQueryActive || isHistorianActive} />
        <Node 
            label="HISTORIAN" 
            subLabel="ANALYST"
            icon={History} 
            active={isHistorianActive} 
            completed={isHistorianDone} 
        />
        <Connection active={isHistorianActive || isInterpreterActive} />
        <Node 
            label="INTERPRETER" 
            subLabel="SYNTHESIS"
            icon={Brain} 
            active={isInterpreterActive} 
            completed={isInterpreterDone} 
        />
        <Connection active={isInterpreterActive || state === AgentState.COMPLETE} />
        <Node 
            label="REPORT" 
            icon={FileText} 
            active={state === AgentState.COMPLETE} 
            completed={state === AgentState.COMPLETE} 
        />
      </div>
    </div>
  );
};
