## ADDED Requirements

### Requirement: GitHub Actions workflow owns post-push remote verification
The repository SHALL provide a GitHub Actions workflow under `.github/workflows/` that owns SpecPilot’s continuous-integration remote verification for this slice. The workflow MUST trigger on `push` to `main` and on `workflow_dispatch`. The workflow MUST NOT use Docker Compose as its gate runner. The workflow MUST NOT be specified or documented as a pre-entry or pre-merge block that prevents commits from entering `main`.

#### Scenario: Workflow file and triggers exist
- **WHEN** the CI baseline is verified
- **THEN** a kebab-case workflow exists under `.github/workflows/` with `push` to `main` and `workflow_dispatch` triggers

#### Scenario: Remote CI is not a pre-entry block onto main
- **WHEN** operator-facing docs or specs describe the workflow
- **THEN** remote CI is described as post-push independent verification that fails closed and requires immediate correction on failure, and MUST NOT be described as preventing entry onto `main`

#### Scenario: Compose is not the CI vehicle
- **WHEN** the workflow definition is inspected
- **THEN** it does not invoke SpecPilot Docker Compose as the gate runner

### Requirement: Remote workflow invokes the shared quality-gate orchestrator
After checkout, the workflow MUST set up Node.js 24.x consistent with the repository `engines` constraint, run `npm ci` without peer-dependency bypass flags, ensure Docker (or an equivalent socket) is available for Testcontainers-backed tests, and invoke `scripts/run-quality-gates.sh` (or the documented root npm script alias that wraps it). A non-zero orchestrator exit MUST fail the workflow.

#### Scenario: Remote run executes the same orchestrator
- **WHEN** the workflow runs successfully on a clean tree
- **THEN** it completes `npm ci` and invokes the shared quality-gate orchestrator, exiting successfully only when the orchestrator exits `0`

#### Scenario: Remote gate failure fails the workflow
- **WHEN** the shared quality-gate orchestrator exits non-zero during a workflow run
- **THEN** the workflow fails in an operator-visible way and does not report overall success

### Requirement: Nx Cloud remains disabled
The CI baseline MUST NOT enable Nx Cloud or introduce an Nx Cloud token. Repository analytics/cloud configuration MUST remain off for Nx Cloud.

#### Scenario: Nx Cloud is absent
- **WHEN** Nx and CI configuration are inspected
- **THEN** no Nx Cloud configuration or token is active
