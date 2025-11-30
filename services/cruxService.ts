
/**
 * cruxService.ts - The "Query Agent's" Toolbelt
 * 
 * RESPONSIBILITY:
 * This service implements the tools required by the Query Agent to interface with the CrUX API.
 * 
 * ADK PATTERN: PARALLEL AGENT (Fan-out / Fan-in)
 * This service emulates a Parallel Agent by:
 * 1. Fanning out requests for 'fetch' (Record) and 'history' (Trends) simultaneously.
 * 2. Aggregating (Fanning in) the results into a single context object.
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
    
    // Extract P75 (75th Percentile) - The standard for Web Vitals
    const lcp = metrics.largest_contentful_paint?.percentiles.p75 || 0;
    const cls = metrics.cumulative_layout_shift?.percentiles.p75 || 0;
    const inp = metrics.interaction_to_next_paint?.percentiles.p75 || 0;

    // Rating Helpers based on Google Web Vitals thresholds
    const rateLCP = (val: number) => val <= 2500 ? 'good' : val <= 4000 ? 'needs-improvement' : 'poor';
    const rateCLS = (val: number) => val <= 0.1 ? 'good' : val <= 0.25 ? 'needs-improvement' : 'poor';
    const rateINP = (val: number) => val <= 200 ? 'good' : val <= 500 ? 'needs-improvement' : 'poor';

    const lcpHistoryRaw = history?.record.metrics.largest_contentful_paint?.percentilesTimeseries.p75s;
    const lcpTrend = Array.isArray(lcpHistoryRaw) 
        ? lcpHistoryRaw.filter((x): x is number => typeof x === 'number') 
        : [lcp];

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

    // Extract Collection Period
    const cp = current.record.collectionPeriod;
    const formatDate = (d: CrUXDate) => `${d.year}-${d.month}-${d.day}`;
    const collectionPeriod = cp ? `${formatDate(cp.firstDate)} to ${formatDate(cp.lastDate)}` : 'Unknown';

    return {
      metrics: {
        lcp: { value: lcp, rating: rateLCP(lcp) },
        cls: { value: Number(cls), rating: rateCLS(Number(cls)) },
        inp: { value: inp, rating: rateINP(inp) },
      },
      history: { lcpTrend },
      regressions,
      collectionPeriod
    };
};

/**
 * Main Entry Point for the Query Agent
 */
export const fetchCrUXData = async (domain: string, apiKeyOrProxy: string): Promise<AnalysisResult> => {
  if (!apiKeyOrProxy) throw new Error("API Key missing");

  try {
    // "Query Agent" Logic:
    // Execute Parallel Tools (Mobile Fetch AND Desktop Fetch)
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
