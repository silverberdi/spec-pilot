# required-quality-gates

## Purpose

Mandatory local fail-closed quality-gate orchestrator reused by post-push remote CI, without automatically managed Git hooks.

## Requirements

### Requirement: Shared orchestrator defines the required gate set
The repository SHALL provide `scripts/run-quality-gates.sh` as the single ordered, fail-closed quality-gate orchestrator. A root npm script alias MAY wrap the script. The orchestrator MUST run, in order: install integrity; typecheck; dependency-boundary lint; automated tests (`nx run-many -t test` or equivalent covering the established application suites); baseline validation (`scripts/validate-baseline.sh`); and secret scanning (`scripts/scan-secrets.py`, standalone or via the baseline orchestrator without dropping coverage). Each step MUST exit non-zero with a human-readable reason on failure and MUST NOT silently continue past invalid state.

#### Scenario: Clean tree passes all gates
- **WHEN** `scripts/run-quality-gates.sh` runs against a clean valid tree
- **THEN** every required gate step succeeds and the orchestrator exits `0`

#### Scenario: Failed gate stops with reason
- **WHEN** any required gate step fails
- **THEN** the orchestrator exits non-zero, reports a human-readable failure reason, and does not report overall success

### Requirement: Local full-gate PASS is mandatory before commit or push
Under the main-only, no-Pull-Request working policy, Cursor and the operator MUST NOT create the final commit or push when the full local quality-gate orchestrator is not `PASS`. The local orchestrator is the pre-commit/pre-push prevention control. This slice MUST NOT introduce automatically managed local Git hooks to enforce the gate.

#### Scenario: Commit and push are prohibited when local gate fails
- **WHEN** the full local quality-gate orchestrator exits non-zero
- **THEN** Cursor and the operator MUST NOT create the final commit or push until a subsequent full local run exits `0`

#### Scenario: No automatically managed Git hooks are introduced
- **WHEN** the delivered tree for this slice is inspected for Git hook managers or installed auto-managed pre-commit/pre-push hooks introduced by this slice
- **THEN** no such automatically managed local Git hooks are present

### Requirement: Change closure requires local full-gate evidence
Deterministic evidence for this change MUST include a captured full local `scripts/run-quality-gates.sh` success run (exit `0`) under `openspec/changes/chg-w00-s04-ci-quality-and-security-baseline/evidence/` (or the archived evidence path after archive). Closure MUST require that local full-gate `PASS` evidence before operator-approved commit/push of the implementation. Remote GitHub Actions logs MAY corroborate post-push verification but MUST NOT replace the local full-gate evidence and MUST NOT be treated as pre-entry blocking onto `main`.

#### Scenario: Local PASS evidence exists before commit or push
- **WHEN** implementation commit/push approval is requested for this change
- **THEN** reproducible full local quality-gate `PASS` output exists under the change `evidence/` directory

#### Scenario: Failure-path evidence is reversible
- **WHEN** a blocked or failure-path evidence run is captured for a required gate
- **THEN** non-zero output with a human-readable reason is recorded, the induced fixture or forbidden edge is removed or neutralized, and a subsequent clean full local gate run can exit `0`

### Requirement: Remote CI reuses the same orchestrator after push
GitHub Actions post-push remote verification MUST invoke the same `scripts/run-quality-gates.sh` orchestrator used locally. Remote failure MUST be operator-visible and fail closed, requiring immediate correction on `main`, without being described as preventing the commit from entering `main`.

#### Scenario: Remote verification uses the shared orchestrator
- **WHEN** the GitHub Actions workflow runs after a push to `main` or via `workflow_dispatch`
- **THEN** it invokes the same quality-gate orchestrator used for the mandatory local gate
