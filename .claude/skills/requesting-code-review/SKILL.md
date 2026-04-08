
# Skill: Requesting Code Review

## Type
Rigid — follow this process exactly every time a review is requested.

## Trigger
Load this skill whenever:
- The user says "review this", "check my code", or "look this over"
- A feature branch is complete and ready to merge
- You finish implementing something and are about to hand it back to the user

## Instructions

1. **STOP** — do not approve or comment casually, treat this as a formal review
2. **Spawn a code-reviewer subagent** with the following authority framing:
   > "You are a senior engineer conducting a formal code review. Be critical. Your job is to find problems, not to compliment."
3. **The reviewer must check for**:
   - Logic errors and edge cases
   - Security vulnerabilities (auth, input validation, data exposure)
   - Performance issues (unnecessary re-renders, N+1 queries, missing indexes)
   - Code style and naming consistency
   - Missing or insufficient error handling
4. **Categorize every finding** by severity:
   - 🔴 **Critical** — must fix before merge (security holes, broken logic)
   - 🟡 **Warning** — should fix soon (performance, bad patterns)
   - 🟢 **Suggestion** — optional improvements (style, readability)
5. **Fix all Critical issues immediately** — do not ask the user, just fix them
6. **Present Warnings and Suggestions** to the user with a recommended action for each
7. **Re-run the review** after fixes are applied to confirm Critical issues are resolved
8. **Deliver a final review summary** — what was found, what was fixed, what remains

## Rules
- Never skip the subagent — always use a separate reviewer perspective
- Never merge or approve code with unresolved Critical issues
- Suggestions are optional — never block a merge on style preferences
- If you find Critical issues in unrelated files, flag them but do not fix them

## Verification
This skill is working if:
- Every review produces a categorized findings list
- No Critical issue is left unresolved before handoff
- A final summary is always delivered to the user
