# AI Security Quick Reference Card

**For:** All developers using AI coding assistants on Oweable project  
**Last Updated:** May 1, 2026  

---

## 🚨 Critical Rules (NEVER Break These)

1. **NEVER** commit real credentials to git
2. **NEVER** paste secrets in chat conversations with AI
3. **NEVER** use production keys for testing
4. **ALWAYS** use `.env.test` for test scenarios
5. **ALWAYS** reference env vars by name only (`process.env.VAR_NAME`)

---

## 🔐 Protected Files

### ✅ Safe to Commit
- `.env.example` — Template with placeholder values
- `.env.test` — Dummy/mock credentials for testing
- `SECURITY_SKILLS.md` — Security guide
- `.cursorignore` — Cursor ignore rules
- `.cursorrules` — Cursor advisory rules

### ❌ NEVER Commit
- `.env` — Your local development credentials
- `.env.local` — Local overrides with real secrets
- `.env.production` — Production credentials
- `*.pem`, `*.key` — Private keys
- `.npmrc`, `.pypirc` — Token files
- `.aws/`, `.ssh/` — Cloud provider configs

---

## 🧪 Testing

### Before Running Tests
```bash
# Verify .env.test is loaded
node -e "console.log(process.env.VITE_SUPABASE_URL)"
# Should show: https://dummy-test-project.supabase.co
```

### If Tests Fail with Auth Errors
1. Check if `.env.test` exists: `ls -la .env.test`
2. Verify test config loads from `.env.test`
3. Never add real credentials to fix test failures

---

## 🛡️ Pre-Commit Hook

The hook automatically blocks commits containing:
- Live API keys (sk_live_*, ghp_*, xox[baprs]-*)
- Private keys (BEGIN PRIVATE KEY)
- AWS credentials (AKIA*)
- Long passwords/secrets

### If Hook Blocks Your Commit
1. Review the error message
2. Remove the secret from your changes
3. Use environment variables instead
4. For test values, use dummy credentials from `.env.test`
5. If false positive, add pattern to `.gitleaks.toml` allowlist

---

## 🤖 AI Tool-Specific Guidance

### Cursor
- `.cursorignore` blocks sensitive file indexing
- `.cursorrules` provides security guidance
- Can still manually open files (human override)
- NEVER ask AI to read `.env.local`

### Claude Code
- Advisory rules in `CLAUDE.md`
- System-level deny rules NOT configured yet (Priority 4)
- Assume AI CAN read any file not blocked by gitignore
- Be explicit: "Use environment variable names only"

### GitHub Copilot
- Content exclusion enabled (Enterprise plan)
- Still verify suggestions don't include hardcoded secrets
- Disable for plaintext/markdown files in VS Code settings

---

## 🚩 Red Flags (Stop Immediately If You See These)

- AI suggests hardcoding API keys "for testing"
- AI offers to read your `.env` file to "help debug"
- Error logs show full connection strings with passwords
- Test output displays bearer tokens or API keys
- AI modifies security config files without permission

---

## 📞 Incident Response

### If You Accidentally Commit a Secret

1. **Rotate immediately** — Generate new credentials
2. **Revoke old secret** — Invalidate in service dashboard
3. **Check git history** — `git log --all -p -- .env`
4. **Report to team** — Slack #security channel
5. **Document incident** — What leaked, how, impact

### If AI Exposes Secrets in Chat

1. **Delete conversation** — Remove from AI tool history
2. **Rotate exposed credentials** — Treat as compromised
3. **Check for unauthorized usage** — Review API logs
4. **Report to team** — Share lessons learned

---

## ✅ Daily Checklist

Before committing code:
- [ ] No hardcoded credentials in my changes
- [ ] Using environment variables for all secrets
- [ ] Test values are from `.env.test` (dummy credentials)
- [ ] Pre-commit hook passes without warnings
- [ ] Reviewed AI suggestions for accidental secret inclusion

---

## 📚 Resources

- [SECURITY_SKILLS.md](./SECURITY_SKILLS.md) — Comprehensive guide
- [AI_SECURITY_AUDIT_REPORT.md](./AI_SECURITY_AUDIT_REPORT.md) — Audit findings
- [AI_SECURITY_IMPLEMENTATION_SUMMARY.md](./AI_SECURITY_IMPLEMENTATION_SUMMARY.md) — Implementation details
- [SECURITY_QUICK_REFERENCE.md](./SECURITY_QUICK_REFERENCE.md) — App security reference

---

## 🔗 Quick Links

- Rotate Stripe keys: https://dashboard.stripe.com/apikeys
- Rotate Supabase keys: https://app.supabase.com/project/_/settings/api
- Rotate Plaid keys: https://dashboard.plaid.com/team/keys
- Rotate Resend keys: https://resend.com/api-keys
- View gitleaks report: GitHub Actions → Security workflow

---

**Remember:** Security is everyone's responsibility. When in doubt, ask! 🛡️
