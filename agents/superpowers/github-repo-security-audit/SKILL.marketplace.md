---
name: auditing-github-repository-security-before-clone
description: >-
  Perform a remote-only security audit of a GitHub repository before cloning.
  Assess workflow supply-chain risk, executable scripts, secret exposure,
  fork parity with upstream, submodule risk, and provide a SHA-pinned safe
  clone sequence with a clear go/no-go verdict.
domain: cybersecurity
subdomain: supply-chain-security
tags:
  - github
  - repository-security
  - supply-chain
  - ci-cd
  - pre-clone-audit
  - devsecops
version: "1.0"
author: vladimirvalcourt
license: Apache-2.0
---

## When to Use

- User asks whether a GitHub repository is safe before cloning.
- User provides a GitHub URL and requests a security review.
- You need remote-only triage without executing repository code.

## Prerequisites

- GitHub API access (for example `gh` CLI authenticated, or public API access).
- Ability to fetch raw files (`raw.githubusercontent.com`) and repository metadata.
- Read-only analysis scope (no local script execution from target repository).

## Workflow

1. Normalize repository identifier from URL to `<owner>/<repo>`.
2. Fetch repository metadata and capture:
   - visibility
   - default branch
   - fork status
   - parent repository (if fork)
   - latest push timestamp
3. Enumerate repository tree and classify risk surface:
   - workflow files (`.github/workflows/*.yml`)
   - executable scripts (`.sh`, `.ps1`, `.bat`, `.cmd`, `.py`)
   - dependency manifests (`package.json`, `requirements.txt`, `pyproject.toml`, etc.)
   - container/build artifacts (`Dockerfile`, `docker-compose*`)
4. Review each workflow file for:
   - overbroad permissions (`contents: write`, admin-level scopes)
   - unpinned third-party actions (tag-only pinning vs commit SHA)
   - auto-commit/auto-push behavior
   - dangerous triggers on untrusted input
   - unsafe secret usage patterns
5. Review high-impact executable scripts for:
   - privilege-sensitive operations (ACL/group/policy/system changes)
   - remote download-and-execute patterns
   - credential handling and potential leakage
   - destructive or lateral movement behavior
6. Check for exposed secrets in fetched content and suspicious filenames (keys, tokens, credentials).
7. If repository is a fork, compare fork default-branch HEAD SHA to upstream default-branch HEAD SHA.
8. Check for submodule usage by confirming `.gitmodules` presence/absence.
9. Produce findings in strict severity order:
   - High (active compromise or critical trust failure)
   - Medium (material supply-chain or privilege risk)
   - Low (hygiene, consistency, or hardening gaps)
10. Provide one explicit verdict:
   - safe to clone with caution
   - clone only in isolated environment
   - do not clone until fixed
11. Provide a hardened clone sequence:
   - clone
   - verify remotes
   - checkout audited SHA
   - optionally compare with upstream SHA
12. State confidence limits:
   - remote inspection confidence
   - no runtime safety guarantee without sandboxed execution testing

## Verification

- Repository was assessed without cloning or executing target code.
- Findings include exact paths and are sorted by severity.
- Workflow review explicitly covers permissions and action pinning.
- Fork parity is checked when repository is a fork.
- Submodule check result is reported.
- Output includes a decisive verdict and SHA-pinned safe-clone commands.

