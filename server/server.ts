import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from '@supabase/supabase-js';
import { z } from "zod";

// Initialize Supabase client using environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.');
}

const supabase = supabaseUrl && supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

// 🚀 Create the High-Performance MCP Server
const server = new McpServer({
  name: "owebale-financial-os",
  version: "1.0.0",
});

// 🛠️ Tool: Get Account Summary
// Standard tool logic (Sentry-free)
server.tool(
  "get_account_summary",
  "Retrieves a 360-degree financial overview for a specific user ID.",
  { userId: z.string().describe("The UUID of the user") },
  async ({ userId }) => {
    try {
      console.error(`🛡️ MCP TOOL: Loading summary for user ${userId}`);
      
      // If Supabase client is available, fetch real data; otherwise return mock
      if (supabase) {
        // Fetch actual data from Supabase
        const { data, error } = await supabase
          .from('profiles')
          .select('financial_data')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }
        
        return {
          content: [{ type: "text", text: JSON.stringify(data?.financial_data || {}, null, 2) }],
        };
      } else {
        // Fallback to mock data if Supabase isn't configured
        console.warn("Supabase not configured, using mock data");
        const mockSummary = {
          total_assets: 125000,
          total_liabilities: 45000,
          net_worth: 80000,
          status: "Healthy",
        };

        return {
          content: [{ type: "text", text: JSON.stringify(mockSummary, null, 2) }],
        };
      }
    } catch (err) {
      const error = err as Error;
      console.error("🛡️ TOOL FAULT:", error.message);
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Helper: Stdio transport for local or edge deployment
const transport = new StdioServerTransport();

async function runServer() {
  console.error("🚀 Oweable MCP Server Status: [ ONLINE ]");
  await server.connect(transport);
}

// 🛡️ Error Catcher for Root Faults
runServer().catch((error) => {
  console.error("🛡️ CRITICAL FAULT IN OWEABLE MCP:", error);
  process.exit(1);
});