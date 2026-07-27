## MODIFIED Requirements

### Requirement: Nx Cloud and CI are not enabled
The monorepo baseline MUST NOT enable Nx Cloud or introduce an Nx Cloud token. The `w00-s02` prohibition on generating CI workflow ownership applied only to that slice’s scaffolding and is superseded for later slices that explicitly own CI: GitHub Actions workflow ownership introduced by `w00-s04-ci-quality-and-security-baseline` is allowed and required as post-push remote verification. Automatically managed local Git hooks MUST NOT be introduced by the monorepo baseline or by `w00-s04` as a substitute for the mandatory local quality-gate obligation.

#### Scenario: Scaffolding excludes Nx Cloud
- **WHEN** Nx configuration is inspected
- **THEN** no Nx Cloud configuration or token is active

#### Scenario: Later-slice CI ownership is permitted for w00-s04
- **WHEN** `w00-s04-ci-quality-and-security-baseline` delivers GitHub Actions workflows under `.github/workflows/`
- **THEN** those workflows are valid ownership for post-push remote verification and do not violate the superseded `w00-s02` scaffolding exclusion

#### Scenario: Automatically managed local Git hooks remain absent
- **WHEN** the tree is inspected for automatically managed local Git hooks introduced by the monorepo baseline or by `w00-s04`
- **THEN** no such hooks are present
