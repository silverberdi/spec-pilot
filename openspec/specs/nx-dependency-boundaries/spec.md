# nx-dependency-boundaries

## Purpose

Nx project tags and `@nx/enforce-module-boundaries` enforcement that fail closed on forbidden dependency edges.

## Requirements

### Requirement: Projects carry binding Nx tags
`apps/web`, `apps/api`, and `packages/shared-contracts` MUST declare Nx project tags. Minimum tags MUST be: `apps/web` → `type:app` and `scope:web`; `apps/api` → `type:app` and `scope:api`; `packages/shared-contracts` → `type:lib` and `scope:shared`. Empty tag arrays for these projects MUST NOT remain.

#### Scenario: Foundation projects are tagged
- **WHEN** project configuration for `web`, `api`, and `shared-contracts` is inspected
- **THEN** each project declares at least the minimum tags required above

### Requirement: Forbidden dependency edges fail closed
The repository MUST enforce Nx dependency boundaries using `@nx/enforce-module-boundaries` (via ESLint). The constraints MUST ensure: a `type:app` project MUST NOT depend on another `type:app`; `scope:web` MUST NOT depend on `scope:api` and `scope:api` MUST NOT depend on `scope:web`; apps MAY depend on `scope:shared` / `type:lib`; a `type:lib` project MUST NOT depend on a `type:app`. A forbidden edge MUST cause the boundary check to exit non-zero with a human-readable reason.

#### Scenario: Allowed shared dependency succeeds
- **WHEN** an app depends only on `packages/shared-contracts` within allowed tags and the boundary check runs
- **THEN** the dependency-boundary check exits `0`

#### Scenario: Forbidden app-to-app edge fails
- **WHEN** a temporary forbidden dependency from one `type:app` to another `type:app` (or from `scope:web` to `scope:api`) is introduced and the boundary check runs
- **THEN** the check exits non-zero and reports a human-readable boundary violation

### Requirement: Boundary check is runnable as a dedicated gate step
The repository MUST provide a dedicated Nx target or root script that runs the module-boundary enforcement and can be invoked by `scripts/run-quality-gates.sh` as a required gate step.

#### Scenario: Boundary gate is invocable
- **WHEN** the documented boundary-check command is executed on a clean tagged workspace
- **THEN** the command runs the `@nx/enforce-module-boundaries` rule set and exits `0` when no forbidden edges exist
