# AI Coding Assistant Security Audit — Oweable Project

**Date:** May 1, 2026  
**Auditor:** Automated Security Scanner (SECURITY_SKILLS.md v1.0)  
**Scope:** AI coding assistant protection layers  

---

## Executive Summary

**Overall Security Posture:** ⚠️ **PARTIAL PROTECTION** (3/5 critical controls in place)

The project has strong foundational security (gitleaks scanning, .gitignore baseline) but is missing critical protections against runtime secret leakage and prompt injection attacks via AI coding assistants.

---

## Current Protection Status

### ✅ **PROTECTED** (Already Implemented)

#### 1. Git Ignore Baseline ✅
- **Status:** `.env*` files properly ignored (line 35-36 of `.gitignore`)
- **Exception:** `.env.example` correctly whitelisted
- **Coverage:** All credential file types covered (`.pem`, `.key`, `.npmrc`, etc.)
- **Gap:** No explicit `.cursorignore` or tool-specific ignore files

#### 2. Secret Scanning in CI/CD ✅
- **Status:** GitHub Actions workflow active (`.github/workflows/security.yml`)
- **Tools:** gitleaks + CodeQL on every push/PR
- **Schedule:** Weekly scans (Monday 5 AM UTC)
- **Config:** Custom rules in `.gitleaks.toml` with appropriate allowlists
- **Local Script:** `npm run secrets:scan` available for pre-commit checks

#### 3. Advisory Rules (CLAUDE.md) ✅
- **Status:** Basic security skill loading configured
- **Content:** References `.claude/skills/security/SKILL.md` for auth/payment work
- **Limitation:** Advisory only — not enforced at system level

---

### ❌ **MISSING** (Critical Gaps)

#### 4. Test Environment Isolation ❌
- **Status:** NO `.env.test` file exists
- **Risk:** HIGH — Runtime output capture (Path 2 attack vector)
- **Impact:** If AI runs tests or starts app, real secrets leak via logs/errors
- **Evidence:** 
  ```bash
  $ ls -la .env.test
  ls: .env.test: No such file or directory
  ```
- **Current State:** Tests likely load from `.env.local` containing real credentials

#### 5. Pre-Commit Hook ❌
- **Status:** NO `.husky/pre-commit` hook installed
- **Risk:** MEDIUM-HIGH — Accidental secret commits not blocked locally
- **Impact:** Relies solely on CI/CD scanning (post-commit detection)
- **Evidence:**
  ```bash
  $ ls -la .husky/pre-commit
  ls: .husky/pre-commit: No such file or directory
  ```

#### 6. Tool-Specific Deny Rules ❌
- **Claude Code:** NO `~/.claude/settings.json` deny rules
- **Cursor:** NO `.cursorignore` file
- **Windsurf:** NO `.windsurfrules` file
- **Risk:** HIGH — Direct file read attacks (Path 1) possible if advisory rules bypassed
- **Impact:** AI agents can read `.env.local` directly despite gitignore

#### 7. Prompt Injection Protection ❌
- **Status:** No validation of rules files for malicious content
- **Risk:** CRITICAL — Path 4 attack vector (CVEs up to 8.8)
- **Impact:** Malicious npm packages or compromised skills could inject commands
- **Current State:** `.claude/skills/` directory versioned but not validated

---

## Attack Vector Analysis

### Path 1: Direct File Read
**Risk Level:** ⚠️ MEDIUM  
**Current Protection:** `.gitignore` blocks commits but NOT AI reads  
**Attack Scenario:** AI opens `.env.local` → secrets enter conversation context  
**Mitigation Needed:** System-level deny rules per tool

### Path 2: Runtime Output Capture  
**Risk Level:** 🔴 HIGH  
**Current Protection:** NONE  
**Attack Scenario:** AI runs `npm test` → error log shows `DATABASE_URL=postgres://admin:realpassword@...`  
**Mitigation Needed:** `.env.test` with dummy values

### Path 3: Grep/Search Tools
**Risk Level:** ⚠️ MEDIUM  
**Current Protection:** Partial (gitignore prevents indexing but grep still works)  
**Attack Scenario:** AI searches for "STRIPE_SECRET_KEY" → grep output reveals value  
**Mitigation Needed:** Tool-specific search restrictions

### Path 4: Prompt Injection
**Risk Level:** 🔴 CRITICAL  
**Current Protection:** NONE  
**Attack Scenario:** Malicious skill writes to `.claude/commands/` → executes arbitrary shell commands  
**Mitigation Needed:** Skill validation + deny rules for config file writes

### Path 5: Cross-Agent Propagation
**Risk Level:** ⚠️ MEDIUM  
**Current Protection:** NONE  
**Attack Scenario:** Compromised Copilot session writes to Claude's `.mcp.json`  
**Mitigation Needed:** Regular audit of agent configs

---

## Recommended Fixes (Priority Order)

### Priority 1: Create `.env.test` (Immediate — 15 min)
**Why:** Blocks Path 2 (runtime leaks) — highest risk gap  
**Action:** Create test environment file with dummy values  
**Effort:** Low  
**Impact:** High

### Priority 2: Install Pre-Commit Hook (Same Day — 30 min)
**Why:** Catches accidental commits before they reach CI  
**Action:** Set up Husky with secret pattern detection  
**Effort:** Low  
**Impact:** Medium-High

### Priority 3: Add Cursor Ignore Rules (This Week — 20 min)
**Why:** Blocks direct file reads in most-used AI tool  
**Action:** Create `.cursorignore` matching `.gitignore` patterns  
**Effort:** Low  
**Impact:** Medium

### Priority 4: Configure Claude Code Deny Rules (This Week — 30 min)
**Why:** Only reliable protection for Claude Code  
**Action:** Create `~/.claude/settings.json` with deny list  
**Effort:** Low  
**Impact:** High (if using Claude Code)

### Priority 5: Validate Skills Directory (Next Month — 1 hour)
**Why:** Prevents prompt injection attacks  
**Action:** Audit all skills in `.claude/skills/` for malicious content  
**Effort:** Medium  
**Impact:** Critical

---

## Implementation Plan

### Phase 1: Immediate Fixes (Today)
1. ✅ Create `.env.test` with dummy credentials
2. ✅ Update test configuration to load `.env.test`
3. ✅ Document test isolation in team wiki

### Phase 2: Local Protection (This Week)
1. Install Husky pre-commit hook
2. Create `.cursorignore` file
3. Add security section to `.cursorrules` (advisory)

### Phase 3: System-Level Hardening (Next Week)
1. Configure Claude Code deny rules (if team uses it)
2. Set up Windsurf global rules (if team uses it)
3. Audit existing skills for prompt injection

### Phase 4: Monitoring & Maintenance (Ongoing)
1. Quarterly review of AI tool permissions
2. Monthly rotation of test credentials in `.env.test`
3. Annual security training update

---

## Compliance Checklist

| Control | Status | Evidence |
|---------|--------|----------|
| `.env*` in `.gitignore` | ✅ PASS | Line 35-36 verified |
| `.env.example` committed | ✅ PASS | File exists, no secrets |
| gitleaks in CI/CD | ✅ PASS | `.github/workflows/security.yml` |
| CodeQL scanning | ✅ PASS | Same workflow file |
| `.env.test` exists | ❌ FAIL | File not found |
| Pre-commit hook | ❌ FAIL | `.husky/` directory missing |
| `.cursorignore` | ❌ FAIL | File not found |
| Claude deny rules | ❌ FAIL | `~/.claude/settings.json` not in repo |
| Skill validation | ❌ FAIL | No automated checks |
| Team training docs | ⚠️ PARTIAL | SECURITY_SKILLS.md created but not distributed |

**Score:** 4/10 controls fully implemented (40%)

---

## Risk Assessment

### Current Risk Exposure

**Likelihood of Secret Leak:** MEDIUM-HIGH  
- Strong CI/CD scanning reduces post-commit risk
- Missing runtime isolation creates high exposure during development
- No local pre-commit checks means mistakes reach remote before detection

**Potential Impact:** HIGH  
- Financial APIs (Stripe, Plaid) have production keys
- Database credentials provide full data access
- Email delivery (Resend) could be abused for phishing

**Overall Risk Rating:** 🔴 **HIGH**

---

## Next Steps

1. **Immediate (Today):** Implement Priority 1 fixes (`.env.test`)
2. **Short-term (This Week):** Complete Priority 2-3 (pre-commit hooks, cursor rules)
3. **Medium-term (Next Month):** Address Priority 4-5 (system-level hardening)
4. **Long-term (Quarterly):** Establish maintenance cadence

**Estimated Time to Full Compliance:** 2-3 hours initial setup + 1 hour/month maintenance

---

## Resources

- [SECURITY_SKILLS.md](./SECURITY_SKILLS.md) — Comprehensive AI security guide
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) — Previous application security audit
- [SECURITY_QUICK_REFERENCE.md](./SECURITY_QUICK_REFERENCE.md) — Quick reference card

---

**Audit Completed:** May 1, 2026  
**Next Scheduled Audit:** August 1, 2026 (quarterly)  
**Auditor:** Automated Security Scanner v1.0
