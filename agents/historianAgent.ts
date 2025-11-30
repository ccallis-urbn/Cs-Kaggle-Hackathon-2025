import { analyzeTrend } from '../services/geminiService';
import { AnalysisResult } from '../types';

/**
 * ADK Pattern: Cognitive Agent
 * The Historian Agent uses its cognitive tool (an LLM) to analyze time-series data.
 * Its purpose is to identify trends, anomalies, and regressions, providing context
 * for the next agent in the sequence.
 */
export const runHistorianAgent = async (domain: string, analysis: AnalysisResult): Promise<string> => {
    // This agent's logic is to call the 'analyzeTrend' tool with the provided context.
    return analyzeTrend(domain, analysis);
};
