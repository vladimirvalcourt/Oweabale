#!/usr/bin/env bash
# Loads Plaid sandbox credentials from repo .env.local and starts the official Plaid MCP server.
# Requires: uv (https://docs.astral.sh/uv/) on PATH so `uvx` is available.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env.local" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT/.env.local"
  set +a
fi
if [[ -z "${PLAID_CLIENT_ID:-}" || -z "${PLAID_SECRET:-}" ]]; then
  echo "run-plaid-mcp: set PLAID_CLIENT_ID and PLAID_SECRET in .env.local (sandbox keys from Plaid Dashboard)." >&2
  exit 1
fi
exec uvx mcp-server-plaid --client-id "$PLAID_CLIENT_ID" --secret "$PLAID_SECRET"
