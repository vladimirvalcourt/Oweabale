# Owebale — Claude Instructions

## Active Skills

- Load `.claude/skills/debugging/SKILL.md` whenever a bug, error, or unexpected behavior is reported
- Load `.claude/skills/subagent-driven-development/SKILL.md` for any multi-step build task
- Load `.claude/skills/requesting-code-review/SKILL.md` before any merge or handoff
- Load `.claude/skills/security/SKILL.md` whenever auth, payments, or Supabase RLS is touched

## Git

- Always push to `main`
- Never push to a different branch without explicit permission

## Backend (Supabase / Postgres)

- If a task touches the database, RLS, RPCs, Edge Functions, storage policies, or webhooks, **ship the backend change**, not only app code or a local migration file.
- Apply migrations to the linked project (e.g. Supabase MCP `apply_migration` for DDL, or `supabase db push` when local migration history matches remote).
- After changing any Edge Function under `supabase/functions/`, **deploy it** to the linked project (e.g. `supabase functions deploy <name> --project-ref <ref>`). Resolve the project ref from the Supabase dashboard, `get_project_url` (MCP), or `VITE_SUPABASE_URL` (`https://<ref>.supabase.co`). Do not leave function-only fixes un-deployed.

## Code Standards

- Fix bugs proactively as you build — do not leave known issues for later
- You are the sole lead architect on this project
