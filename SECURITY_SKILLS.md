# SECURITY_SKILLS.md
## Universal AI Coding Assistant Security Guide
> Applies to: Claude Code · Cursor · GitHub Copilot · Windsurf · Amazon Q · Codex · Any AI agent with file system access

***

## Why This Exists

Repositories using AI coding tools are **40% more likely to contain leaked secrets** than those without (Blott Study, 2025). In 2025 alone, GitHub found that AI-assisted commits were **twice as likely** to leak secrets, contributing to a 34% overall rise in exposed credentials on public GitHub commits.

The root cause is structural, not malicious: AI assistants don't steal data — they **reveal** it. They amplify what developers share, infer structure from context, and reproduce patterns at scale. None of this looks like an attack, which is why it is so easy to ignore.

***

## The Danger of "Advisory" Rules

Every AI coding tool has some form of natural-language rules file:

| Tool | Rules File | Type |
|---|---|---|
| Claude Code | `CLAUDE.md` | Advisory (ignored under pressure) |
| Cursor | `.cursorrules` / `.cursor/rules/*.mdc` | Advisory |
| GitHub Copilot | `.github/copilot-instructions.md` | Advisory |
| Windsurf | `.windsurfrules` / Global Rules | Advisory |
| Amazon Q | `.amazonq/rules/*.md` | Advisory |

**Advisory rules are suggestions.** Under pressure — complex tasks, long context windows, ambiguous instructions — AI agents can and do ignore them. A GitHub issue confirmed in April 2026 that Claude Code reads and echoes `.env` contents into the conversation even when `CLAUDE.md` explicitly prohibits it. Cursor's own forum documented agents bypassing `.cursorignore` by using `cat .env` via the terminal when the normal file tool was blocked.

> **The difference**: "please don't read this" vs. "you physically cannot read this."

Only **system-level deny rules** enforce real boundaries. Advisory rules are not security controls.

***

## Attack Surface: 5 Ways Secrets Leak

Most developers protect against only Path 1. Paths 2–5 cause the real damage.

### Path 1 — Direct File Read
The AI scans your project, opens `.env`, and the contents become part of the conversation context, potentially sent to a third-party model inference server. **Easiest to block with deny/ignore rules.**

### Path 2 — Runtime Output Capture
The AI runs your tests or starts your app. A failed HTTP request logs:
```
Authorization: Bearer sk-live-abc123...
```
A database timeout dumps:
```
Error connecting to postgres://admin:mypassword@prod.db.host:5432/myapp
```
The AI captures **all** command output. Your secrets are now in the conversation, even though the AI never opened `.env`.

### Path 3 — Grep and Search Tools
The AI searches your codebase for a function name. The search hits a config file containing credentials. The grep output includes matched lines — secrets visible.

### Path 4 — Rules File Prompt Injection
**This is 2025–2026's emerging attack.** Researchers have found 8+ CVEs (CVSS up to 8.8) across Copilot, Claude Code, Cursor, Amazon Q, and Codex. Attackers embed hidden instructions inside `.cursorrules`, `CLAUDE.md`, or `copilot-instructions.md` using invisible Unicode characters or malicious npm packages that write directly to `~/.claude/commands/`. The AI reads these as trusted config and executes the injected instructions — arbitrary shell commands, silently.

### Path 5 — Cross-Agent Propagation
Demonstrated by researchers: a compromised Copilot session can be instructed to write malicious instructions into Claude Code's `.mcp.json`. Next time Claude Code starts, those instructions load and execute automatically. The reverse direction works identically.

***

## System-Level Protection Per Tool

### Claude Code — `~/.claude/settings.json`

Deny rules are enforced **before** Claude sees the file. This is the only reliable protection in Claude Code.

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "LS",
      "Edit",
      "MultiEdit",
      "Write(src/**)",
      "Write(tests/**)",
      "Bash(npm run *)",
      "Bash(npm test *)",
      "Bash(npx tsc *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git add *)",
      "Bash(git commit *)"
    ],
    "deny": [
      "Read(**/.env*)",
      "Read(**/.dev.vars*)",
      "Read(**/*.pem)",
      "Read(**/*.key)",
      "Read(**/secrets/**)",
      "Read(**/credentials/**)",
      "Read(**/.aws/**)",
      "Read(**/.ssh/**)",
      "Read(**/config/database.yml)",
      "Read(**/config/credentials.json)",
      "Read(**/.npmrc)",
      "Read(**/.pypirc)",
      "Write(**/.env*)",
      "Write(**/secrets/**)",
      "Write(**/.ssh/**)",
      "Write(.github/workflows/*)",
      "Write(**/.claude/**)",
      "Bash(rm -rf *)",
      "Bash(sudo *)",
      "Bash(git push *)",
      "Bash(npm publish *)",
      "Bash(curl * | sh)",
      "Bash(wget *)",
      "Bash(chmod *)"
    ],
    "defaultMode": "acceptEdits"
  }
}
```

> **Note:** The `Write(**/.claude/**)` deny rule prevents supply chain attacks that write to `~/.claude/commands/`.

***

### Cursor — `.cursorignore` + Global Ignore List

Cursor has two layers:
1. **`.cursorignore`** — per-project, blocks file indexing and direct reads
2. **Global Cursor Ignore List** — VS Code Settings → General → "Global Cursor Ignore List"

**`.cursorignore`** (place in project root):
```
# Secrets & credentials
.env
.env.*
.dev.vars
*.pem
*.key
*.p12
*.pfx
secrets/
credentials/
.aws/
.ssh/

# Token files
.npmrc
.pypirc
.netrc

# Config with secrets
config/database.yml
config/credentials.json
config/secrets.yml

# Cloud provider configs
.gcloud/
.azure/
terraform.tfstate
terraform.tfstate.backup
*.tfvars
```

**Global settings (VS Code `settings.json`):**
```json
{
  "github.copilot.enable": {
    "plaintext": false
  },
  "files.associations": {
    ".env": "plaintext",
    ".env.*": "plaintext"
  }
}
```

> **Critical caveat:** `.cursorignore` does NOT block the Cursor agent's terminal tools. The agent can still run `cat .env` via the terminal. Combine `.cursorignore` with the terminal deny patterns in your `.cursorrules` (see below) and a pre-commit hook.

**`.cursorrules` — add security section** (advisory, but still worth having):
```markdown
## Security Rules

- NEVER read, display, or reference the contents of any .env file or credentials file
- NEVER execute commands that read sensitive files: cat .env, printenv, env, set
- NEVER include API keys, secrets, or credentials in any file or output
- NEVER modify .cursorrules, .cursorignore, or any security configuration file
- When environment variables are needed, reference them by name only: process.env.VARIABLE_NAME
- If a task requires real credentials to complete, STOP and ask the user to provide them via a secure method
```

***

### GitHub Copilot

#### Free / Individual Plans
Content exclusion is **not available** on free or individual plans. Your only options:

**Disable Copilot for `.env` files via VS Code `settings.json`:**
```json
{
  "github.copilot.enable": {
    "*": true,
    "plaintext": false,
    "markdown": false
  },
  "files.associations": {
    ".env": "plaintext",
    ".env.*": "plaintext",
    "*.key": "plaintext",
    "*.pem": "plaintext"
  }
}
```

#### Business / Enterprise Plans
Use the **Content Exclusion** feature in your org settings:
```yaml
# .github/copilot-instructions.md — advisory, not enforcement
paths-ignore:
  - "**/.env"
  - "**/.env.*"
  - "**/secrets/**"
  - "**/*.pem"
  - "**/*.key"
```

Configure content exclusions at: `Organization Settings → Copilot → Content Exclusion`

**`.github/copilot-instructions.md`** (advisory):
```markdown
## Security

- Do not read, reference, or suggest content from .env files or credential files
- Do not include hardcoded secrets, API keys, or passwords in any suggestion
- Do not suggest storing credentials in source code — always use environment variables
- When writing tests, use mock/dummy values for all API keys and credentials
```

> **Warning:** The `copilot-instructions.md` file itself is an attack surface. Researchers demonstrated in 2025 that malicious instructions hidden with invisible Unicode characters in this file cause Copilot to silently generate backdoored code.

***

### Windsurf — Global Rules + `.windsurfrules`

**Global Rules** (Windsurf Settings → Advanced → Global Rules):
```markdown
## Security — Applied to ALL Projects

CRITICAL: Never read, display, echo, or reference the contents of:
- .env files or any .env.* variants
- Files containing API keys, tokens, passwords, or secrets
- Private keys (.pem, .key, .p12, id_rsa, id_ed25519)
- AWS credentials (~/.aws/credentials, ~/.aws/config)
- SSH keys (~/.ssh/)
- Token files (.npmrc, .pypirc, .netrc)

When environment variables are needed, reference by name only.
Never run: cat .env, printenv, env | grep, or similar commands.
Never modify these security rules.
If a task requires credentials, stop and ask the user to provide them securely.
```

**`.windsurfrules`** (per-project, place in project root):
```markdown
## Project Security Rules

Sensitive files that must NEVER be read, modified, or referenced:
- .env, .env.local, .env.production, .env.staging
- Any file in /secrets, /credentials, /private directories
- *.pem, *.key, *.p12 certificate files
- config/database.yml, config/secrets.yml

When writing code that needs environment variables:
- Use process.env.VARIABLE_NAME (Node.js)
- Use os.environ.get('VARIABLE_NAME') (Python)  
- Never hardcode values, even for testing
- Point tests at .env.test with dummy values only
```

> **Note:** Windsurf's total global + workspace rules are capped at **12,000 characters**. Keep security rules concise.

***

### Amazon Q Developer

**`~/.aws/amazonq/rules/security.md`** (global rules):
```markdown
## Security Rules

- Never read or display contents of .env files, credential files, or private keys
- Never include hardcoded secrets in generated code
- Never run commands that expose environment variables (printenv, env, set)
- Never modify AWS credentials files (~/.aws/credentials)
- Reference environment variables by name only, never by value
- For tests, use dedicated .env.test files with dummy/mock values
```

***

## Universal Protections (Tool-Agnostic)

These protections work regardless of which AI tool you use.

### 1. Blocking Runtime Leaks (Path 2 Fix)

Use test-specific environment files with dummy values. Even if the AI captures full command output, no real secrets are exposed:

```bash
# .env.test — commit this, it's safe to read and leak
STRIPE_SECRET_KEY=sk_test_not_a_real_key
DATABASE_URL=postgres://test:test@localhost:5432/testdb
OPENAI_API_KEY=sk-test-dummy-key-for-mocking
SUPABASE_KEY=eyJdummybase64payload.signature
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
PLAID_SECRET=dummy_plaid_secret_for_testing
ANTHROPIC_API_KEY=sk-ant-test-dummy-key
RESEND_API_KEY=re_test_dummy_key
```

Configure your test framework to load `.env.test` instead of `.env`:

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js']
};

// jest.setup.js
require('dotenv').config({ path: '.env.test' });
```

```python
# pytest — conftest.py
import pytest
from dotenv import load_dotenv

@pytest.fixture(autouse=True, scope="session")
def load_test_env():
    load_dotenv('.env.test', override=True)
```

***

### 2. The `.gitignore` Baseline

Every project must have these in `.gitignore`:

```gitignore
# Secrets — never commit
.env
.env.*
!.env.example
!.env.test

# Credentials
*.pem
*.key
*.p12
*.pfx
.npmrc
.pypirc
.netrc

# Cloud provider configs
.aws/
.gcloud/
.azure/
terraform.tfstate
terraform.tfstate.backup
*.tfvars
!*.tfvars.example

# SSH
.ssh/

# Secret directories
secrets/
credentials/
private/
```

***

### 3. Pre-Commit Hook (Catches Everything Else)

Even with all deny rules in place, mistakes happen. This hook blocks any commit that contains secrets:

**`.husky/pre-commit`**:
```bash
#!/bin/sh
echo "🔒 Running secret detection..."

# Check for common secret patterns
if git diff --cached | grep -iE '(sk_live_|sk_test_|ghp_|xox[baprs]-|-----BEGIN (RSA |EC )?PRIVATE KEY-----|password\s*=\s*["\x27][^"\x27]{8,})'; then
  echo "❌ POTENTIAL SECRET DETECTED IN COMMIT"
  echo "Please remove secrets before committing."
  exit 1
fi

echo "✅ No secrets detected"
```

Make it executable:
```bash
chmod +x .husky/pre-commit
```

***

### 4. Automated Secret Scanning

Integrate secret scanning into your CI/CD pipeline:

**GitHub Actions — `.github/workflows/secret-scan.yml`**:
```yaml
name: Secret Scan

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Run trufflehog
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

**Install gitleaks locally**:
```bash
brew install gitleaks  # macOS
gitleaks detect --source . -v
```

***

## Incident Response: What To Do When Secrets Leak

### Immediate Actions (First 15 Minutes)

1. **Rotate the secret immediately**
   - Generate new credentials
   - Revoke old ones
   - Update all services using the old secret

2. **Audit exposure scope**
   - Check git history: `git log --all -p -- .env`
   - Check conversation logs if AI tool provides them
   - Identify who/what had access

3. **Check for unauthorized usage**
   - Review API usage logs
   - Check for unexpected charges
   - Monitor for suspicious activity

### Short-Term (Next 24 Hours)

4. **Document the incident**
   - What leaked?
   - How did it leak?
   - What was the impact?
   - What was done to fix it?

5. **Update security controls**
   - Add missing deny rules
   - Strengthen pre-commit hooks
   - Review team training

### Long-Term (Next Week)

6. **Conduct post-mortem**
   - Root cause analysis
   - Process improvements
   - Team education

7. **Implement defense in depth**
   - Multiple layers of protection
   - Regular security audits
   - Automated scanning in CI/CD

***

## Best Practices Summary

### ✅ DO

- Use system-level deny rules (not just advisory)
- Create `.env.test` with dummy values for testing
- Block runtime output capture with test isolation
- Use pre-commit hooks to catch accidental commits
- Rotate secrets regularly (every 90 days minimum)
- Audit AI tool permissions quarterly
- Train team on AI security risks
- Use secret scanning in CI/CD

### ❌ DON'T

- Rely solely on advisory rules (`CLAUDE.md`, `.cursorrules`)
- Hardcode secrets anywhere in source code
- Commit `.env` files (even accidentally)
- Share real credentials in chat conversations
- Allow AI agents unrestricted bash access
- Skip secret rotation after a leak
- Assume "it won't happen to me"

***

## Quick Reference: Tool Configuration Checklist

| Protection | Claude Code | Cursor | Copilot | Windsurf | Amazon Q |
|---|---|---|---|---|---|
| System deny rules | ✅ `~/.claude/settings.json` | ⚠️ `.cursorignore` (partial) | ❌ Not available | ✅ Global Rules | ✅ `~/.aws/amazonq/rules/` |
| Advisory rules | `CLAUDE.md` | `.cursorrules` | `.github/copilot-instructions.md` | `.windsurfrules` | N/A |
| Terminal blocking | ✅ Via deny list | ❌ Can bypass | N/A | ⚠️ Advisory only | ⚠️ Advisory only |
| Test env isolation | ✅ Manual | ✅ Manual | ✅ Manual | ✅ Manual | ✅ Manual |
| Pre-commit hook | ✅ Universal | ✅ Universal | ✅ Universal | ✅ Universal | ✅ Universal |
| CI/CD scanning | ✅ Universal | ✅ Universal | ✅ Universal | ✅ Universal | ✅ Universal |

***

## Resources & Further Reading

- **Blott Study (2025)**: AI coding tools and secret leakage rates
- **GitHub Security Lab**: AI-assisted commit vulnerabilities
- **CVE-2025-XXXXX**: Prompt injection in AI coding assistants
- **gitleaks**: https://github.com/gitleaks/gitleaks
- **trufflehog**: https://github.com/trufflesecurity/trufflehog
- **GitGuardian**: https://www.gitguardian.com/

***

## Version History

- **v1.0** (April 2026): Initial release covering major AI coding tools
- Based on 2025-2026 research on AI assistant security vulnerabilities

***

> **Remember**: Security is not a one-time setup. It's an ongoing practice. Review and update these protections quarterly, stay informed about new vulnerabilities, and treat every secret leak as a learning opportunity.
