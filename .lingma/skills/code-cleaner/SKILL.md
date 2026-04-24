# Code Cleaner (Code Hygiene Scanner)

Analyzes files for bugs, code smells, complexity issues, security risks, and React-specific anti-patterns using ESLint and custom pattern detection.

---

## When to Use This Skill

- User asks to "review", "audit", "scan", or "check" a file
- User says "find bugs", "what's wrong with this", or "roast my code"  
- Before committing or deploying any file
- After AI-generated code is written (self-audit)
- Specifically for React components to catch common pitfalls

---

## Setup

No additional setup required! The scanner uses your project's existing ESLint configuration plus custom React pattern detection.

**Requirements:**
- ESLint must be installed in your project (already present)
- Node.js 16+ (for ES modules support)

---

## What It Detects

### ESLint Rules (from your project config)
- TypeScript/JavaScript syntax errors
- Unused variables and imports
- Code quality issues (eqeqeq, no-var, prefer-const)
- Security concerns (no-eval, no-implied-eval)
- Best practices (no-shadow, no-param-reassign)
- And all other rules in your `eslint.config.js`

### React-Specific Patterns
- **useEffect without dependency array** - Runs on every render (performance issue)
- **Inline objects/arrays in JSX props** - Causes unnecessary re-renders
- **Missing key prop in .map()** - React warning, breaks reconciliation

---

## Usage

```bash
node scripts/hygiene-scan.mjs <path/to/file.tsx>
```

Example:
```bash
node scripts/hygiene-scan.mjs src/components/BankConnection.tsx
```

---

## Output Format

The scanner returns JSON with structured findings:

```json
{
  "file": "src/components/MyComponent.tsx",
  "totalIssues": 4,
  "errors": 1,
  "warnings": 3,
  "issues": [
    {
      "type": "error",
      "rule": "missing-key-prop",
      "line": 42,
      "message": ".map() returns JSX but no \"key\" prop found..."
    },
    {
      "type": "smell",
      "rule": "useeffect-no-deps", 
      "line": 15,
      "message": "useEffect has no dependency array..."
    }
  ]
}
```

---

## How to Interpret Results

When presenting findings to the user:

1. **Group by severity**:
   - 🔴 **Errors** - Must fix before shipping (syntax errors, missing keys)
   - 🟡 **Warnings** - Should fix (code quality, performance)
   - 🔵 **Smells** - Nice to clean up (useEffect deps, inline objects)

2. **For each issue**, explain:
   - What the problem is
   - Why it matters (performance, correctness, maintainability)
   - A concrete fix with code example

3. **End with a summary score**:
   - ✅ **Clean** - 0 errors + 0 warnings
   - 🟡 **Minor Issues** - 1-3 warnings/smells
   - 🔴 **Needs Attention** - Any errors or 4+ warnings

---

## Example Output

```
🔍 Hygiene Scan: src/components/UserList.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found 3 issues (1 error, 2 warnings)

🔴 Line 42 [error] missing-key-prop
  .map() returns JSX but no "key" prop found
  → Add unique key: {users.map(u => <UserCard key={u.id} ... />)}

🟡 Line 15 [smell] useeffect-no-deps  
  useEffect has no dependency array — runs on every render
  → Add dependencies: useEffect(() => { ... }, [userId])

🟡 Line 28 [performance] inline-object-prop
  Inline object in JSX prop causes re-renders
  → Extract: const style = useMemo(() => ({...}), [])

━━━━━━━━━━━━━━━━━━━━━━━━
Score: 🔴 Needs Attention (fix errors before shipping)
```

---

## Common Fixes

### useEffect Missing Dependencies
```tsx
// ❌ Bad - runs every render
useEffect(() => {
  fetchData(userId);
});

// ✅ Good - runs when userId changes
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

### Inline Objects in Props
```tsx
// ❌ Bad - new object every render
<Component style={{ color: 'red' }} />

// ✅ Good - stable reference
const style = useMemo(() => ({ color: 'red' }), []);
<Component style={style} />
```

### Missing Key in .map()
```tsx
// ❌ Bad - no key
{items.map(item => <Item {...item} />)}

// ✅ Good - unique key
{items.map(item => <Item key={item.id} {...item} />)}
```
