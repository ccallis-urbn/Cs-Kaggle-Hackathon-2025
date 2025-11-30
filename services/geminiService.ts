/**
 * geminiService.ts - Toolbelt for Cognitive Agents
 * 
 * RESPONSIBILITY:
 * This service provides tools that interface with the Google Gemini API. These tools
 * are called by the higher-level "Cognitive Agents" (Historian, Interpreter) to
 * perform analysis and generate reports. Each function represents a distinct
 * capability in the agent's toolbelt.
 */

import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from '../types';

const getAI = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
}

/**
 * TOOL: analyzeTrend
 * Called by the Historian Agent to detect anomalies and regressions in time-series data.
 * It uses a low temperature for analytical precision.
 */
export const analyzeTrend = async (domain: string, analysis: AnalysisResult): Promise<string> => {
    const ai = getAI();
    if (!ai) return "Historian Analysis: Simulation Mode (No AI Key)";

    const prompt = `
      You are the **CrUX Historian Agent**.
      Your goal is to detect anomalies and regressions in time-series data from the last 25 weeks.
      
      **Target:** ${domain}
      
      **Data from the last 25 weeks:**
      - Phone LCP Trend (ms): ${JSON.stringify(analysis.phone.history.lcpTrend)}
      - Phone CLS Trend: ${JSON.stringify(analysis.phone.history.clsTrend)}
      - Phone INP Trend (ms): ${JSON.stringify(analysis.phone.history.inpTrend)}
      - Desktop LCP Trend (ms): ${JSON.stringify(analysis.desktop.history.lcpTrend)}
      - Desktop CLS Trend: ${JSON.stringify(analysis.desktop.history.clsTrend)}
      - Desktop INP Trend (ms): ${JSON.stringify(analysis.desktop.history.inpTrend)}

      **Instructions:**
      1. Analyze the trend stability for ALL THREE metrics (LCP, CLS, INP). Is it flat, volatile, or degrading?
      2. Detect any sudden jumps (>10% change) in any metric.
      3. Compare the stability of Mobile vs Desktop across all metrics.
      4. Output a brief, data-heavy paragraph focusing ONLY on the timeline from the last 25 weeks. Refer to it as "the last 25 weeks".
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
 * TOOL: synthesizeReport
 * Called by the Interpreter Agent to synthesize raw data and historian notes into a strategic report.
 * It uses a balanced temperature for creative but grounded writing.
 */
export const synthesizeReport = async (
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
    - Historian Notes (Analysis of the last 25 weeks): "${historianNotes}"
    
    **Raw Metrics:**
    ${JSON.stringify(analysis, null, 2)}

    **Instructions:**
    1. **Executive Summary:** High-level health check.
    2. **Device Gap:** Explain why Mobile score (${analysis.phone.metrics.lcp.value}ms) differs from Desktop (${analysis.desktop.metrics.lcp.value}ms).
    3. **Trend Analysis:** Incorporate the Historian's notes about the 25-week trend naturally.
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

/**
 * TOOL: compareBatchResults
 * Called by the Interpreter Agent (when in batch mode) to create a final comparison report.
 */
export const compareBatchResults = async (results: AnalysisResult[]): Promise<string> => {
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