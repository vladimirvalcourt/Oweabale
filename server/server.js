/**
 * Oweable MCP server — stdio transport with Supabase service role when configured.
 *
 * Security: Any process that can invoke this server can read `profiles.financial_data`
 * for arbitrary user IDs. Run only on trusted hosts, restrict OS/file permissions,
 * and never expose this binary or its env (SUPABASE_SERVICE_ROLE_KEY) to untrusted callers.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from '@supabase/supabase-js';
import { z } from "zod";
// Initialize Supabase client using environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mcpAllowedUserIds = (process.env.MCP_ALLOWED_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
const enforceAllowlist = process.env.MCP_ENFORCE_ALLOWLIST !== 'false';
if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.');
}
const supabase = supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;
if (supabase) {
    console.error('[owebale-mcp] Service role client active. Treat this process as highly privileged; restrict who can execute it.');
}
function assertAllowedUserId(userId) {
    if (!enforceAllowlist)
        return;
    if (mcpAllowedUserIds.length === 0) {
        throw new Error('MCP allowlist is empty. Set MCP_ALLOWED_USER_IDS or MCP_ENFORCE_ALLOWLIST=false for local testing only.');
    }
    if (!mcpAllowedUserIds.includes(userId)) {
        throw new Error('Requested user is not in MCP_ALLOWED_USER_IDS allowlist.');
    }
}
// 🚀 Create the High-Performance MCP Server
const server = new McpServer({
    name: "owebale-financial-os",
    version: "1.0.0",
});
// 🛠️ Tool: Get Account Summary
// Standard tool logic (Sentry-free)
server.tool("get_account_summary", "Retrieves a 360-degree financial overview for a specific user ID.", { userId: z.string().uuid().describe("The UUID of the user") }, async ({ userId }) => {
    try {
        console.error("🛡️ MCP TOOL: Loading account summary");
        if (!supabase) {
            throw new Error('Supabase is not configured for MCP server.');
        }
        assertAllowedUserId(userId);
        const { data, error } = await supabase
            .from('profiles')
            .select('financial_data')
            .eq('id', userId)
            .single();
        if (error) {
            console.error('Supabase error while loading account summary:', error);
            throw error;
        }
        return {
            content: [{ type: "text", text: JSON.stringify(data?.financial_data || {}, null, 2) }],
        };
    }
    catch (err) {
        const error = err;
        console.error("🛡️ TOOL FAULT:", error.message);
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});
// Helper: Stdio transport for local or edge deployment
const transport = new StdioServerTransport();
async function runServer() {
    console.info("Oweable MCP Server Status: [ ONLINE ]");
    await server.connect(transport);
}
// 🛡️ Error Catcher for Root Faults
runServer().catch((error) => {
    console.error("🛡️ CRITICAL FAULT IN OWEABLE MCP:", error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map