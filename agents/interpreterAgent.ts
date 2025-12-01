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
    // Create a lean summary object for the LLM to prune tokens.
    // The Historian agent has already analyzed the trends, so sending the raw
    // history arrays to the Interpreter is redundant and wastes tokens.
    const summarizedAnalysis = {
        domain: analysis.domain,
        phone: {
            metrics: analysis.phone.metrics,
            regressions: analysis.phone.regressions,
            collectionPeriod: analysis.phone.collectionPeriod,
        },
        desktop: {
            metrics: analysis.desktop.metrics,
            regressions: analysis.desktop.regressions,
            collectionPeriod: analysis.desktop.collectionPeriod,
        }
    };
    
    // This agent's logic is to call the 'synthesizeReport' tool with the pruned context.
    // We cast to `any` because the object is structurally similar enough for JSON.stringify,
    // and it avoids needing a separate type for this one-off summarization.
    return synthesizeReport(domain, summarizedAnalysis as any, historianNotes);
};

/**
 * A specialized function of the Interpreter Agent for batch processing mode.
 * It uses the 'compareBatchResults' tool to generate a comparative analysis.
 */
export const runBatchComparisonAgent = async (results: AnalysisResult[]): Promise<string> => {
    return compareBatchResults(results);
}