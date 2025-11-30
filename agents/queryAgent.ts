import { fetchCrUXData } from '../services/cruxService';
import { AnalysisResult } from '../types';

/**
 * ADK Pattern: Tool-Using Agent
 * The Query Agent's responsibility is to fetch and process raw performance data.
 * It uses the `fetchCrUXData` tool to perform this action. This function serves
 * as the entry point for the Coordinator to invoke this agent.
 */
export const runQueryAgent = async (domain: string, apiKeyOrProxy: string): Promise<AnalysisResult> => {
    // The agent's logic is to simply execute its primary tool with the given arguments.
    return fetchCrUXData(domain, apiKeyOrProxy);
};
