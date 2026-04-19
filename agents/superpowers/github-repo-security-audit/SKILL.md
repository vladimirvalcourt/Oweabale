# Skill: GitHub Repo Security Audit (Pre-Clone)

## Trigger
Load this skill whenever:
- A user asks to audit a GitHub repository before cloning it.
- A user shares a GitHub repo URL and asks if it is safe.
- You need a remote-only trust/supply-chain assessment of a public repository.
- You need to produce a go/no-go recommendation before any local execution.

## Type
**Rigid** - Security triage workflow that must follow a fixed order to avoid risky assumptions.

## Instructions
1. Parse the repository owner/name from the user-provided URL and normalize it to `<owner>/<repo>`.
2. Fetch repository metadata with GitHub CLI or API and record at minimum: visibility, default branch, fork status, parent repo (if fork), and last pushed timestamp.
3. List root contents remotely and classify whether the repo is content-only or executable by checking for workflows, scripts, package manifests, Dockerfiles, and installer files.
4. Fetch all GitHub workflow files and inspect for write permissions, unpinned actions, auto-push steps, secret usage patterns, and triggers that run on untrusted input.
5. Enumerate executable artifacts remotely (for example `.sh`, `.ps1`, `.bat`, `.cmd`, `.py`) and inspect high-impact scripts for privileged system changes, credential handling, remote downloads, and command execution patterns.
6. Check for obvious secret hygiene risks by scanning filenames and fetched content for embedded tokens, keys, passwords, or hardcoded credentials.
7. If the repository is a fork, compare fork `main` HEAD SHA against upstream `main` HEAD SHA and note whether they match exactly.
8. Check for submodule usage by testing for `.gitmodules` and flag any external code pull at clone/update time.
9. Produce findings ordered by severity: High, Medium, Low; include concrete file paths and specific risky patterns.
10. Give a clear verdict: `safe to clone with caution`, `clone only in isolated environment`, or `do not clone until fixed`.
11. Provide a hardened clone sequence that pins checkout to the audited commit SHA and verifies remote provenance before running any script.
12. Explicitly separate remote audit confidence from runtime confidence, and state that no script execution safety can be guaranteed without sandboxed testing.

## Verification
- The audit used remote inspection only and did not clone the target repository.
- Findings are listed in severity order and reference exact file paths.
- Workflow security review includes permissions and action pinning status.
- Fork-vs-upstream commit parity is checked when the repo is a fork.
- Submodule presence is checked and reported.
- Final output includes a decisive verdict plus a SHA-pinned safe-clone command sequence.
