/**
 * cruxService.ts - Toolbelt for the Query Agent
 * 
 * RESPONSIBILITY:
 * This service implements the tools required by the Query Agent to interface with the CrUX API.
 * It handles the logic for both direct API calls and proxied requests.
 * 
 * ADK PATTERN: PARALLEL TOOL EXECUTION
 * The `fetchCrUXData` function demonstrates a parallel pattern by fanning out
 * simultaneous requests for both PHONE and DESKTOP data, then aggregating (fanning in)
 * the results into a single context object for the next agent.
 */

import { CRUX_API_BASE, CRUX_HISTORY_API_BASE } from '../constants';
import { AnalysisResult, CrUXResponse, CrUXHistoryResponse, FormFactorAnalysis, CrUXDate } from '../types';

/**
 * Robust fetch wrapper to handle network instability or GAS throttling.
 */
const fetchWithRetry = async (url: string, retries = 1): Promise<Response> => {
    try {
        return await fetch(url, {
            method: 'GET',
            credentials: 'omit' // Critical for GAS Proxy CORS (Cross-Origin Resource Sharing)
        });
    } catch (err) {
        if (retries > 0) {
            console.log(`Retrying fetch... (${retries} left)`);
            await new Promise(r => setTimeout(r, 1000));
            return fetchWithRetry(url, retries - 1);
        }
        throw err;
    }
};

/**
 * fetchRawData
 * 
 * DESIGN:
 * This function acts as a Tool Abstraction. The Query Agent calls this once per form factor.
 * Internally, it decides whether to use the Secure Proxy or Direct API.
 * 
 * BEHAVIOR:
 * - If using Proxy: It constructs a URL that triggers the Google Apps Script.
 * - If using Proxy: It fires parallel requests for 'fetch' (Record) and 'history' (Trends).
 */
const fetchRawData = async (domain: string, apiKeyOrProxy: string, formFactor: 'PHONE' | 'DESKTOP') => {
    let currentData: CrUXResponse;
    let historyData: CrUXHistoryResponse | null = null;
    
    const cleanKey = apiKeyOrProxy.trim();
    const isProxy = cleanKey.startsWith('http');

    if (isProxy) {
        const separator = cleanKey.includes('?') ? '&' : '?';
        const baseUrl = `${cleanKey}${separator}origin=${encodeURIComponent(domain)}&formFactor=${formFactor}`;

        // Parallel Tool Call Simulation
        try {
            // We define these as separate promises to emulate the Agent triggering two tools at once
            // UPDATED: Using 'fetch' and 'history' endpoints to match v5 GAS Code
            const recordPromise = fetchWithRetry(`${baseUrl}&endpoint=fetch`); 
            const historyPromise = fetchWithRetry(`${baseUrl}&endpoint=history`); 

            const [recordRes, historyRes] = await Promise.all([recordPromise, historyPromise]);
            
            if (!recordRes.ok) throw new Error(`Proxy HTTP ${recordRes.status}`);
            
            const json = await recordRes.json().catch(() => ({ error: "Invalid JSON" }));
            if (json.error) throw new Error(`Proxy Error: ${JSON.stringify(json.error)}`);
            
            currentData = json as CrUXResponse;

            if (historyRes.ok) {
                const historyJson = await historyRes.json();
                if (!historyJson.error && historyJson.record) {
                    historyData = historyJson as CrUXHistoryResponse;
                }
            }

        } catch (e: any) {
            // Fallback for simple errors
             if (e.message === 'Failed to fetch') {
                 throw new Error(`Connection Failed. Check Proxy URL and Permissions.`);
            }
            throw e;
        }

    } else {
        // Direct API Mode (Fallback for local dev with API Keys)
        const currentRes = await fetch(`${CRUX_API_BASE}?key=${cleanKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin: domain, formFactor })
        });

        if (!currentRes.ok) throw new Error(`CrUX API Error`);
        currentData = await currentRes.json();

        try {
            const historyRes = await fetch(`${CRUX_HISTORY_API_BASE}?key=${cleanKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ origin: domain, formFactor })
            });
            if (historyRes.ok) historyData = await historyRes.json();
        } catch (e) { console.warn("History fetch failed"); }
    }
    
    if (!currentData?.record?.metrics) throw new Error(`No metrics found for ${domain} (${formFactor})`);

    return { currentData, historyData };
};

/**
 * Standardizes the data for the "Interpretation Agent"
 * Converts raw Google JSON into a clean internal interface (FormFactorAnalysis).
 */
const processRawData = (current: CrUXResponse, history: CrUXHistoryResponse | null): FormFactorAnalysis => {
    const metrics = current.record.metrics;
    const historyMetrics = history?.record.metrics;
    const historyCollectionPeriods = history?.record.collectionPeriods;
    
    // Extract P75 (75th Percentile) - The standard for Web Vitals
    const lcp = metrics.largest_contentful_paint?.percentiles.p75 || 0;
    const cls = metrics.cumulative_layout_shift?.percentiles.p75 || 0;
    const inp = metrics.interaction_to_next_paint?.percentiles.p75 || 0;

    // Rating Helpers based on Google Web Vitals thresholds
    const rateLCP = (val: number) => val <= 2500 ? 'good' : val <= 4000 ? 'needs-improvement' : 'poor';
    const rateCLS = (val: number) => val <= 0.1 ? 'good' : val <= 0.25 ? 'needs-improvement' : 'poor';
    const rateINP = (val: number) => val <= 200 ? 'good' : val <= 500 ? 'needs-improvement' : 'poor';

    const getTrend = (historyMetric: any, currentMetric: number | string) => {
        const trendData = historyMetric?.percentilesTimeseries.p75s;
        if (Array.isArray(trendData)) {
            // Handle cases where p75s can be strings (CLS) or numbers (LCP/INP)
            return trendData
                .map(x => (x === null ? null : Number(x))) // Convert all values to numbers or null
                .filter((x): x is number => x !== null && isFinite(x)); // Filter out any nulls or NaNs
        }
        // Fallback for when history is not available
        return [Number(currentMetric)];
    };

    const lcpTrend = getTrend(historyMetrics?.largest_contentful_paint, lcp);
    const clsTrend = getTrend(historyMetrics?.cumulative_layout_shift, cls);
    const inpTrend = getTrend(historyMetrics?.interaction_to_next_paint, inp);

    const regressions: string[] = [];
    
    // Simple regression heuristic (The Historian Agent will do deeper analysis via LLM later)
    if (lcpTrend.length >= 4) {
        const start = lcpTrend[0];
        const end = lcpTrend[lcpTrend.length - 1];
        if (start > 0 && end > start * 1.15) {
            const diff = Math.round(((end - start) / start) * 100);
            regressions.push(`LCP degraded by ${diff}%`);
        }
    }

    if (rateLCP(lcp) === 'poor') regressions.push(`LCP is Poor (${lcp}ms)`);
    if (rateCLS(Number(cls)) === 'poor') regressions.push(`CLS is Poor (${cls})`);
    if (rateINP(inp) === 'poor') regressions.push(`INP is Poor (${inp}ms)`);

    const formatDate = (d: CrUXDate) => `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;

    // Extract Collection Period
    const cp = current.record.collectionPeriod;
    const collectionPeriod = cp ? `${formatDate(cp.firstDate)} to ${formatDate(cp.lastDate)}` : 'Unknown';

    // Generate dates for the timeline chart
    const dates = historyCollectionPeriods?.map(period => 
        `${formatDate(period.firstDate)} to ${formatDate(period.lastDate)}`
    );

    return {
      metrics: {
        lcp: { value: lcp, rating: rateLCP(lcp) },
        cls: { value: Number(cls), rating: rateCLS(Number(cls)) },
        inp: { value: inp, rating: rateINP(inp) },
      },
      history: { lcpTrend, clsTrend, inpTrend, dates },
      regressions,
      collectionPeriod
    };
};

/**
 * Main tool export for the Query Agent.
 */
export const fetchCrUXData = async (domain: string, apiKeyOrProxy: string): Promise<AnalysisResult> => {
  if (!apiKeyOrProxy) throw new Error("API Key missing");

  try {
    // This tool executes the parallel data fetching logic.
    const [phoneRaw, desktopRaw] = await Promise.all([
        fetchRawData(domain, apiKeyOrProxy, 'PHONE'),
        fetchRawData(domain, apiKeyOrProxy, 'DESKTOP')
    ]);

    const phoneAnalysis = processRawData(phoneRaw.currentData, phoneRaw.historyData);
    const desktopAnalysis = processRawData(desktopRaw.currentData, desktopRaw.historyData);

    return {
        domain,
        phone: phoneAnalysis,
        desktop: desktopAnalysis
    };

  } catch (error) {
    console.error("Audit Failed:", error);
    throw error;
  }
};