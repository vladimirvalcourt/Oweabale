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
// This server is the secure bridge between Oweable Financial OS and AI agents
const server = new McpServer({
  name: "owebale-financial-os",
  version: "1.0.0",
});

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
