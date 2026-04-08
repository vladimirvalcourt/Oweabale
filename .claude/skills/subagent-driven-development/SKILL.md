
# Skill: Subagent-Driven Development

## Type
Rigid — follow every step in exact order, no skipping.

## Trigger
Load this skill whenever:
- A task has more than 2 distinct steps or files to modify
- The user says "build this", "implement this feature", or "set this up"
- You are about to write more than 50 lines of code in one go

## Instructions

1. **STOP** — do not write any code yet
2. **Write a spec first** — create a short markdown plan listing:
   - What needs to be built
   - Which files will be created or modified
   - What the expected output/behavior is
3. **Show the spec to the user** and wait for explicit approval before continuing
4. **Spin up a subagent per task** — break the approved spec into isolated subtasks, each handled independently
5. **Each subagent must**:
   - Receive a clear, single-responsibility instruction
   - Work only on its assigned file or feature
   - Report back with what it changed and why
6. **Stage 1 Review** — check every subagent's output against the original spec for compliance
7. **Stage 2 Review** — check code quality: naming, structure, no dead code, no regressions
8. **Merge results** only after both review stages pass
9. **Report to user** — list all changes made, files touched, and any open issues

## Rules
- Never start coding without an approved spec
- Never let one subagent modify another subagent's assigned files
- If a subagent fails, retry that task in isolation — do not restart the whole plan
- Always complete one full feature before starting the next

## Verification
This skill is working if:
- A written spec exists before any code is written
- Each task is isolated and traceable back to a spec item
- Both review stages are explicitly completed before delivery
