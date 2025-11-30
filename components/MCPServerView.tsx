import React from 'react';
import { Copy, Terminal } from 'lucide-react';

const SERVER_CODE = `/**
 * crux-mcp-server.js
 * 
 * A Production-Grade MCP Server for the CrUX Intelligence Assistant.
 * This server exposes 3 tools that route requests through your secure Google Apps Script Proxy.
 * 
 * Prerequisites:
 * 1. Node.js v18+ (for global fetch)
 * 2. Your Google Apps Script Web App URL (v5)
 * 
 * Setup:
 * 1. npm install @modelcontextprotocol/sdk zod
 * 2. export GAS_PROXY_URL="https://script.google.com/macros/s/..."
 * 3. node crux-mcp-server.js
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Configuration
const PROXY_URL = process.env.GAS_PROXY_URL;

if (!PROXY_URL) {
  console.error("Error: GAS_PROXY_URL environment variable is required.");
  process.exit(1);
}

// Initialize Server
const server = new McpServer({
  name: "crux-intelligence-assistant",
  version: "2.0.0",
});

/**
 * Helper to call the Google Apps Script Proxy
 */
async function callProxy(params) {
  try {
    // Construct URL with parameters
    const url = new URL(PROXY_URL);
    Object.keys(params).forEach(key => {
        if (params[key]) url.searchParams.append(key, params[key]);
    });

    const response = await fetch(url.toString(), {
      method: "GET", // GAS Web Apps use GET for simplicity in this architecture
    });

    if (!response.ok) {
        return \`HTTP Error: \${response.status}\`;
    }

    const data = await response.json();
    
    if (data.error) {
        return \`Proxy Error: \${data.error}\`;
    }

    return JSON.stringify(data, null, 2);
  } catch (err) {
    return \`Network Error: \${err.message}\`;
  }
}

// ---------------------------------------------------------
// Tool 1: CrUXFetch
// Gets the current snapshot (P75) metrics for an origin
// ---------------------------------------------------------
server.tool(
  "crux_fetch",
  "Get current Core Web Vitals (LCP, CLS, INP) for a specific origin and form factor. This provides an immediate snapshot of the user experience.",
  {
    origin: z.string().url().describe("The full origin URL to query (e.g., https://www.example.com)"),
    formFactor: z.enum(["PHONE", "DESKTOP"]).optional().default("PHONE").describe("The device type to get metrics for."),
  },
  async ({ origin, formFactor }) => {
    const result = await callProxy({
        endpoint: 'fetch',
        origin,
        formFactor,
    });
    return { content: [{ type: "text", text: result }] };
  }
);

// ---------------------------------------------------------
// Tool 2: CrUXHistory
// Gets 6-month historical trends to detect regressions
// ---------------------------------------------------------
server.tool(
  "crux_history",
  "Get 25-week historical trends for Core Web Vitals to analyze performance stability and detect regressions over time.",
  {
    origin: z.string().url().describe("The full origin URL to query (e.g., https://www.example.com)"),
    formFactor: z.enum(["PHONE", "DESKTOP"]).optional().default("PHONE").describe("The device type to analyze history for."),
  },
  async ({ origin, formFactor }) => {
    const result = await callProxy({
        endpoint: 'history',
        origin,
        formFactor,
    });
    return { content: [{ type: "text", text: result }] };
  }
);

// ---------------------------------------------------------
// Tool 3: CrUXCompare
// Gets both Phone and Desktop data simultaneously
// ---------------------------------------------------------
server.tool(
  "crux_compare",
  "Fetch both Mobile and Desktop metrics simultaneously for a direct device-to-device performance comparison.",
  {
    origin: z.string().url().describe("The full origin URL to compare (e.g., https://www.example.com)"),
  },
  async ({ origin }) => {
    const result = await callProxy({
        endpoint: 'compare',
        origin
    });
    return { content: [{ type: "text", text: result }] };
  }
);

// Start Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CrUX Intelligence MCP Server running on stdio");
}

main();
`;

export const MCPServerView = () => {
  const handleCopy = () => {
    navigator.clipboard.writeText(SERVER_CODE);
  };

  return (
    <div className="w-full bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden mt-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-2">
            <Terminal size={16} className="text-zinc-400" />
            <span className="text-sm font-mono text-zinc-300">crux-mcp-server.js</span>
        </div>
        <button 
            onClick={handleCopy}
            className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
            <Copy size={14} />
            Copy Code
        </button>
      </div>
      <div className="p-4 bg-black/50">
          <p className="text-sm text-zinc-400 mb-4">
              To run this locally and connect it to Claude Desktop or other agents:
          </p>
          <ol className="list-decimal list-inside text-xs text-zinc-500 space-y-2 mb-6 font-mono">
              <li>Create a file named <span className="text-zinc-300">crux-mcp-server.js</span></li>
              <li>Paste the code below into it.</li>
              <li>Run: <span className="text-zinc-300">npm install @modelcontextprotocol/sdk zod</span></li>
              <li>Set your Proxy URL: <span className="text-zinc-300">export GAS_PROXY_URL="Your_Script_URL_Here"</span></li>
              <li>Run: <span className="text-zinc-300">node crux-mcp-server.js</span></li>
          </ol>
      </div>
      <div className="p-4 overflow-x-auto border-t border-zinc-800">
        <pre className="text-xs font-mono text-zinc-400 leading-relaxed">
            {SERVER_CODE}
        </pre>
      </div>
    </div>
  );
};
