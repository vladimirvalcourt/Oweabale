# Skill: Writing Superpowers Skills

## Trigger
Load this skill whenever:
- Creating a new SKILL.md file
- Editing or improving an existing SKILL.md
- Reviewing a skill for quality or completeness
- Being asked to define a new skill for a domain, tool, or workflow

## Type
**Flexible** — The structure is required. The content and depth should be calibrated to the skill's complexity and how often it will be used.

## Instructions

### Before Writing
1. Identify the skill's domain clearly. A skill should cover one domain, tool, or workflow — not multiple. If it covers more than two unrelated concerns, split it.
2. Decide: is this skill **Rigid** or **Flexible**?
   - **Rigid**: The behavior must always be followed exactly. Deviation causes bugs, security issues, or broken processes. Use for: security, TDD cycles, auth flows, data integrity rules.
   - **Flexible**: These are strong conventions that improve quality but allow informed deviation. Use for: styling patterns, component structure, naming conventions, API usage patterns.

### Writing the Trigger
3. Write triggers as specific, observable conditions — not vague topic labels.
   - Bad: "When working with React"
   - Good: "When creating a new component, hook, or screen in a React project"
4. List multiple trigger conditions with bullet points. Include file types, task types, and tool names where relevant.
5. The trigger must be narrow enough that it fires when relevant and does not fire when irrelevant.

### Writing the Instructions
6. Number every step. Steps must be imperative and actionable ("Do X", not "X should be done").
7. Each step must describe exactly one action or decision. No compound steps.
8. Include concrete examples (code snippets, commands, patterns) wherever abstract instructions could be misinterpreted.
9. For Rigid skills: include the exact sequence of actions and what must be true before moving to the next step.
10. For Flexible skills: group instructions by sub-topic with `###` subheadings. Indicate when deviation is acceptable and what documentation is required.
11. Keep total instruction count between 8 and 25 steps. Fewer means the skill is too shallow. More means it should be split.

### Writing the Verification Section
12. Verification items must be checkable at task completion — binary pass/fail, not subjective.
   - Bad: "The code looks clean"
   - Good: "No inline style objects exist except for dynamic values"
13. Include 4–7 verification items. One per major instruction group.
14. Verification items should catch the most common ways this skill gets violated.

### Final Review
15. Read the skill as if you are an AI agent seeing it for the first time with no prior context. Every instruction must be unambiguous.
16. Remove any instruction that says "consider" or "think about" — these are not actions.
17. Confirm the skill file follows this exact structure:
    ```
    # Skill: [Name]
    ## Trigger
    ## Type
    ## Instructions
    ## Verification
    ```

## Verification
- The skill covers exactly one domain or workflow.
- Rigid vs Flexible is declared and appropriate.
- Every instruction step is numbered, imperative, and single-action.
- Verification items are binary (pass/fail), not subjective.
- The skill reads unambiguously to an agent with no prior context.
- No step uses "consider", "think about", or other non-actionable language.
