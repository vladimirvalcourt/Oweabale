# Production Security Readiness

## Repo-Enforceable Controls (must be green)

- [ ] CI workflow (`.github/workflows/ci.yml`) passes
- [ ] Security workflow (`.github/workflows/security.yml`) passes
- [ ] DAST workflow (`.github/workflows/dast.yml`) passes
- [ ] `npm run security:readiness` passes
- [ ] All security gate scripts pass locally

## Platform/Org Controls (external)

- [ ] Branch protection/rulesets enabled on `main`
- [ ] Required status checks configured
- [ ] Secret scanning + push protection enabled
- [ ] Environment secrets set and scoped properly
- [ ] Backup/PITR enabled and recovery drill evidence current

## Release Decision

- [ ] Security Release Score >= 90
- [ ] No unresolved critical findings
- [ ] No unresolved high findings without documented time-bound risk acceptance
