
/**
 * geminiService.ts - The Brains (Historian & Interpreter Agents)
 * 
 * RESPONSIBILITY:
 * This service interfaces with Google Gemini 2.5 to provide the cognitive layer.
 * It implements two distinct agent personas:
 * 
 * 1. HISTORIAN AGENT: A data analyst focused on time-series stability and anomaly detection.
 *    - Temp: 0.3 (Low randomness for analytical precision).
 *    - Task: Detect regressions in the LCP trend.
 * 
 * 2. INTERPRETER AGENT: A strategic consultant focused on actionable advice.
 *    - Temp: 0.5 (Balanced for creative but grounded writing).
 *    - Task: Synthesize metrics + Historian notes into a report.
 */

import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from '../types';

const getAI = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
}

export const generateRecommendations = async (domain: string, analysis: AnalysisResult): Promise<string> => {
    // Legacy support, redirects to Interpreter
    return runInterpreterAgent(domain, analysis, "No historian notes available.");
};

/**
 * AGENT 3: CrUX Historian Agent
 * Purpose: Identify trends, anomalies, and regressions.
 */
export const runHistorianAgent = async (domain: string, analysis: AnalysisResult): Promise<string> => {
    const ai = getAI();
    if (!ai) return "Historian Analysis: Simulation Mode (No AI Key)";

    const prompt = `
      You are the **CrUX Historian Agent**.
      Your goal is to detect anomalies and regressions in time-series data.
      
      **Target:** ${domain}
      
      **Data (Phone LCP Trend):** ${JSON.stringify(analysis.phone.history.lcpTrend)}
      **Data (Desktop LCP Trend):** ${JSON.stringify(analysis.desktop.history.lcpTrend)}

      **Instructions:**
      1. Analyze the trend stability. Is it flat, volatile, or degrading?
      2. Detect any sudden jumps (>10% change).
      3. Compare the stability of Mobile vs Desktop.
      4. Output a brief, data-heavy paragraph focusing ONLY on the timeline.
    `;

    try {
        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { temperature: 0.3 }
        });
        return res.text || "No historical anomalies detected.";
    } catch (e) {
        return "Historian Agent failed to process data.";
    }
}

/**
 * AGENT 2: CrUX Interpretation Agent
 * Purpose: Synthesize raw data + Historian findings into a narrative.
 */
export const runInterpreterAgent = async (
  domain: string,
  analysis: AnalysisResult,
  historianNotes: string
): Promise<string> => {
  const ai = getAI();
  if (!ai) return `## Simulation Report\n\n**Mobile LCP:** ${analysis.phone.metrics.lcp.value}ms\n**Desktop LCP:** ${analysis.desktop.metrics.lcp.value}ms`;

  const prompt = `
    You are the **CrUX Interpretation Agent**.
    You are the final voice of the system. Synthesize the raw data and the Historian's notes into a strategic report.

    **Context:**
    - Domain: ${domain}
    - Historian Notes: "${historianNotes}"
    
    **Raw Metrics:**
    ${JSON.stringify(analysis, null, 2)}

    **Instructions:**
    1. **Executive Summary:** High-level health check.
    2. **Device Gap:** Explain why Mobile score (${analysis.phone.metrics.lcp.value}ms) differs from Desktop (${analysis.desktop.metrics.lcp.value}ms).
    3. **Trend Analysis:** Incorporate the Historian's notes naturally.
    4. **Recommendations:** 3 technical fix priorities.
    
    Format as clean Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert web performance consultant.",
        temperature: 0.5,
      }
    });

    return response.text || "No recommendations generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating recommendations. Please check your API Key.";
  }
};

export const generateBatchComparison = async (results: AnalysisResult[]): Promise<string> => {
  const ai = getAI();
  if (!ai) return "## Comparative Analysis\n\n*Comparison unavailable in simulation mode.*";
  
  const minimizedData = results.map(r => ({
      audited_url: r.domain,
      collectionPeriod: r.phone.collectionPeriod || "N/A",
      endpoint: "CrUX Record API",
      mobile_lcp: r.phone.metrics.lcp.value,
      mobile_inp: r.phone.metrics.inp.value,
      mobile_cls: r.phone.metrics.cls.value,
      desktop_lcp: r.desktop.metrics.lcp.value,
      desktop_inp: r.desktop.metrics.inp.value,
      desktop_cls: r.desktop.metrics.cls.value
  }));

  const prompt = `
    You are a precise data analyst creating a performance scorecard for a batch of ${results.length} websites.
    
    **Input Data:**
    ${JSON.stringify(minimizedData, null, 2)}

    **Directives:**
    1. **Master Scoreboard Table (MANDATORY):** 
       - Generate a Markdown table immediately at the top.
       - The table MUST have a row for **EVERY** URL in the input data.
       - Use these exact headers:
         | URL | Date Range | Mobile LCP | Mobile CLS | Mobile INP | Desktop LCP | Desktop CLS | Desktop INP |
       - Fill in the values exactly from the input data.
       
    2. **Comparative Analysis:**
       - **Fastest Site:** Which URL has the best Mobile LCP?
       - **Needs Attention:** Which URL has the worst metrics overall?
       - **Pattern Recognition:** Are there shared issues? (e.g. "All sites struggle with INP").
       - **Verdict:** Declare a clear performance winner.
       
    Do not skip any URLs in the table.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.5 }
    });
    return response.text || "No comparison generated.";
  } catch (error) {
    return "Error generating comparison.";
  }
};