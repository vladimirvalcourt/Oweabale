
# Skill: Debugging

## Type
Rigid — follow these steps exactly, in order, every time.

## Trigger
Load this skill whenever:
- A bug, error, or unexpected behavior is reported
- You see a stack trace, runtime error, or test failure
- The user says anything like "it's broken", "not working", "fix this", "why is this failing"

## Instructions

1. **STOP** — do not write any code yet
2. **Read the full error message** — identify the exact file, line number, and error type
3. **Reproduce the problem** — confirm you understand when and why it occurs before touching anything
4. **Identify the root cause** — trace the error back to its origin, not just the symptom
5. **Explain the bug** to the user in one sentence before fixing it
6. **Write the minimal fix** — change only what is necessary, nothing more
7. **Verify the fix** — re-run the failing code, test, or function to confirm the error is gone
8. **Check for regressions** — scan for any related areas that the fix could have broken
9. **Report back** — summarize what was wrong, what was changed, and what was verified

## Rules
- Never guess — if you're unsure of the root cause, say so and ask
- Never refactor while debugging — fix first, clean up later
- Never silence an error without understanding it (no empty catch blocks)
- One bug at a time — if you find additional issues, list them but don't fix them yet

## Verification
This skill is working correctly if:
- You always explain the bug before writing any fix
- You never modify unrelated code during a debug session
- Every fix is followed by a confirmation that the error no longer occurs
