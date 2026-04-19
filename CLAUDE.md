# Owebale — Claude Instructions

## Active Skills

- Load `.claude/skills/debugging/SKILL.md` whenever a bug, error, or unexpected behavior is reported
- Load `.claude/skills/subagent-driven-development/SKILL.md` for any multi-step build task
- Load `.claude/skills/requesting-code-review/SKILL.md` before any merge or handoff
- Load `.claude/skills/security/SKILL.md` whenever auth, payments, or Supabase RLS is touched
- For Plaid work, use the **global** Claude Code skill at `~/.claude/skills/plaid/SKILL.md` (not in this repo). Run `python ~/.claude/skills/plaid/fetch_docs.py <topic>` for live docs from plaid.com.

## Git

- Always push to `main`
- Never push to a different branch without explicit permission

## Hugging Face usage (product + developer)

- **End users of Oweable never sign in to Hugging Face.** Any Hugging Face usage stays server-side (`HF_TOKEN` in Supabase Edge Function secrets). Do not add in-app Hugging Face login, token, or “connect HF” flows for customers.
- When a task needs the **Hugging Face MCP** (`hf-mcp-server` in `.cursor/mcp.json`), **ask the repo owner to authenticate in Cursor** (e.g. **Settings → MCP**, complete login for `hf-mcp-server`, or follow Cursor’s browser prompt / open `https://huggingface.co/mcp?login` if the IDE asks). That auth is for **you**, not for app users.

## Backend (Supabase / Postgres)

- If a task touches the database, RLS, RPCs, Edge Functions, storage policies, or webhooks, **ship the backend change**, not only app code or a local migration file.
- Apply migrations to the linked project (e.g. Supabase MCP `apply_migration` for DDL, or `supabase db push` when local migration history matches remote).
- After changing any Edge Function under `supabase/functions/`, **deploy it** to the linked project (e.g. `supabase functions deploy <name> --project-ref <ref>`). Resolve the project ref from the Supabase dashboard, `get_project_url` (MCP), or `VITE_SUPABASE_URL` (`https://<ref>.supabase.co`). Do not leave function-only fixes un-deployed.

## Code Standards

- Fix bugs proactively as you build — do not leave known issues for later
- You are the sole lead architect on this project
