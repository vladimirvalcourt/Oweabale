#!/usr/bin/env bash
# Connect Cursor to Plaid's production Dashboard MCP (Link analytics, item debug, usage).
# https://plaid.com/docs/resources/mcp/
#
# Requires: Node 18+ (npx), curl. Production Plaid approval + production API keys.
# OAuth access token is minted on each MCP start (~15 min). Restart MCP in Cursor if tools return 401.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env.local" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT/.env.local"
  set +a
fi

CID="${PLAID_DASHBOARD_CLIENT_ID:-${PLAID_CLIENT_ID:-}}"
SEC="${PLAID_DASHBOARD_SECRET:-${PLAID_SECRET:-}}"

if [[ -z "$CID" || -z "$SEC" ]]; then
  echo "plaid-dashboard-mcp: set PLAID_CLIENT_ID + PLAID_SECRET (production) in .env.local," >&2
  echo "  or PLAID_DASHBOARD_CLIENT_ID + PLAID_DASHBOARD_SECRET if Edge uses other keys." >&2
  exit 1
fi

export CID SEC
BODY=$(node -e '
  console.log(JSON.stringify({
    client_id: process.env.CID,
    client_secret: process.env.SEC,
    grant_type: "client_credentials",
    scope: "mcp:dashboard",
  }));
')

RESP=$(curl -sS -X POST "https://production.plaid.com/oauth/token" \
  -H "Content-Type: application/json" \
  -d "$BODY")

ACCESS=$(node -e "
  const j = JSON.parse(process.argv[1]);
  if (!j.access_token) {
    console.error(j.error_message || j.error_code || JSON.stringify(j));
    process.exit(1);
  }
  console.log(j.access_token);
" "$RESP")

export PLAID_DASHBOARD_MCP_HEADER="Bearer ${ACCESS}"

exec npx -y mcp-remote@latest "https://api.dashboard.plaid.com/mcp" \
  --transport http-first \
  --header "Authorization:${PLAID_DASHBOARD_MCP_HEADER}"
