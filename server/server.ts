import * as Sentry from "@sentry/node";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// 🛡️ Oweable AI Backend Observability (MCP Compatible)
Sentry.init({
  dsn: "https://ce1fd32e214219aee8f8831399acaf67@o4511101036134400.ingest.us.sentry.io/4511101043343360",
  // ⚡ High-fidelity tracing for MCP Forensics
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
  // Environment tagging
  environment: "production",
});

// 🚀 Create the Self-Monitoring MCP Server
const server = new McpServer({
  name: "owebale-financial-os",
  version: "1.0.0",
});

import { z } from "zod";

// 🛠️ Tool: Get Account Summary
// This tool provides high-fidelity Sentry tracing for financial lookups
server.tool(
  "get_account_summary",
  "Retrieves a 360-degree financial overview for a specific user ID.",
  { userId: z.string().describe("The UUID of the user") },
  async ({ userId }) => {
    return Sentry.withScope(async (scope) => {
      scope.setUser({ id: userId });
      scope.setTag("tool", "get_account_summary");

      return Sentry.startSpan({ name: "mcp_tool_get_account_summary" }, async () => {
        try {
          console.error(`🛡️ MCP TOOL: Loading summary for user ${userId}`);
          
          // Simulation of a Supabase fetch call (wrapped in Sentry for testing)
          const mockSummary = {
            total_assets: 125000,
            total_liabilities: 45000,
            net_worth: 80000,
            status: "Healthy",
          };

          return {
            content: [{ type: "text", text: JSON.stringify(mockSummary, null, 2) }],
          };
        } catch (err) {
          const error = err as Error;
          Sentry.captureException(error);
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
          };
        }
      });
    });
  }
);

// Helper: Stdio transport for local or edge deployment
const transport = new StdioServerTransport();

async function runServer() {
  console.error("🚀 Oweable MCP Server Status: [ ONLINE ]");
  
  // Connect the transport and begin serving tools
  await server.connect(transport);
}

// 🛡️ Error Catcher for Root Faults
runServer().catch((error) => {
  Sentry.captureException(error);
  console.error("🛡️ CRITICAL FAULT IN OWEABLE MCP:", error);
  process.exit(1);
});
