## ADDED Requirements

### Requirement: Baseline validation and secret scanning are required quality gates
Existing deterministic baseline validation and secret scanning MUST be invoked as part of the required quality-gate set orchestrated by `scripts/run-quality-gates.sh` for both the mandatory local pre-commit/pre-push run and the post-push GitHub Actions remote verification. Secret scanning MUST NOT be weakened to pass induced fixtures. A baseline-validation or secret-scan failure MUST cause the quality-gate orchestrator to exit non-zero with a human-readable reason.

#### Scenario: Quality gates invoke baseline validation
- **WHEN** `scripts/run-quality-gates.sh` runs
- **THEN** baseline validation is executed as a required gate step and a baseline failure causes the orchestrator to exit non-zero

#### Scenario: Quality gates invoke secret scanning without weakening
- **WHEN** `scripts/run-quality-gates.sh` runs against a tree containing a clearly labeled prohibited secret fixture path
- **THEN** secret scanning fails, the orchestrator exits non-zero, and the scanner has not been weakened to ignore the fixture
