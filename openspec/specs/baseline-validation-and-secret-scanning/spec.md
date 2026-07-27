# baseline-validation-and-secret-scanning

## Purpose

Deterministic baseline validation and repository secret scanning with safe failure behavior.

## Requirements

### Requirement: Deterministic baseline validation exists
The repository MUST provide deterministic baseline validation that can run without network access, exits `0` on success, and exits non-zero on failure with human-readable reasons.

#### Scenario: Clean baseline passes
- **WHEN** the working tree satisfies baseline governance and integrity checks
- **THEN** baseline validation exits with status `0` and reports success

#### Scenario: Failed check blocks with reason
- **WHEN** a baseline check detects an invalid state
- **THEN** validation exits non-zero and prints a human-readable failure reason

### Requirement: Secret scanning rejects secrets
The repository MUST provide secret scanning that fails when credential-like secrets are present in scanned paths, without weakening the scanner to pass induced fixtures.

#### Scenario: Clean tree passes secret scan
- **WHEN** the scanned tree contains no prohibited secrets
- **THEN** secret scanning exits with status `0`

#### Scenario: Secret-like content fails scan
- **WHEN** a clearly labeled fixture or path containing a prohibited secret pattern is scanned
- **THEN** secret scanning exits non-zero and reports the finding

### Requirement: Validators are runnable standalone and via orchestrator
Delivery-graph validation, secret scanning, and package-summary integrity checks MUST be runnable individually and through the baseline validation orchestrator.

#### Scenario: Orchestrated run covers validators
- **WHEN** the baseline validation orchestrator is executed
- **THEN** it invokes the applicable validators and aggregates failure without silently continuing past invalid state

### Requirement: Failure fixtures are safe and reversible
Induced failure demonstrations MUST use clearly labeled, safely reversible fixtures that are created, exercised, captured as evidence, and removed or neutralized so they do not remain as unmarked repository contamination.

#### Scenario: Failure path captured then restored
- **WHEN** a failure-path evidence run is performed for a validator
- **THEN** failure output is captured, the fixture is removed or neutralized, and a subsequent clean run can pass

### Requirement: Baseline validation and secret scanning are required quality gates
Existing deterministic baseline validation and secret scanning MUST be invoked as part of the required quality-gate set orchestrated by `scripts/run-quality-gates.sh` for both the mandatory local pre-commit/pre-push run and the post-push GitHub Actions remote verification. Secret scanning MUST NOT be weakened to pass induced fixtures. A baseline-validation or secret-scan failure MUST cause the quality-gate orchestrator to exit non-zero with a human-readable reason.

#### Scenario: Quality gates invoke baseline validation
- **WHEN** `scripts/run-quality-gates.sh` runs
- **THEN** baseline validation is executed as a required gate step and a baseline failure causes the orchestrator to exit non-zero

#### Scenario: Quality gates invoke secret scanning without weakening
- **WHEN** `scripts/run-quality-gates.sh` runs against a tree containing a clearly labeled prohibited secret fixture path
- **THEN** secret scanning fails, the orchestrator exits non-zero, and the scanner has not been weakened to ignore the fixture
