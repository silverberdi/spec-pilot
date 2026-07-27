# nx-monorepo-baseline

## Purpose

Nx TypeScript monorepo baseline at the repository root with npm workspaces, shared package layout, and toolchain constraints for SpecPilot application scaffolding.

## Requirements

### Requirement: Nx 23 monorepo exists at repository root
The SpecPilot repository SHALL provide an Nx major 23 TypeScript monorepo at the repository root with applications under `apps/` and shared libraries under `packages/`. The resolved Nx version MUST be at least `23.1.0`. Project and package machine identifiers used as IDs MUST use lowercase kebab-case where applicable.

#### Scenario: Workspace layout is present
- **WHEN** the monorepo baseline is verified
- **THEN** an Nx workspace exists at the repository root with `apps/` and `packages/` present and Nx major version 23 at version `23.1.0` or higher

#### Scenario: Nx package versions are identical
- **WHEN** workspace dependencies are inspected
- **THEN** `nx` and every installed `@nx/*` package resolve to exactly the same version

### Requirement: npm workspaces and single root lockfile
The workspace MUST use npm workspaces as the only package-management model. The root `package.json` MUST be private and MUST declare workspaces for generated projects under `apps/*` and `packages/*`. Exactly one `package-lock.json` MUST exist at the repository root and MUST be versioned. Nested lockfiles and pnpm, Yarn, or Bun workspace files MUST NOT be present.

#### Scenario: npm workspace and lockfile are valid
- **WHEN** package management artifacts are inspected
- **THEN** the root `package.json` is private, declares the required workspaces, a single root `package-lock.json` exists, and no pnpm, Yarn, Bun, or nested lockfile artifacts are present

#### Scenario: Unqualified latest without lock resolution is prohibited
- **WHEN** dependencies are installed for the baseline
- **THEN** every direct and transitive dependency used by the baseline MUST have a concrete resolved version recorded in the root `package-lock.json`

### Requirement: Clean npm install without peer-dependency bypass
Baseline dependency installation MUST succeed with a clean `npm install` or `npm ci` and MUST NOT use `--legacy-peer-deps`, `--force`, or any other mechanism that ignores peer dependencies.

#### Scenario: Install does not ignore peer dependencies
- **WHEN** dependencies are installed for the monorepo baseline
- **THEN** installation completes without `--legacy-peer-deps`, `--force`, or equivalent peer-bypass flags

### Requirement: Node.js 24.x and TypeScript compatibility
The baseline MUST target Node.js 24.x within Angular 22's officially supported Node range. TypeScript MUST remain within Angular 22's officially supported TypeScript range and MUST be locked through the root `package-lock.json`. Apps and packages MUST use TypeScript strict mode.

#### Scenario: Runtime and TypeScript constraints hold
- **WHEN** the applied toolchain is recorded in evidence
- **THEN** the recorded Node.js version is 24.x and supported by Angular 22, and TypeScript is within Angular 22's supported range and locked in `package-lock.json`

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

### Requirement: Later-slice infrastructure remains excluded
The monorepo baseline MUST NOT introduce PostgreSQL, Prisma, Docker Compose, `apps/worker`, authentication, DeepSeek product integration, or product domain modules belonging to later slices or waves.

#### Scenario: Excluded infrastructure is absent
- **WHEN** the baseline tree is inspected for later-slice scope
- **THEN** PostgreSQL/Prisma/Docker Compose, `apps/worker`, authentication, DeepSeek product integration, and domain product modules are absent from this slice's delivered baseline
