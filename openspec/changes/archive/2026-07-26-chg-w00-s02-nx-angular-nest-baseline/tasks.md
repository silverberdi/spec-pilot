## 1. Binding and scope evidence (US-001)

- [x] 1.1 Record the change binding (wave `w00`, slice `w00-s02-nx-angular-nest-baseline`, User Stories `001–003`, Cursor as implementer, dependencies, exclusions) in `evidence/binding.md`, traceable to proposal, design, and specs
- [x] 1.2 Verify the change scope contains no PostgreSQL/Prisma/Docker Compose (`w00-s03`), no CI ownership (`w00-s04`), no `apps/worker`, no DeepSeek product integration, no authentication, and no later-wave domain modules; capture the check in `evidence/exclusions-check.txt`

## 2. Toolchain resolution and Nx monorepo baseline (US-001, `nx-monorepo-baseline`)

- [x] 2.1 Confirm a concrete Node.js 24.x release within Angular 22's official supported Node range and record it in `evidence/toolchain.md`
- [x] 2.2 Resolve compatible concrete minor/patch versions for Nx 23 minimum `23.1.0` (`nx` and all `@nx/*` identical), Angular 22, PrimeNG 22 + PrimeIcons + official themes package, NestJS 11, Fastify 5 via `@nestjs/platform-fastify`, and TypeScript 6.0.3; record them in `evidence/toolchain.md`
- [x] 2.3 Before continuing scaffolding: inspect partial artifacts from the failed Nx 22 apply; remove only incomplete or incompatible `apps/web` stubs; retain `packages/shared-contracts` and valid `apps/api` scaffolding when compatible with the corrected plan; ensure `package.json` and `package-lock.json` do not retain Nx 22, Angular 21, or an inconsistent partial install; record the Nx 22 conflict and Nx 23 reconciliation in `evidence/toolchain.md`
- [x] 2.4 Initialize or repair Nx 23 (minimum `23.1.0`) at the repository root as a package-based monorepo compatible with npm workspaces, with Nx Cloud and CI generation disabled, without overwriting `openspec/`, `docs/governance/`, or `AGENTS.md`, and without converting the workspace into an Nx integrated monorepo that ignores npm workspaces; perform a clean `npm install` / `npm ci` without `--legacy-peer-deps`, `--force`, or any peer-dependency bypass
- [x] 2.5 Establish and keep `apps/web`, `apps/api`, and `packages/shared-contracts` as Nx-recognized projects under that package-based model: each directory matched by the `apps/*` and `packages/*` workspace globs MUST contain its own valid `package.json`; the root `package.json` MUST be private and declare workspaces `apps/*` and `packages/*`; exactly one root `package-lock.json` MUST exist with no nested lockfiles; `apps/web` and `apps/api` MUST declare their app-specific dependencies in their own `package.json` when the generated model requires it; `packages/shared-contracts` MUST use a stable package name such as `@specpilot/shared-contracts`; API and web MUST consume that package as a local npm workspace dependency (not via relative imports that cross project boundaries); and Nx MUST list all three projects in its project graph
- [x] 2.6 Verify absence of pnpm/Yarn/Bun lockfiles, nested lockfiles, Nx Cloud configuration, and CI workflows introduced by this slice; capture the check in `evidence/package-manager-check.txt`
- [x] 2.7 Enable TypeScript strict mode for apps and packages; confirm project IDs use lowercase kebab-case where applicable

## 3. Shared contracts package (US-001, `shared-libraries-baseline`)

- [x] 3.1 Create `packages/shared-contracts` with stable package name `@specpilot/shared-contracts` and no Angular or NestJS imports
- [x] 3.2 Export the health response TypeScript contract for `{ "status": "ok", "service": "api" }` and a minimal repository-owned runtime validator/type guard (no Zod unless a documented technical necessity forces planning reconciliation)
- [x] 3.3 Confirm no domain packages or shared UI kit were introduced under `packages/`

## 4. NestJS Fastify API baseline (US-001, `nestjs-fastify-api-baseline`)

- [x] 4.1 Scaffold or convert `apps/api` to NestJS 11 with Fastify 5 through `@nestjs/platform-fastify` (if Express scaffolding is present, convert it; do not leave Express as the HTTP adapter)
- [x] 4.2 Implement exactly `GET /health` returning `{ "status": "ok", "service": "api" }` with no database readiness probe
- [x] 4.3 Ensure invalid startup/config fails safely (non-zero exit or refusal to serve health success) and does not silently continue

## 5. Angular web console baseline (US-001, `angular-web-console-baseline`)

- [x] 5.1 Scaffold `apps/web` as Angular 22 standalone (no NgModule bootstrap) with `@nx/angular` ≥ `23.1.0`, PrimeNG 22, PrimeIcons, and the required official themes package using official standalone providers; do not accept Angular 21 scaffolding
- [x] 5.2 Implement the SpecPilot-branded Spanish-first i18n-ready baseline shell with explicit success, loading, and error states; keep full i18n/accessibility/theme product scope deferred
- [x] 5.3 Confirm the shell has no product dashboards, project lists, theme-switcher product features, or later-slice domain screens

## 6. Automated tests and evidence (US-002, `application-test-baseline`)

- [x] 6.1 Select one generator-supported test runner, record it in `evidence/test-runner.md`, and apply it consistently across web, API, and `shared-contracts` wherever the plugin supports it; do not mix Jest and Vitest without documented necessity
- [x] 6.2 Add and run shared-contracts tests for valid health payload success and at least one invalid/blocked payload; capture output under `evidence/success/` and `evidence/failure/` as applicable
- [x] 6.3 Add and run API tests proving `GET /health` returns the exact success contract via Fastify `inject` (no real port required); capture output under `evidence/success/`
- [x] 6.4 Add and run web shell tests for success render and at least one explicit error/blocked bootstrap path; capture output under `evidence/success/` and `evidence/failure/` as applicable
- [x] 6.5 Record impact statements (security/privacy, persistence, budget, migration, rollback — with explicit no-impact notes where applicable) in `evidence/impact-statements.md`

## 7. Governance validators and inventory sync (US-002/US-003)

- [x] 7.1 Update `.gitignore` only as required for legitimate build artifacts (`node_modules`, caches, etc.) without weakening secret scanning
- [x] 7.2 Synchronize `docs/context/**` and regenerate `package-summary.json` for the new workspace tree; capture integrity-consistent results in evidence
- [x] 7.3 Run existing baseline/governance validators on the clean tree and capture passing output in `evidence/success/validators.txt`
- [x] 7.4 Confirm resolved versions are locked in the root `package-lock.json` and recorded in evidence; confirm no unqualified `latest` dependencies without lockfile resolution
- [x] 7.5 Capture a reproducible workspace proof in `evidence/success/npm-nx-workspaces.txt` showing that npm recognizes the three workspaces, Nx lists `web`, `api`, and `shared-contracts` in its project graph/listing, API and web resolve `@specpilot/shared-contracts` locally via the npm workspace (not cross-project relative imports), and `npm ci` succeeds from the repository root using the single root `package-lock.json`

## 8. Operator-visible outcomes (US-003)

- [x] 8.1 Document operator-facing serve/test commands for web and API baselines and verify hyphenated `/opsx-*` command syntax remains copyable; capture the check in `evidence/operator-commands.md`
- [x] 8.2 Obtain and record operator confirmation that the Spanish shell and `GET /health` surface behave as documented in `evidence/human-validation.md`
- [x] 8.3 Confirm no hidden deferred acceptance criteria remain across US-001/002/003; record the confirmation in `evidence/no-deferred-ac.md`

## 9. Closure gates (US-003)

- [x] 9.1 Report all validation and test results to the operator and obtain explicit approval before any commit, push, Verify, sync, or archive (main-only; no branches; no Pull Requests)
- [x] 9.2 With operator approval, run OpenSpec Verify and require exactly `PASS`; capture the output in `evidence/verify.txt`; if not exact `PASS`, stop and remediate
- [x] 9.3 With operator approval after Verify `PASS`, sync the five delta specs to canonical `openspec/specs/<capability>/spec.md`; capture sync evidence
- [x] 9.4 After sync, run the applicable integrity gates and capture results
- [x] 9.5 With operator approval, archive the change through the approved lifecycle and record archive evidence
- [x] 9.6 After archive, run the applicable final validations, report `git status` and `git diff` to the operator, and only with explicit operator approval create the final commit on `main` that includes implementation, synchronized specs, and archive; push only if the operator requests it
