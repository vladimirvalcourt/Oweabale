# Security Operations SLA

## Scope

Defines operational response expectations for vulnerabilities, incidents, and security gate failures.

## SLA Targets

- **Critical vulnerability/incident**
  - acknowledge: 1 hour
  - containment start: 4 hours
  - remediation or compensating control: 24 hours
- **High severity**
  - acknowledge: 4 hours
  - remediation target: 3 business days
- **Medium severity**
  - remediation target: 14 days
- **Low severity**
  - remediation target: 30 days

## Ownership

- Security owner: assign named owner per repo/environment.
- Backup owner: assign secondary owner.
- Release manager: blocks release if critical/high unresolved.

## Intake Channels

- CI security gate failures
- Dependabot alerts
- CodeQL/Gitleaks findings
- Manual reports from developers/users

## Escalation

1. On-call engineer
2. Security owner
3. Engineering lead/product owner

## Release Blocking Policy

- Any unresolved critical finding blocks release.
- High findings block release unless formal risk acceptance is documented with expiry.
