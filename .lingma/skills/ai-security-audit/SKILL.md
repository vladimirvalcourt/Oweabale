# AI Security Audit & Hardening Skill

Audit and harden projects against AI coding assistant security vulnerabilities. Implements protections from SECURITY_SKILLS.md guide covering 5 attack vectors, tool-specific deny rules, test isolation, and incident response.

## When to Use

- User asks to "audit AI security" or "check AI assistant protections"
- User wants to "fix secret leakage" or "prevent AI from reading .env files"
- User mentions "Claude Code security", "Cursor security", "Copilot security"
- User requests "test environment isolation" or "pre-commit hook for secrets"
- New project setup requiring AI security baseline
- After security incident involving AI tools
- Quarterly security review of AI tool configurations

## Core Principles

1. **Advisory rules are NOT security** - Only system-level deny rules enforce boundaries
2. **Test isolation is critical** - `.env.test` with dummy values blocks runtime leaks (Path 2)
3. **Defense in depth required** - Multiple layers: gitignore, pre-commit hooks, CI/CD scanning, tool-specific rules
4. **Assume AI can read anything** - Unless explicitly blocked by system-level controls
5. **Rotate immediately on exposure** - Any leaked secret must be treated as compromised

## Attack Vectors (Know All 5)

### Path 1: Direct File Read
AI opens `.env` → secrets enter conversation context → sent to model provider
**Mitigation:** Tool-specific ignore files (`.cursorignore`, deny rules)

### Path 2: Runtime Output Capture  
AI runs tests/app → error logs show credentials → captured in output
**Mitigation:** `.env.test` with dummy values (HIGHEST PRIORITY)

### Path 3: Grep/Search Tools
AI searches codebase → grep hits config files → secrets visible in matches
**Mitigation:** Tool-specific search restrictions + deny rules

### Path 4: Prompt Injection (CRITICAL)
Malicious instructions hidden in rules files via Unicode chars → AI executes arbitrary commands
**Mitigation:** Skill validation, deny writes to config files, audit skills directory

### Path 5: Cross-Agent Propagation
Compromised Copilot writes to Claude's `.mcp.json` → loads on next start
**Mitigation:** Regular audits, deny cross-tool config writes

## Implementation Workflow

### Phase 1: Immediate Fixes (Do First)

#### Step 1: Create `.env.test` with Dummy Values
```bash
# Create file with safe-to-commit dummy credentials
cat > .env.test << 'EOF'
# SAFE TO COMMIT: Dummy/mock values for testing
VITE_SUPABASE_URL=https://dummy-test-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_test_token.signature
STRIPE_PUBLISHABLE_KEY=pk_test_TYooMQauvdEDq54NiTphI7jx
PLAID_CLIENT_ID=dummy_plaid_client_id
PLAID_SECRET=dummy_plaid_secret_for_testing
RESEND_API_KEY=re_test_dummy_key_for_testing_only
DATABASE_URL=postgres://test:test@localhost:5432/testdb
# ... add all env vars with dummy values
EOF

# Whitelist in .gitignore
echo "!.env.test" >> .gitignore
```

**Validation:**
```bash
ls -lh .env.test  # Should exist
grep -c "dummy\|test\|example" .env.test  # Should have many matches
grep -c "sk_live_\|real_" .env.test  # Should be 0
```

#### Step 2: Install Pre-Commit Hook
```bash
mkdir -p .husky
cat > .husky/pre-commit << 'HOOK'
#!/bin/sh
echo "🔒 Running secret detection..."

SECRETS_FOUND=0

# Check for live API keys
if git diff --cached | grep -iE '(sk_live_[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36})'; then
  echo "❌ POTENTIAL SECRET DETECTED"
  SECRETS_FOUND=1
fi

# Check for private keys
if git diff --cached | grep -E '-----BEGIN (RSA |EC )?PRIVATE KEY-----'; then
  echo "❌ PRIVATE KEY DETECTED"
  SECRETS_FOUND=1
fi

if [ $SECRETS_FOUND -eq 1 ]; then
  echo "❌ COMMIT BLOCKED: Remove secrets before committing"
  exit 1
fi

echo "✅ No secrets detected"
exit 0
HOOK

chmod +x .husky/pre-commit
```

**Validation:**
```bash
ls -lh .husky/pre-commit  # Should be executable (-rwxr-xr-x)
```

### Phase 2: Tool-Specific Protections

#### For Cursor Users

**Create `.cursorignore`:**
```bash
cat > .cursorignore << 'EOF'
# Block sensitive file indexing
.env
.env.local
.env.production
*.pem
*.key
*.p12
.aws/
.ssh/
secrets/
credentials/
.npmrc
.pypirc
EOF
```

**Create `.cursorrules` with security section:**
```bash
cat > .cursorrules << 'EOF'
## Security Rules

- NEVER read, display, or reference contents of .env files
- NEVER execute commands that expose secrets: cat .env, printenv, env
- NEVER include hardcoded credentials in any output
- When env vars needed, reference by name only: process.env.VAR_NAME
- For testing, always use .env.test (contains dummy values)
- If task requires real credentials, STOP and ask user
EOF
```

#### For Claude Code Users

**Create `~/.claude/settings.json` (user-level, not in repo):**
```json
{
  "permissions": {
    "deny": [
      "Read(**/.env*)",
      "Read(**/*.pem)",
      "Read(**/*.key)",
      "Read(**/secrets/**)",
      "Read(**/.aws/**)",
      "Read(**/.ssh/**)",
      "Write(**/.env*)",
      "Write(**/.claude/**)",
      "Bash(cat .env*)",
      "Bash(printenv)",
      "Bash(git push *)",
      "Bash(npm publish *)"
    ],
    "defaultMode": "acceptEdits"
  }
}
```

**Update project `CLAUDE.md`:**
```markdown
## Security Critical

- NEVER read .env files (use names only: process.env.VAR_NAME)
- NEVER run commands exposing secrets: cat .env, printenv
- For testing, use .env.test with dummy values
- If real credentials needed, STOP and ask user
```

#### For GitHub Copilot Users

**VS Code `settings.json`:**
```json
{
  "github.copilot.enable": {
    "plaintext": false,
    "markdown": false
  },
  "files.associations": {
    ".env": "plaintext",
    "*.key": "plaintext",
    "*.pem": "plaintext"
  }
}
```

**For Enterprise plans:** Configure Content Exclusion in org settings at `Organization Settings → Copilot → Content Exclusion`

### Phase 3: Documentation & Training

**Create audit report:**
```bash
cat > AI_SECURITY_AUDIT_REPORT.md << 'EOF'
# AI Security Audit Report

## Current Status
- Compliance Score: X/10 controls
- Risk Level: HIGH/MEDIUM/LOW

## Findings
[List each control with ✅ or ❌]

## Recommendations
[Prioritized fix list]
EOF
```

**Create quick reference:**
```bash
cat > AI_SECURITY_QUICK_REFERENCE.md << 'EOF'
# AI Security Quick Reference

## Critical Rules
1. NEVER commit real credentials
2. ALWAYS use .env.test for testing
3. NEVER paste secrets in AI chat

## Protected Files
✅ Safe: .env.example, .env.test
❌ Forbidden: .env, .env.local, *.pem

## If Secret Leaks
1. Rotate immediately
2. Revoke old credential
3. Check git history
4. Report to team
EOF
```

## Verification Checklist

After implementation, verify each control:

```bash
# 1. Test environment isolation
[ -f .env.test ] && echo "✅ .env.test exists" || echo "❌ Missing .env.test"

# 2. Pre-commit hook
[ -x .husky/pre-commit ] && echo "✅ Pre-commit hook executable" || echo "❌ Hook missing/not executable"

# 3. Cursor protection (if using Cursor)
[ -f .cursorignore ] && echo "✅ .cursorignore exists" || echo "⚠️  No .cursorignore"
[ -f .cursorrules ] && echo "✅ .cursorrules exists" || echo "⚠️  No .cursorrules"

# 4. Git ignore baseline
grep -q "^\.env\*" .gitignore && echo "✅ .env* in .gitignore" || echo "❌ .env* not ignored"

# 5. CI/CD scanning
[ -f .github/workflows/security.yml ] && echo "✅ Security workflow exists" || echo "⚠️  No CI/CD scanning"

# 6. No real secrets in .env.test
! grep -q "sk_live_\|real_password\|production" .env.test && echo "✅ .env.test has no real secrets" || echo "❌ .env.test contains real secrets"
```

## Testing the Implementation

### Test Pre-Commit Hook
```bash
# Try to commit a fake secret
echo "API_KEY=sk_live_abc123def456ghi789jkl012" > test-secret.txt
git add test-secret.txt
git commit -m "test: should be blocked"

# Expected: Commit blocked with error message
# Clean up:
git reset HEAD test-secret.txt
rm test-secret.txt
```

### Test .env.test Loading
```bash
# Verify tests load from .env.test
npm run test 2>&1 | grep -i "supabase\|stripe" 
# Should show dummy URLs, not production
```

### Test Cursor Ignore
```bash
# In Cursor IDE, try to open .env.local via AI
# Expected: AI cannot access file (blocked by .cursorignore)
```

## Incident Response Procedure

If a secret is exposed:

1. **Immediate (First 15 min)**
   ```bash
   # Rotate the credential in service dashboard
   # Example for Stripe: https://dashboard.stripe.com/apikeys
   
   # Check git history for exposure scope
   git log --all -p -- .env
   
   # Review API usage logs for unauthorized access
   ```

2. **Short-term (Next 24 hours)**
   - Document incident (what leaked, how, impact)
   - Update security controls to prevent recurrence
   - Notify affected team members

3. **Long-term (Next week)**
   - Conduct post-mortem
   - Implement additional safeguards
   - Update team training

## Common Patterns to Detect

### Live API Keys
```regex
sk_live_[a-zA-Z0-9]{20,}     # Stripe
ghp_[a-zA-Z0-9]{36}          # GitHub
xox[baprs]-[a-zA-Z0-9-]+     # Slack
AKIA[0-9A-Z]{16}             # AWS
```

### Private Keys
```regex
-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----
```

### Passwords with Long Values
```regex
password\s*=\s*["'][^"']{8,}
```

### Generic Secrets
```regex
(secret|token|api_key)\s*=\s*["'][a-zA-Z0-9+/=]{20,}
```

## Maintenance Schedule

### Monthly
- [ ] Rotate dummy credentials in `.env.test`
- [ ] Review pre-commit hook effectiveness
- [ ] Check for new AI tool updates

### Quarterly
- [ ] Full security audit (re-run this skill)
- [ ] Update SECURITY_SKILLS.md with new CVEs
- [ ] Team training refresh
- [ ] Audit skills directory for prompt injection

### Annually
- [ ] Complete overhaul of all controls
- [ ] Penetration testing including AI vectors
- [ ] Update compliance documentation

## Resources

- [SECURITY_SKILLS.md](./SECURITY_SKILLS.md) - Comprehensive guide
- [gitleaks](https://github.com/gitleaks/gitleaks) - Secret scanning tool
- [trufflehog](https://github.com/trufflesecurity/trufflehog) - Advanced secret detection
- [GitGuardian](https://www.gitguardian.com/) - Enterprise secret management

## Key Metrics to Track

- **Compliance Score:** X/10 controls implemented
- **Risk Level:** HIGH / MEDIUM / LOW
- **Time to Detection:** How quickly secrets are caught (pre-commit vs CI/CD vs post-merge)
- **False Positive Rate:** How often legitimate code is blocked
- **Incident Count:** Number of secret exposures per quarter

## Success Criteria

Implementation is complete when:
- ✅ `.env.test` exists with dummy values
- ✅ Pre-commit hook installed and executable
- ✅ Tool-specific protections configured (based on team's AI tools)
- ✅ CI/CD scanning active (gitleaks or equivalent)
- ✅ Documentation created (audit report + quick reference)
- ✅ Team trained on security practices
- ✅ Compliance score ≥ 70% (7/10 controls)
- ✅ Risk level reduced to MEDIUM or LOW
