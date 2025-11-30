import { synthesizeReport, compareBatchResults } from '../services/geminiService';
import { AnalysisResult } from '../types';

/**
 * ADK Pattern: Cognitive Agent
 * The Interpreter Agent uses its cognitive tools (LLMs) to synthesize a final report.
 * It is the last agent in the sequential chain, responsible for creating the
 * final human-readable output.
 */
export const runInterpreterAgent = async (
  domain: string,
  analysis: AnalysisResult,
  historianNotes: string
): Promise<string> => {
    // This agent's logic is to call the 'synthesizeReport' tool.
    return synthesizeReport(domain, analysis, historianNotes);
};

/**
 * A specialized function of the Interpreter Agent for batch processing mode.
 * It uses the 'compareBatchResults' tool to generate a comparative analysis.
 */
export const runBatchComparisonAgent = async (results: AnalysisResult[]): Promise<string> => {
    return compareBatchResults(results);
}
