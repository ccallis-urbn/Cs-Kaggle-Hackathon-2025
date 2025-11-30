
# CrUX Intelligence Assistant

A multi-agent web performance auditing system powered by the **Chrome User Experience Report (CrUX)** and **Google Gemini 2.5**.

## 1. Problem
Understanding web performance is complex.
*   **Data Fragmentation:** Metrics live in different silos (Mobile vs Desktop, Record vs History).
*   **Context Missing:** A raw number (e.g., "LCP 2500ms") doesn't tell you if the site is improving or degrading over time.
*   **Manual Effort:** Comparing multiple competitors or tracking regression trends requires tedious manual data entry.

## 2. Solution
The **CrUX Intelligence Assistant** is an autonomous system built using **Google Agent Development Kit (ADK)** patterns. It orchestrates specific workflows to:
*   **Parallelize** data fetching for multiple devices.
*   **Loop** through lists of domains for batch auditing.
*   **Sequence** specialized analysis agents to produce high-quality narratives.
*   **Log** everything to Google Sheets for observability.

## 3. Architecture: Workflow Agents
The system is architected using standard [ADK Workflow Patterns](https://google.github.io/adk-docs/agents/workflow-agents/):

### A. The Coordinator (Loop Workflow)
*   **Pattern:** `Loop`
*   **Responsibility:** Iterates through a list of target domains (batch processing). It manages the session memory and handles error recovery for each item in the queue.

### B. The Query Agent (Parallel Workflow)
*   **Pattern:** `Parallel` (Fan-out / Fan-in)
*   **Responsibility:** Executes concurrent tool calls to the CrUX API (via Proxy).
*   **Behavior:**
    1.  **Fan-out:** Triggers `fetchCrUX(Phone)` and `fetchCrUX(Desktop)` simultaneously.
    2.  **Fan-in:** Aggregates both datasets into a single `AnalysisResult` context for downstream agents.

### C. The Analyst Chain (Sequential Workflow)
*   **Pattern:** `Sequential`
*   **Responsibility:** Chains specialized agents where the output of one becomes the context for the next.
    1.  **Historian Agent:** Analyzes time-series data -> Outputs "Anomaly Report".
    2.  **Interpreter Agent:** Inputs "Anomaly Report" + Raw Data -> Outputs "Final Narrative".

## 4. Setup Instructions

### A. API Key Safety (Standard)
**NEVER** commit your API keys to GitHub.
1.  Create a file named `.env` in the root of your project.
2.  Add your keys there:
    ```bash
    CRUX_API_KEY=your_google_cloud_key_here
    ```
3.  The project includes a `.gitignore` file which tells Git to **ignore** the `.env` file.

### B. Google Apps Script Proxy (Recommended)
This method keeps your API Key completely hidden on Google's servers and enables data logging.

#### Step 1: Create the Script
1.  Create a new script at [script.google.com](https://script.google.com).
2.  Paste this **v5 Code** (Supports /fetch, /history, /compare and Logging):
    ```javascript
    function doGet(e) {
      const startTime = new Date().getTime(); // Track latency
      const scriptProps = PropertiesService.getScriptProperties();
      const apiKey = scriptProps.getProperty('CRUX_API_KEY');
      const sheetId = scriptProps.getProperty('SHEET_ID');
      
      if (!apiKey) return outputError('Server Config: API key missing');
      
      const origin = e.parameter.origin;
      const url = e.parameter.url; // Optional: specific URL vs origin
      const formFactor = e.parameter.formFactor || 'PHONE';
      const endpoint = e.parameter.endpoint || 'fetch'; 
      
      if (!origin) return outputError('Client Error: origin required');
      
      // -- ROUTER --
      let result = {};
      let responseStatus = 'success';
      let errorMsg = null;
      
      try {
        if (endpoint === 'compare') {
           const phone = fetchCrUX(origin, 'PHONE', 'queryRecord', apiKey);
           const desktop = fetchCrUX(origin, 'DESKTOP', 'queryRecord', apiKey);
           result = { phone, desktop };
           
           // Check for errors in compare
           if (phone.error || desktop.error) {
             responseStatus = 'partial_error';
             errorMsg = `Phone: ${phone.error || 'OK'}, Desktop: ${desktop.error || 'OK'}`;
           }
           
        } else {
           const method = endpoint === 'history' ? 'queryHistoryRecord' : 'queryRecord';
           const apiUrl = `https://chromeuxreport.googleapis.com/v1/records:${method}?key=${apiKey}`;
           result = fetchCrUXRaw(apiUrl, origin, formFactor);
           
           // Check for errors
           if (result.error) {
             responseStatus = 'error';
             errorMsg = result.error.message || JSON.stringify(result.error);
           }
        }
      } catch (err) {
        responseStatus = 'error';
        errorMsg = err.toString();
        result = { error: errorMsg };
      }
      
      const endTime = new Date().getTime();
      const latency = endTime - startTime; // ms
      
      // -- LOGGING --
      if (sheetId) {
        if (endpoint === 'compare') {
          // Log each device separately for compare endpoint
          logToSheet(sheetId, endpoint, origin, url, 'PHONE', result.phone, latency, responseStatus, errorMsg);
          logToSheet(sheetId, endpoint, origin, url, 'DESKTOP', result.desktop, latency, responseStatus, errorMsg);
        } else {
          logToSheet(sheetId, endpoint, origin, url, formFactor, result, latency, responseStatus, errorMsg);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Helper: Execute Raw Fetch
    function fetchCrUXRaw(url, origin, formFactor) {
        const response = UrlFetchApp.fetch(url, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ origin, formFactor }),
          muteHttpExceptions: true
        });
        return JSON.parse(response.getContentText());
    }

    // Helper: Wrapper for Compare logic
    function fetchCrUX(origin, formFactor, method, key) {
        const url = `https://chromeuxreport.googleapis.com/v1/records:${method}?key=${key}`;
        return fetchCrUXRaw(url, origin, formFactor);
    }

    function logToSheet(sheetId, endpoint, origin, url, device, jsonResponse, latency, status, errorMsg) {
      try {
        const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
        const timestamp = new Date();
        
        // Default values
        let lcp = 'N/A', cls = 'N/A', inp = 'N/A', ttfb = 'N/A', onload = 'N/A';
        
        // Extract metrics if available
        if (jsonResponse && jsonResponse.record && jsonResponse.record.metrics) {
          const m = jsonResponse.record.metrics;
          
          if (endpoint === 'history') {
            // History: Get most recent value from timeseries
            const getLast = (metric) => {
              const arr = metric?.percentilesTimeseries?.p75s;
              return Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : 'N/A';
            };
            lcp = getLast(m.largest_contentful_paint);
            cls = getLast(m.cumulative_layout_shift);
            inp = getLast(m.interaction_to_next_paint);
            ttfb = getLast(m.experimental_time_to_first_byte);
            onload = getLast(m.experimental_onload);
          } else {
            // Fetch/Compare: Get p75 values
            lcp = m.largest_contentful_paint?.percentiles?.p75 ?? 'N/A';
            cls = m.cumulative_layout_shift?.percentiles?.p75 ?? 'N/A';
            inp = m.interaction_to_next_paint?.percentiles?.p75 ?? 'N/A';
            ttfb = m.experimental_time_to_first_byte?.percentiles?.p75 ?? 'N/A';
            onload = m.experimental_onload?.percentiles?.p75 ?? 'N/A';
          }
        }
        
        // Log row: timestamp, endpoint, origin, url, device, lcp, cls, inp, ttfb, onload, latency, status, error
        sheet.appendRow([
          timestamp,
          endpoint,
          origin,
          url || origin, // Use URL if provided, otherwise origin
          device,
          lcp,
          cls,
          inp,
          ttfb,
          onload,
          latency,
          status,
          errorMsg || ''
        ]);
      } catch (e) {
        console.log("Log Error: " + e);
      }
    }

    function outputError(msg) {
        return ContentService.createTextOutput(JSON.stringify({ error: msg }))
          .setMimeType(ContentService.MimeType.JSON);
    }
    ```

#### Step 2: Set the Secret Key
1.  Project Settings (Gear Icon) -> **Script Properties**.
2.  Add `CRUX_API_KEY` with your actual Google Cloud API Key.
3.  (Optional) Add `SHEET_ID` with the ID of a Google Sheet to enable logging.

#### Step 3: Deploy (CRITICAL)
1.  **Deploy** -> **New Deployment**.
2.  Select **Web App**.
3.  Execute as: **Me**.
4.  **Who has access: Anyone**. (This is required to avoid "Failed to fetch" CORS errors).
5.  Copy the URL and paste it into the React App.

## 5. MCP Server (Optional)
To use this tool with external agents (like Claude Desktop):
1.  Copy the code from the **MCP Server** tab in the UI.
2.  Run it locally with Node.js.
3.  Connect your agent to the local server.
