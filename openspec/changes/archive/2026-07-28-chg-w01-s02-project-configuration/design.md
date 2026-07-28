## Context

Wave `w01` slice `w01-s01-project-registration` is archived: durable `Project` rows with realpath identity, presence-only `.specpilot/project.yaml` eligibility, `POST/GET /projects`, and a minimal Spanish-first registration console. Prisma today has `AppMetadata` plus `Project` without `configurationVersionId`. Registered projects therefore exist without a trusted, versioned reading of the portable contract.

Slice `w01-s02-project-configuration` must parse, schema-validate, version, and persist immutable configuration snapshots so later discovery (`w01-s03`) and dashboard (`w01-s04`) work against validated centralized state (ADR-003, ADR-005). The product remains read-only toward target repositories. Stakeholders: SpecPilot operator (approvals); Cursor (sole implementer). Main-only working policy remains binding.

## Goals / Non-Goals

**Goals:**

- Parse and schema-validate `.specpilot/project.yaml` against the portable contract (`docs/configuration/project-yaml-contract.md`).
- Persist immutable `ProjectConfigurationVersion` snapshots (normalized content, source hash, validation metadata) in PostgreSQL and link the active version on `Project.configurationVersionId`.
- Fail closed on parse/schema failures: never mark invalid YAML as the active trusted snapshot; never write into the target repository.
- Expose shared contracts plus NestJS API and a minimal Spanish-first Angular surface for configuration refresh/inspect outcomes (success, blocked, empty, loading, error)—not a dashboard.
- Attach a snapshot after successful registration and always support explicit refresh for already-registered projects.
- Deliver deterministic automated evidence for success and at least one blocked/failure path; keep quality gates green.
- Update docs/context inventory and package summary as needed.

**Non-Goals:**

- Git status / OpenSpec discovery inspection (`w01-s03`).
- Project dashboard or discovery-health UI (`w01-s04`).
- Editing target repositories; running Git, OpenSpec, Cursor, tests, commits, or delivery commands from SpecPilot.
- Budget enforcement, DeepSeek API calls, reviews, findings, prompts, or context-bundle materialization (YAML may *declare* review/budget fields; this slice only validates and snapshots them).
- Authentication/multiuser; Windows/Linux support; remote repos without local checkout.
- Replacing presence-only registration eligibility (registration still requires the file as a regular file before insert).
- Removing `AppMetadata`; introducing non-PostgreSQL stores.
- Editing OpenSpec-generated integrations except via `openspec update`.
- Storing raw YAML bytes in PostgreSQL.

## Decisions

### D1 — Domain model: `ProjectConfigurationVersion` + active FK on `Project`

Add Prisma model `ProjectConfigurationVersion` mapped to `project_configuration_versions`, additive migration only. Extend `Project` with nullable `configurationVersionId` FK to the active valid snapshot. Retain `AppMetadata` and existing registration fields.

Binding fields for `ProjectConfigurationVersion`:

| Field | Storage | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `projectId` | FK → `projects.id` | Owning project; cascade delete with project |
| `schemaVersion` | int | From YAML `schemaVersion` (initially `1`) |
| `sourceHash` | string | SHA-256 **hexadecimal lowercase** of the **exact bytes** read from `.specpilot/project.yaml` (see hashing rules below) |
| `normalizedConfig` | JSON (`Json`) | Separately: validated semantic interpretation of the portable contract (no absolute host paths). **Not** used to compute `sourceHash`. |
| `validatedAt` | timestamptz | When validation succeeded |
| `createdAt` | timestamptz | Insert time |

**`sourceHash` (binding):**

- Compute SHA-256 over the exact bytes read from `.specpilot/project.yaml`.
- Encode as hexadecimal **lowercase**.
- Do **not** normalize line endings, whitespace, key order, or any YAML content before hashing.
- The hash represents the exact physical source-file version on disk.
- `normalizedConfig` is the separate validated semantic snapshot; identical `normalizedConfig` with different source bytes still yields a different `sourceHash` and therefore a **new** version row.
- Do **not** store raw YAML in PostgreSQL (hash + normalized JSON only).

**Immutability and idempotency (binding):**

- Rows are **immutable** after insert: never update columns of an existing `ProjectConfigurationVersion`.
- Only **successfully validated** configurations are persisted as versions.
- `Project.configurationVersionId` points at the active valid version or remains `null` when none exists.
- Same byte-for-byte content for the same `projectId` is **idempotent**: return the existing version; do not insert a duplicate.
- A byte difference, even when parse/normalize would produce the same `normalizedConfig`, creates a **new** version and moves the active pointer (on success).
- On validation failure, **do not** insert a version row and **do not** change `configurationVersionId` (previous valid active snapshot, if any, stays active).

**Unique constraint (binding):** `(projectId, sourceHash)` — mandatory, not optional. Concurrent same-hash refresh resolves via this constraint and returns the existing version as idempotent success.

**Transactional pointer move (binding):** Inserting a new valid version and updating `Project.configurationVersionId` MUST occur in a **single PostgreSQL transaction**. If either operation fails, neither may remain applied (no orphan version left active, no pointer to a missing version).

- *Alternative considered:* normalize LF / trim before hashing. Rejected — hash must identify the physical file bytes.
- *Alternative considered:* store invalid attempts as versions with `validationStatus=invalid`. Rejected for this slice — fail-closed means no trusted snapshot row; error response is enough evidence.
- *Alternative considered:* embed raw YAML blob in PostgreSQL. Rejected — store hash + `normalizedConfig` only.
- *Alternative considered:* replace prior version rows. Rejected — immutability/history is the point of versioning.
- *Alternative considered:* unique on `sourceHash` alone. Rejected — uniqueness is per project: `(projectId, sourceHash)`.

### D2 — Trigger: post-register attach + explicit refresh

Keep `POST /projects` eligibility **presence-only** (unchanged blocked codes from `w01-s01`). Sequencing (binding):

1. Run presence-only eligibility and insert the `Project` first.
2. **Never** roll back / delete the `Project` because of later attach failures (expected or unexpected).
3. After insert, attempt configuration attach (read → size check → hash → parse → validate → transactional persist + pointer).

**Expected attach failures** (filesystem presence/read issues after insert, `project_yaml_too_large`, parse errors, contract validation errors):

- HTTP **201** still (registration succeeded).
- `configuration.status = 'blocked'` with the specific machine-readable `code`.
- `configurationVersionId` remains `null`.
- No snapshot row inserted; no pointer move.

**Unexpected attach failures** (unexpected Prisma, filesystem, or infrastructure errors during attach):

- Preserve the registered `Project`.
- Insert no partial snapshot; do not move `configurationVersionId`.
- HTTP **201** with `configuration.status = 'blocked'`.
- Use `code` **`configuration_attach_failed`** and a safe operator message.
- Log the error internally without exposing stack traces, YAML contents, or additional internal paths to the client.

**Explicit refresh** (`POST /projects/:id/configuration/refresh`):

- Re-read YAML from the stored canonical `repositoryPath`, validate, version, and update active pointer on success.
- **Expected** filesystem/size/parse/schema failures → **422** with the specific `code`; no pointer move; no invalid version row.
- **Unexpected** Prisma/filesystem/infrastructure failures → **500** with `code` **`configuration_refresh_failed`** and a safe message (same non-leak logging rules).

`GET /projects/:id/configuration` — return the active configuration version DTO on **200**; on **404** distinguish `project_not_found` vs `configuration_not_found` via `code`.

- *Alternative considered:* parse only on explicit refresh (never during register). Rejected — operators would routinely have registered projects with null config; US core behavior includes attach in the registration flow.
- *Alternative considered:* fail/rollback registration when YAML is invalid. Rejected — would break presence-only registration contract and conflate eligibility with schema validity.
- *Alternative considered:* change registration to require schema-valid YAML before insert. Rejected — expands `w01-s01` eligibility semantics; keep presence vs schema as separate layers.
- *Alternative considered:* map unexpected attach failures to HTTP 500 on `POST /projects`. Rejected — registration already committed; surface attach failure as `configuration.blocked` with `configuration_attach_failed` while keeping **201**.

### D3 — Parse and schema validation (fail-closed, read-only)

Extend the filesystem port (or a dedicated configuration reader port) to **read** `.specpilot/project.yaml` as exact bytes from the project’s canonical directory—still no create/modify/delete in the target repo.

Validation pipeline (order binding):

1. Confirm project exists; load canonical `repositoryPath`.
2. Confirm YAML path exists as a regular file under that directory (reuse presence checks) → else blocked codes consistent with registration (`project_yaml_missing`, `project_yaml_not_regular_file`, etc.).
3. Determine file size **before** parsing. Maximum allowed size is **262144 bytes (256 KiB)** exactly. If size exceeds the limit → `project_yaml_too_large` (no parse, no hash persist/snapshot, no `configurationVersionId` move).
4. Read the exact file bytes; compute `sourceHash` = SHA-256 hex lowercase of those bytes (no pre-hash normalization of any kind).
5. Parse YAML → on failure `project_yaml_parse_error`.
6. Schema-validate against contract `schemaVersion: 1` required shape:
   - Required top-level keys: `schemaVersion`, `project`, `repository`, `openspec`, `delivery`, `context`, `review`, `executor`, `validationAssistants` (match contract doc; allow documented optional nesting only where the contract implies it).
   - `schemaVersion` must be integer `1` for this slice (`unsupported_schema_version` otherwise).
   - Machine IDs (`project.id`, and any other ID-like fields the contract treats as machine IDs) must be lowercase kebab-case (`invalid_machine_id`).
   - `repository` must **not** contain absolute installation paths; portable branch/name fields only (`invalid_repository_contract` if absolute path-like fields appear).
   - `context.include` / `context.exclude` must be string arrays; normalize path patterns (trim, reject empties) **into `normalizedConfig` only**—this normalization does **not** affect `sourceHash`.
   - **Mandatory secret excludes** always applied/merged into `normalizedConfig`: `**/.env`, `**/.env.*`, `**/*.pem`, `**/*.key`, `**/secrets/**` even if omitted or contradicted by include (merge is not an error; reject only if patterns are malformed).
   - `executor.tool` must be `cursor` for validated snapshots in this product generation (`invalid_executor`).
   - `validationAssistants.clineDeepSeek.mode`, when present/enabled, must not grant write authority (`invalid_validation_assistant` if mode is not read-only when enabled).
   - `review.monthlyBudgetUsd` must be a finite number ≥ 0 when present (`invalid_budget_declaration`)—declaration only; no budget ledger.
7. Build `normalizedConfig` JSON from the validated object (deterministic enough for tests).
8. Persist version + update active pointer in one transaction per D1. Same-hash concurrent work resolves via unique `(projectId, sourceHash)` to the existing row (idempotent success). Never update an existing version row.

Use the `yaml` package (locked in root workspace) for parse. Prefer hand-written validators in `apps/api` (and shared types in `packages/shared-contracts`) consistent with existing type-guard style—**no Zod** unless a later change documents necessity.

- *Alternative considered:* JSON Schema + Ajv. Rejected for now — contract is small; hand validators match shared-contracts patterns and avoid new stack complexity.
- *Alternative considered:* js-yaml. Rejected — prefer maintained `yaml` (eemeli) default unless lockfile already constrains otherwise at apply time.
- *Alternative considered:* soft/approximate size limit. Rejected — hard cap is exactly 262144 bytes.

### D4 — Modular monolith boundaries

Implement inside existing `apps/api` `ProjectsModule` (or a nested configuration service used by it):

- Application service methods: `attachConfiguration(projectId)`, `refreshConfiguration(projectId)`, `getActiveConfiguration(projectId)`.
- Ports: filesystem read + hash; Prisma repository for versions/project pointer (transactional insert+pointer).
- Shared DTOs in `packages/shared-contracts`; no new Nx domain package.
- Nx boundaries unchanged: web → shared-contracts only; API must not import web.

- *Alternative considered:* new `packages/project-configuration`. Rejected — single consumer; premature split.

### D5 — API / shared contracts

Extend `packages/shared-contracts` with binding types (no deferred shape):

```ts
type RegisterProjectResponse = ProjectDto & {
  configuration:
    | {
        status: 'attached';
        version: ProjectConfigurationVersionDto;
      }
    | {
        status: 'blocked';
        error: ProjectErrorResponse;
      };
};
```

Rules (binding):

- Every successful registration **201** MUST include `configuration` (always present; never omitted).
- `attached` requires `version` and MUST NOT include `error`.
- `blocked` requires `error` and MUST NOT include `version`.
- Incomplete or ambiguous combinations are invalid and MUST be rejected by shared-contracts type guards.
- When `attached`, `ProjectDto.configurationVersionId` MUST equal `version.id`.
- When `blocked`, `configurationVersionId` MUST be `null`.
- `ProjectDto` includes `configurationVersionId: string | null`.
- `ProjectConfigurationVersionDto`: `{ id, projectId, schemaVersion, sourceHash, normalizedConfig, validatedAt, createdAt }` — **omit raw YAML**.
- Type guards in `packages/shared-contracts` MUST validate the discriminated `configuration` union on `RegisterProjectResponse`.

**HTTP surface (additive):**

#### `POST /projects` (behavior change)

| Status | When | Body |
|---|---|---|
| **201** | Registration eligibility succeeded (Project inserted) | `RegisterProjectResponse` — `configuration` always present (`attached` or `blocked`, including `configuration_attach_failed` for unexpected attach errors). Project is never rolled back for attach failure. |
| **422 / 409 / 500** | Unchanged eligibility / conflict / infra matrix from `w01-s01` (failures **before** Project insert) | unchanged |

#### `POST /projects/:id/configuration/refresh`

| Status | When | Body |
|---|---|---|
| **200** | Valid YAML; new or idempotent same-hash version active | `ProjectConfigurationVersionDto` (active pointer updated transactionally when new; unchanged when same-hash idempotent) |
| **404** | Unknown project | `project_not_found` |
| **422** | Expected filesystem / size / parse / schema blocked | codes such as `project_yaml_missing`, `project_yaml_too_large`, `project_yaml_parse_error`, `unsupported_schema_version`, `invalid_machine_id`, `invalid_executor`, … — no pointer move |
| **500** | Unexpected infra during refresh | `configuration_refresh_failed`; safe message; no stack/YAML/extra paths |

#### `GET /projects/:id/configuration`

| Status | When | Body |
|---|---|---|
| **200** | Active version exists | `ProjectConfigurationVersionDto` |
| **404** | Project missing **or** no active configuration | distinguish `project_not_found` vs `configuration_not_found` via `code` |

Extend `GET /projects` / `GET /projects/:id` `ProjectDto` with `configurationVersionId`.

- *Alternative considered:* optional `configuration` on 201. Rejected — always required.
- *Alternative considered:* PUT semantics for refresh. Rejected — refresh is an action that re-reads disk; POST action route is clearer.
- *Alternative considered:* return raw YAML to the client. Rejected — normalized snapshot is the product contract; raw bytes are hashed server-side only and not stored.

### D6 — Minimal Angular configuration outcomes (not dashboard)

Extend the existing registration/console surface (Spanish-first):

- After register success, show configuration attach result from `RegisterProjectResponse.configuration` (attached summary vs blocked reason/`code`).
- Provide an explicit “Actualizar configuración” (refresh) action for a selected/known project id when list is non-empty.
- States: empty (no projects / no configuration), loading, success (show schemaVersion + hash short form + project id from normalized config), blocked/error (API `message`/`code`).
- Do not build multi-project health tables, Git/OpenSpec columns, or full config editors.

- *Alternative considered:* API-only. Rejected — US-003 requires operator-visible console outcomes.

### D7 — Test strategy and evidence

Jest + existing Testcontainers PostgreSQL pattern:

1. **Unit:** YAML parse success; parse error; `project_yaml_too_large` (>262144 bytes) before parse; unsupported schemaVersion; invalid machine id; secret-exclude merge into normalizedConfig; invalid executor; exact-byte `sourceHash` (no LF normalization — fixtures that differ only by line endings produce different hashes / new versions); same-hash idempotency; byte-different / same-normalizedConfig → new version; fail-closed leaves prior active pointer unchanged; never update existing version columns.
2. **API/integration:** migrate deploy; register with valid YAML → **201** `RegisterProjectResponse` with `configuration.status === 'attached'`, `configurationVersionId === version.id`, version row + FK in one transaction; register with invalid/oversize YAML → **201** with `configuration.status === 'blocked'`, specific `code`, `configurationVersionId === null`, no version row; unexpected attach failure path maps to **201** `blocked` + `configuration_attach_failed` without partial snapshot; refresh expected failures → **422**; refresh unexpected → **500** `configuration_refresh_failed`; refresh same bytes → single version row / idempotent; concurrent same-hash refresh resolves via unique constraint; `GET` configuration 200/404 with differentiated codes.
3. **Web:** component tests for attach/refresh empty/loading/success/blocked states against mocked `RegisterProjectResponse` / refresh API.
4. Quality gates must `PASS` before commit/push. Capture evidence under this change’s `evidence/`.

### D8 — Security, privacy, observability

- Read only the `project.yaml` file (and path metadata); do not walk `context.include` trees or ingest `.env`/key contents in this slice.
- Absolute `repositoryPath` remains DB-only operational data.
- Normalized snapshots must not introduce host absolute paths; raw YAML is not persisted.
- Client responses for unexpected failures MUST NOT leak stack traces, YAML contents, or extra internal paths; logs may include project id, hash, and error `code`.
- No authentication change.

### D9 — Docs and lifecycle

Update `docs/context/**` and package summary if dependencies change. Document operator refresh flow. Sync/archive only after Verify exactly `PASS` with operator approval.

### D10 — Status field

Keep `Project.status` as `registered` for this slice. Configuration health is represented by `configurationVersionId` null vs set plus API configuration outcomes—not a new project status enum (avoids conflating discovery health, which is `w01-s04`/`w01-s03`).

- *Alternative considered:* set `status=configuration_invalid`. Rejected — reserve richer status for discovery/dashboard; null FK + explicit error codes are enough here.

### D11 — Compose host mounts

Reuse `w01-s01` authorized read-only host root mount guidance (`SPECPILOT_HOST_REPOS_ROOT` / gitignored override). Configuration refresh uses the same persisted host-compatible realpath; no new mount policy.

## Risks / Trade-offs

- [Invalid YAML after successful registration leaves projects without active config] → Always-present `configuration` on **201** (`attached` | `blocked`) + refresh action; fail closed without rolling back registration.
- [Contract drift vs `docs/configuration/project-yaml-contract.md`] → Validators and fixtures must track the doc; tests lock required keys for `schemaVersion: 1`.
- [Duplicate version rows under concurrency] → Mandatory unique `(projectId, sourceHash)` + idempotent same-hash success (including concurrent refresh).
- [Partial version without pointer / pointer without version] → Single PostgreSQL transaction for insert + `configurationVersionId` move; all-or-nothing.
- [Hash instability from accidental normalization] → Binding: hash exact bytes only; never normalize before SHA-256; tests cover line-ending-only differences as new versions.
- [Over-strict schema rejecting real repos] → Validate only documented contract rules; do not invent unrelated fields as required.
- [Scope creep into Git/OpenSpec discovery or dashboard] → Non-goals binding; tasks reject out-of-slice work.
- [YAML library CVEs / parse ambiguity] → Pin exact version in root lockfile; reject non-object roots; no custom tags/arbitrary types execution.
- [Oversized YAML DoS / memory pressure] → Hard reject at **262144** bytes with `project_yaml_too_large` before parse; covered by tests.
- [Unexpected attach infra errors looking like registration failure] → Keep **201** + `configuration_attach_failed`; reserve **500** `configuration_refresh_failed` for refresh only.

## Migration Plan

1. Add shared-contracts DTOs/type guards for `ProjectConfigurationVersionDto`, extended `ProjectDto`, and binding `RegisterProjectResponse` discriminated union.
2. Add Prisma `ProjectConfigurationVersion` + `Project.configurationVersionId` additive migration with unique `(projectId, sourceHash)`; `prisma migrate deploy` in Compose/tests.
3. Add YAML dependency (if not present) locked at root; implement read → size check (262144) → exact-byte hash → parse → validate → normalize pipeline (no raw YAML persistence).
4. Wire attach-on-register (D2 expected/unexpected mapping) + `POST .../configuration/refresh` + `GET .../configuration` in `ProjectsModule` with transactional insert+pointer.
5. Extend Angular console for attach/refresh outcomes (Spanish-first) using `RegisterProjectResponse.configuration`.
6. Add unit + Testcontainers + web tests (including oversize, exact-byte hash, attach blocked codes, refresh 500 path); write `evidence/` artifacts.
7. Run `npm run quality-gates`; update docs/context and package summary as needed.
8. Operator-approved commit/push on `main` after reported validations.
9. Operator-approved Verify exactly `PASS`, sync, archive.

**Rollback:** revert slice commits on `main`; roll back or reset only the local SpecPilot DB/volume per Compose docs; never touch foreign Docker resources (e.g. `axioma-db-dev`).

## Open Questions

- None blocking planning. Register response shape, hashing, size limit, attach/refresh failure mapping, and transactional immutability are binding above. Richer project status enums and invalid-attempt audit tables remain deferred.
