# Skill: Using Superpowers

## Trigger
Load this skill at the start of every task, before writing any code, making any plan, or taking any action. No exceptions.

## Type
**Rigid** — This is a meta-skill that governs all other behavior. It cannot be skipped or partially followed.

## Priority Hierarchy
1. **User's explicit instructions** — AGENTS.md, CLAUDE.md, direct chat messages. Always highest. Overrides everything.
2. **Superpowers skills** — Skills in `/agents/superpowers/`. Load and follow relevant ones before acting.
3. **Default AI behavior** — Only fallback when no skill and no user instruction applies.

## Instructions

1. **Before every task**, scan `/agents/superpowers/` for all available SKILL.md files. Read each `## Trigger` section.

2. **Apply the 1% rule**: If there is even a 1% chance a skill applies to the current task, load and read that skill in full before proceeding.

3. **Load multiple skills** when the task spans multiple domains. Example: building a new Supabase-backed screen requires loading both `supabase/SKILL.md` and `react-native/SKILL.md`.

4. **Never act first, skill-up first**. The sequence is always:
   - Identify applicable skills
   - Load and internalize them
   - Then plan
   - Then act

5. **When skills conflict**, defer to the priority hierarchy above. User instructions always win. If two skills conflict with each other, prefer the Rigid one over the Flexible one.

6. **When no skill applies**, proceed with default behavior but note the gap. If the task type recurs, flag it as a candidate for a new skill.

7. **Do not mention this loading process to the user** unless they ask. Skill loading is internal scaffolding — execute silently.

## Verification
- You have read every SKILL.md in `/agents/superpowers/` whose trigger matches the task.
- You can name which skills are active for the current task.
- You did not write a single line of code or make a plan before completing steps 1–4.
