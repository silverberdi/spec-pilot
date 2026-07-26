## Why

SpecPilot has binding governance and OpenSpec lifecycle from `w00-s01`, but no product runtime yet—there is no Nx workspace, Angular console, NestJS API, shared libraries, or application tests. This slice establishes the monorepo application baseline so later foundation slices (persistence/runtime, CI) and product waves can build on a verified TypeScript workspace rather than ad-hoc scaffolding.

## What Changes

- Create an Nx monorepo workspace for SpecPilot with a clear `apps/` and shared-library layout, TypeScript tooling, and dependency-boundary-ready project graph.
- Add `apps/web`: Angular 22 standalone console baseline with PrimeNG and PrimeIcons, Spanish-first and i18n-ready shell (no full product features, themes, or accessibility wave scope).
- Add `apps/api`: NestJS with Fastify HTTP API baseline, including an explicit, testable public health/status surface and safe failure behavior for invalid startup or configuration.
- Introduce shared TypeScript libraries used by the web and API baselines with contracts explicit enough to test independently of either app.
- Establish automated unit/project tests that cover the primary success path and at least one meaningful blocked or failure path for the baseline surfaces.
- Keep the repository on the binding main-only working policy; regenerate context/`package-summary.json` as needed after scaffolding; leave OpenSpec-generated integrations untouched except via `openspec update`.

### Binding

| Field | Value |
|---|---|
| Wave | `w00` |
| Slice | `w00-s02-nx-angular-nest-baseline` |
| Change | `chg-w00-s02-nx-angular-nest-baseline` |
| User Stories | `us-w00-s02-nx-angular-nest-baseline-001`, `us-w00-s02-nx-angular-nest-baseline-002`, `us-w00-s02-nx-angular-nest-baseline-003` |
| Implementer | Cursor |
| Dependencies | Completed and archived `chg-w00-s01-repository-governance-and-openspec-foundation`; binding main-only working policy and existing governance validators remain in force |
| Exclusions | PostgreSQL, Prisma, Docker Compose, and local multi-service runtime (`w00-s03`); CI/CD pipelines and later-slice quality/security gates (`w00-s04`); `apps/worker` product scaffolding; DeepSeek product API integration; authentication/multiuser; domain modules (project registry, reviews, budget, etc.); full light/dark/system theme and accessibility polish (`w08-s03`); and all later-wave scope |

### Impact statements

| Area | Impact |
|---|---|
| Business value | Delivers the first runnable application baseline so SpecPilot can evolve as a real monorepo product under OpenSpec governance. |
| Security / privacy | No authentication; no secret storage in apps; scaffolding must not introduce committed secrets; existing secret-scan/baseline validators remain applicable. |
| Persistence | No PostgreSQL/Prisma schema or operational database in this slice. |
| UI / API | Introduces baseline Angular console shell and NestJS/Fastify HTTP health/status surface; not product domain features. |
| Tests | Nx-supported automated tests cover baseline success and at least one blocked/failure path. |
| Migration | Greenfield workspace scaffolding; no data migration. |
| Rollback | Reversible file-level removal/reversion of Nx/apps/libs tooling files; no destructive recovery required. |
| Human validation | Operator confirms web shell and API health surface behave as documented; operator gives explicit approval before any commit, push, Verify, sync, or archive. |

## Capabilities

### New Capabilities

- `nx-monorepo-baseline`: Nx workspace root, TypeScript monorepo layout (`apps/` + shared libraries), tooling conventions, and project-graph readiness without later-slice CI or Docker runtime.
- `angular-web-console-baseline`: Angular 22 standalone `apps/web` console with PrimeNG/PrimeIcons and Spanish-first i18n-ready baseline shell (success/empty/loading/error-ready presentation for the shell only).
- `nestjs-fastify-api-baseline`: NestJS/Fastify `apps/api` with an explicit public health/status contract and safe failure when the API cannot start or serve valid baseline responses.
- `shared-libraries-baseline`: Shared TypeScript libraries with explicit contracts reusable by web and API baselines and testable independently.
- `application-test-baseline`: Deterministic automated tests for the monorepo baseline covering primary success and at least one meaningful blocked/failure path, with evidence suitable for Verify.

### Modified Capabilities

- (none — existing `openspec/specs/` capabilities remain governance/lifecycle contracts; this change adds product scaffolding requirements without altering those requirement texts)

## Impact

- **Repository files:** New root workspace manifests (`package.json`, Nx/TypeScript config), `apps/web`, `apps/api`, shared libraries under the chosen libs/packages layout, and related docs/context updates required for operator visibility.
- **Tooling:** Nx major 23 (minimum `23.1.0`, with `nx` and every `@nx/*` package on the same concrete version), officially compatible with Angular 22; generators/targets for serve/build/test of baseline apps and libs; existing governance scripts (`validate-baseline`, secret scan, package-summary, delivery-graph) remain and must still pass where applicable. npm install MUST resolve without `--legacy-peer-deps`, `--force`, or any other peer-dependency bypass.
- **OpenSpec:** New capability specs under this change; canonical sync to `openspec/specs/` only after Verify exactly `PASS` and operator-approved sync.
- **Systems not touched:** No PostgreSQL/Prisma/Docker Compose (`w00-s03`); no CI workflow ownership belonging to `w00-s04`; no worker app, DeepSeek gateway, auth, or product domain modules; no edits to OpenSpec-generated integrations except via `openspec update`.
- **Risk if skipped:** Later slices would layer persistence, CI, and product features onto an undefined application shape, increasing rework and weakening bounded delivery.
