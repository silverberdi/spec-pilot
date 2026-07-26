## Context

Wave `w00` slice `w00-s01` is complete: repository governance, OpenSpec lifecycle, validators, and canonical specs are binding. Apply for this change partially progressed under the prior Nx 22 plan and left an inconsistent workspace state that planning must reconcile before scaffolding continues.

This change creates the first SpecPilot application baseline on `main` under the existing working policy: Cursor implements; operator approves commit/push/Verify/sync/archive; governance validators remain applicable.

Canonical architecture already names `apps/web` (Angular 22 + PrimeNG), `apps/api` (NestJS/Fastify), and shared TypeScript libraries. Persistence, Docker Compose, CI, `apps/worker`, DeepSeek, and authentication remain later-slice or later-wave work.

Stakeholders: SpecPilot operator (human validation and approvals); Cursor (sole implementer).

## Goals / Non-Goals

**Goals:**

- Stand up an Nx TypeScript monorepo with `apps/web`, `apps/api`, and shared packages under `packages/`.
- Deliver a Spanish-first, i18n-ready Angular 22 console shell with PrimeNG/PrimeIcons (baseline only).
- Deliver a NestJS/Fastify API with an explicit, testable public health/status contract and safe startup failure behavior.
- Provide shared library contracts testable independently of either app.
- Prove the baseline with deterministic automated tests (success + at least one meaningful blocked/failure path) and capture evidence under the change directory.
- Keep governance scripts and main-only policy intact; regenerate context/`package-summary.json` after scaffolding.

**Non-Goals:**

- PostgreSQL, Prisma, migrations, Testcontainers, or Docker Compose (`w00-s03`).
- CI workflows and later-slice security/quality gates (`w00-s04`).
- `apps/worker`, domain modules (registry, reviews, budget, secrets product path, etc.).
- DeepSeek product integration, authentication/multiuser, SSE product streams, OpenAPI generation beyond what Nest scaffolding may emit incidentally.
- Full light/dark/system theme, accessibility polish, and product i18n coverage (`w08-s03`).
- Editing OpenSpec-generated integrations except via `openspec update`.
- Branches, Pull Requests, or any deviation from the main-only working policy.
- Downgrading Angular to major 21, enabling Nx Cloud, enabling CI, or ignoring peer dependencies via `--legacy-peer-deps`, `--force`, or equivalent.

## Decisions

### D1 — Nx monorepo with `apps/` + `packages/` layout

Create a single Nx workspace at the repository root. Applications live under `apps/`; shared TypeScript libraries live under `packages/` (matching current-state language). Project names/IDs remain lowercase kebab-case where Nx/project graph IDs are used as machine identifiers.

- *Alternative considered:* `libs/` instead of `packages/`. Rejected — canonical context already frames the missing product tree as `apps/` + `packages/`; renaming later would churn path IDs and docs.
- *Alternative considered:* separate repositories for web and API. Rejected — technology decision is Nx monorepo for shared TypeScript and affected commands.

### D2 — Package manager and Node tooling baseline

Use npm workspaces as the only package-management model. The root `package.json` is private and declares `apps/*` and `packages/*` as workspaces when those paths contain generated package projects. Generate and version exactly one `package-lock.json` at the repository root; do not create nested lockfiles. pnpm, Yarn, and Bun are prohibited in this workspace.

Use Node.js 24.18.0, which satisfies Angular 22's official supported Node range. The binding dependency majors are:

- Nx major 23 with minimum concrete version `23.1.0`; `nx` and every `@nx/*` package use exactly the same resolved version. Nx 23.1.0+ is the officially supported combination for Angular 22.
- Angular major 22; Angular framework/tooling packages under `@angular/*` remain on major 22 and mutually compatible. Do not accept Angular 21 scaffolding or dependency resolution.
- PrimeNG major 22, with PrimeIcons and the official themes package required by the resolved PrimeNG 22 release.
- NestJS major 11; Nest framework/tooling packages under `@nestjs/*` remain on major 11 and mutually compatible.
- Fastify major 5 through `@nestjs/platform-fastify`.
- TypeScript 6.0.3, within Angular 22's official TypeScript range `>=6.0.0 <6.1.0`.

**Apply finding (Nx 22 discarded):** The prior plan bound Nx major 22. During apply, `@nx/angular@22.7.7` did not admit `@angular/build` 22. The failed attempt partially created `apps/web` and attempted to install Angular 21. Nx 22 is therefore discarded for this change. The reconciled path is Nx major 23 (minimum `23.1.0`) with Angular major 22 retained. Record the conflict and reconciliation in `evidence/toolchain.md` during apply.

`npm install` / `npm ci` MUST resolve cleanly without `--legacy-peer-deps`, `--force`, or any other form of ignoring peer dependencies.

Resolve concrete minor/patch versions from the npm registry during apply (Nx at least `23.1.0`), verify compatibility within these majors, record the resolved toolchain in evidence, and lock every transitive and direct dependency in the root `package-lock.json`. Do not use an unqualified `latest` dependency without the lockfile recording its concrete resolved version. Enable TypeScript strict mode for apps and packages. Do not enable Nx Cloud and do not generate CI configuration.

- *Alternative considered:* pnpm, Yarn, Bun, or mixed package managers. Rejected — one npm workspace and one root lockfile provide the binding, reproducible install model.
- *Alternative considered:* defer lockfile to CI slice. Rejected — local baseline must be reproducible for Verify evidence now.
- *Alternative considered:* allow independent `nx` / `@nx/*` versions. Rejected — generator and executor version skew is avoidable and makes the project graph unreliable.
- *Alternative considered:* keep Nx 22 and force peer resolution or downgrade Angular to 21. Rejected — Angular 22 remains binding; peer-bypass flags are prohibited; Nx 23.1.0+ is the official Angular 22 combination.
- *Alternative considered:* ignore peer dependencies with `--legacy-peer-deps` or `--force`. Rejected — install must be clean and peer-compatible.

### D3 — `apps/web`: Angular 22 standalone + PrimeNG shell

Scaffold an Angular 22 standalone application in `apps/web` with PrimeNG 22, PrimeIcons, and the official themes package required by that PrimeNG release, using `@nx/angular` at version `23.1.0` or higher (same concrete version as all other `@nx/*` packages). Configure PrimeNG through its official standalone provider-based setup and use a compatible official theme preset. Do not introduce an NgModule-based application bootstrap. Do not accept scaffolding that produces Angular 21.

Default operator-facing copy is Spanish and the shell remains i18n-ready through a minimal translation boundary or locale organization that can be expanded later. This baseline does not implement complete product internationalization or accessibility. The first viewport is a SpecPilot-branded baseline shell only—no product dashboards, project lists, or theme-switcher product features.

Operator-visible shell states for this baseline: success (shell rendered), loading (bootstrap), and error (failed bootstrap/config). Empty is N/A for the shell itself unless a shell region has no content yet (then show an explicit empty placeholder, not a blank failure).

- *Alternative considered:* React/Vue. Rejected — architecture and technology decisions fix Angular 22 + PrimeNG.
- *Alternative considered:* full theme/a11y now. Rejected — owned by `w08-s03`.
- *Alternative considered:* accept Angular 21 from Nx 22 generators. Rejected — Angular major 22 is binding; regenerate with Nx 23.1.0+.

### D4 — `apps/api`: NestJS with Fastify adapter and health contract

Scaffold NestJS 11 in `apps/api` using Fastify 5 through `@nestjs/platform-fastify`. Expose exactly one public baseline health route, `GET /health`, returning the stable success contract `{ "status": "ok", "service": "api" }`. Do not add a database readiness probe in this slice.

Startup/config failure must not silently continue: the process exits non-zero or refuses to serve successful health responses when the API cannot initialize validly. Health success is only returned when the HTTP server is serving the baseline module correctly.

If scaffolding emits Express instead of Fastify, convert to Fastify before claiming the API baseline complete. `GET /health` remains pending until the Fastify contract is implemented.

- *Alternative considered:* Express adapter. Rejected — technology decision is Fastify.
- *Alternative considered:* include Prisma health checks now. Rejected — persistence belongs to `w00-s03`.

### D5 — Shared packages: contracts first, minimal surface

Create `packages/shared-contracts` as the binding initial shared package. It exports the health response TypeScript contract and a minimal runtime validator/type guard for that contract. The runtime validation is implemented without Angular or NestJS imports and is independently testable.

Use a small repository-owned TypeScript runtime check for this fixed contract. Do not add Zod unless apply uncovers a concrete technical necessity that cannot be met safely by the minimal validator; any such deviation requires planning reconciliation before implementation continues. Do not create domain packages (project registry, review orchestration, etc.) or a shared UI kit in this slice.

- *Alternative considered:* duplicate types in web and API. Rejected — invites drift before any product surface exists.
- *Alternative considered:* add Zod preemptively. Rejected — the fixed two-field health contract does not justify another runtime dependency.
- *Alternative considered:* large shared UI kit now. Rejected — premature; PrimeNG stays in `apps/web` until a later slice needs extraction.

### D6 — Testing strategy for baseline evidence

Select the test runner supported by the chosen Nx 23 generators/plugins and record that choice in evidence. Use that runner consistently for web, API, and `shared-contracts` whenever the relevant Nx plugin supports it. Do not mix Jest and Vitest without a documented technical incompatibility; if one plugin cannot support the selected runner, record the constrained exception and rationale in evidence rather than adding a second runner by preference. Minimum evidence:

1. Shared package: unit tests for contract success parse and at least one invalid payload failure/blocked path.
2. API: test that `GET /health` returns the exact success contract; HTTP tests may use the Fastify adapter's `inject` mechanism without binding a real network port. Test that invalid/missing required contract fields are rejected by the shared validator (or equivalent blocked path).
3. Web: unit/component test that the shell renders in the success path and surfaces an error/blocked path when bootstrap input is invalid (or equivalent meaningful failure).

Capture deterministic command outputs under `openspec/changes/chg-w00-s02-nx-angular-nest-baseline/evidence/`. Do not add Testcontainers, Playwright e2e, or CI workflow ownership here.

- *Alternative considered:* manual smoke only. Rejected — User Story `-002` requires automated success + failure evidence.
- *Alternative considered:* Playwright e2e now. Rejected — essential web flows come later; unit/project tests suffice for baseline.

### D7 — Domain / module boundaries for this slice

This slice establishes application shells only. No product domain modules are implemented. Ports/adapters for filesystem, Git, DeepSeek, or PostgreSQL are not introduced. Future modules must land behind clear Nest modules / Angular feature boundaries without coupling to Docker or CI assumptions from this slice.

### D8 — Security, privacy, observability

- No authentication, no secret stores, no `.env` with real credentials committed. Env examples, if any, use placeholders and remain gitignored for real secrets per existing `.gitignore`.
- Existing `scripts/scan-secrets.py` / baseline validation remain mandatory before operator-approved commit/push.
- Observability for this slice is limited to process exit codes, Nx test output, and the health JSON surface—no APM, no product audit log.

### D9 — Evidence and docs sync pattern (reuse s01)

Evidence lives under the change’s `evidence/` directory. After scaffolding, update `docs/context/**` and regenerate `package-summary.json` so inventory matches the new tree. Canonical OpenSpec specs sync only after Verify exactly `PASS` with operator approval.

## Risks / Trade-offs

- [Nx/Angular/PrimeNG/Nest generator churn or minor/patch incompatibility at apply time] → Constrain majors as specified in D2 (Nx 23 ≥ `23.1.0`, Angular 22), verify official compatibility before generation, keep `nx` and `@nx/*` versions identical, record exact commands/versions in evidence, and commit the single root `package-lock.json`.
- [Prior Nx 22 apply left partial `apps/web` and attempted Angular 21] → Before continuing scaffolding, inspect partial artifacts, remove only incomplete/incompatible `apps/web` stubs, retain compatible `packages/shared-contracts` and valid `apps/api` scaffolding, and ensure manifests/lockfile do not retain Nx 22, Angular 21, or an inconsistent partial install. Record the conflict and reconciliation in `evidence/toolchain.md`.
- [Node 24.x or TypeScript resolution falls outside Angular 22's supported ranges] → Keep Node.js 24.18.0 and TypeScript 6.0.3; stop rather than force an unsupported combination.
- [Temptation to bypass peer conflicts with `--legacy-peer-deps` / `--force`] → Prohibited. Stop and reconcile planning/toolchain rather than ignore peers.
- [Nx generators offer Nx Cloud or CI setup by default] → Explicitly decline/disable both and verify that no Nx Cloud token/configuration or CI workflow was generated.
- [Scaffolding volume obscures slice boundaries] → Tasks stay capability-mapped; reject worker/DB/CI files if generators offer them; delete or do not commit excluded scaffolds.
- [PrimeNG/i18n baseline mistaken for product-complete UI] → Specs and shell copy state “baseline only”; no domain routes or fake dashboards.
- [Health endpoint becomes an informal dumping ground] → Contract is fixed and minimal; no dependency checks until `w00-s03`.
- [Shared package grows into a dumping ground] → Only contracts needed by health/shell baseline; domain packages deferred.
- [Working on `main` with large scaffold commits] → Mandatory validation reporting + explicit operator approval before commit/push; reversible Git history.
- [Governance validators fail on new tree (file counts, ignore rules)] → Update context/package-summary and `.gitignore` only as required for legitimate build artifacts; do not weaken secret scanning.

## Migration Plan

1. Confirm Node.js 24.18.0 (within Angular 22's official Node range) and record it for the apply evidence.
2. Resolve compatible concrete minor/patch releases for Nx 23 (minimum `23.1.0`), Angular 22, PrimeNG 22 plus PrimeIcons and its official themes package, NestJS 11, Fastify 5, and TypeScript 6.0.3. Keep `nx` and all `@nx/*` versions exactly equal.
3. Inspect artifacts left by the failed Nx 22 apply: remove only incomplete or incompatible `apps/web` stubs; retain `packages/shared-contracts` and compatible `apps/api` scaffolding; ensure `package.json` / `package-lock.json` do not retain Nx 22, Angular 21, or an inconsistent partial install. Record the conflict and reconciliation in `evidence/toolchain.md`.
4. Initialize or repair the Nx 23 workspace (minimum `23.1.0`) at the repository root using npm workspaces, with Nx Cloud and CI generation disabled, without removing or overwriting `openspec/`, `docs/governance/`, or `AGENTS.md`. Perform a clean `npm install` / `npm ci` without `--legacy-peer-deps` or `--force`.
5. Create a private root `package.json` with npm workspaces for generated projects under `apps/*` and `packages/*`; generate and retain exactly one root `package-lock.json`.
6. Add or complete `apps/api` with NestJS 11 / Fastify 5 (convert Express scaffolding if present), `apps/web` with standalone Angular 22 / PrimeNG 22 / PrimeIcons via `@nx/angular` ≥ `23.1.0`, and the binding `packages/shared-contracts` package.
7. Implement the exact `GET /health` contract, minimal framework-independent runtime validation, and Spanish-first i18n-ready shell baseline.
8. Select one generator-supported test runner, record it in evidence, and use it consistently where plugin support permits. Run automated success and failure-path tests; API HTTP tests may use Fastify `inject`.
9. Record all resolved versions and generator commands in `evidence/`; verify that the root lockfile contains concrete resolutions and that no nested lockfiles, alternate package-manager files, Nx Cloud configuration, or CI files exist.
10. Run existing governance validators; fix inventory/ignore issues introduced by scaffolding.
11. Synchronize `docs/context/**` and regenerate `package-summary.json`.
12. With operator approval after reported validation results: commit and (if requested) push on `main`.
13. With operator approval: Verify exactly `PASS`, sync canonical specs, archive.

**Rollback:** revert the scaffolding commit(s) on `main`. No database, container, or external service rollback. Generated `node_modules` and local caches are disposable and not part of rollback semantics.

## Open Questions

- None blocking planning. npm workspaces, Node.js 24.18.0, TypeScript 6.0.3, Angular 22, and Nx major 23 (minimum `23.1.0`) are binding. Concrete compatible minor/patch versions at or above those floors are resolved from the npm registry during apply, recorded in evidence (including the Nx 22 discard / Nx 23 reconciliation), and locked in the single root `package-lock.json`.
