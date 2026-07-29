# application-test-baseline

## Purpose

Deterministic automated tests for the monorepo application baseline covering success and meaningful failure paths, including persistence and Compose runtime evidence suitable for Verify.

## Requirements

### Requirement: One consistent Nx-supported test runner
The monorepo baseline MUST select a single test runner supported by the chosen Nx 23 generators/plugins, record that choice in change evidence, and use it consistently for `apps/web`, `apps/api`, and `packages/shared-contracts` whenever the relevant plugin supports it. Jest and Vitest MUST NOT be mixed without a documented technical incompatibility and recorded rationale.

#### Scenario: Runner choice is recorded and applied
- **WHEN** baseline tests are executed for evidence
- **THEN** the selected runner is recorded in change evidence and used consistently across supported web, API, and shared-contracts projects

#### Scenario: Mixed runners without necessity are prohibited
- **WHEN** no documented plugin incompatibility requires a second runner
- **THEN** the baseline MUST NOT introduce both Jest and Vitest

### Requirement: Shared contracts tests cover success and failure
Automated tests for `packages/shared-contracts` MUST cover a successful health-contract validation path and at least one invalid or blocked payload path.

#### Scenario: Shared validator success path
- **WHEN** shared-contracts tests run against a valid health payload
- **THEN** the tests pass and demonstrate successful validation

#### Scenario: Shared validator failure path
- **WHEN** shared-contracts tests run against an invalid health payload
- **THEN** the tests pass by demonstrating that validation rejects the payload

### Requirement: API health tests cover success without a real port
Automated API tests MUST demonstrate that `GET /health` returns the exact success contract. HTTP tests MAY use the Fastify adapter `inject` mechanism and MUST NOT require binding a real network port for baseline evidence.

#### Scenario: Health success via Fastify inject
- **WHEN** API baseline tests invoke `GET /health` through Fastify `inject` or an equivalent in-process adapter mechanism
- **THEN** the response body is exactly `{ "status": "ok", "service": "api" }` and no real listening port is required for the evidence run

### Requirement: Web shell tests cover success and failure
Automated web tests MUST demonstrate that the baseline shell renders on the success path and surfaces an explicit error or blocked path when bootstrap input or configuration is invalid.

#### Scenario: Web shell success path
- **WHEN** web baseline unit or component tests exercise successful shell bootstrap
- **THEN** the shell success render path is demonstrated

#### Scenario: Web shell failure path
- **WHEN** web baseline tests exercise invalid bootstrap input or failed configuration
- **THEN** an explicit error or blocked path is demonstrated

### Requirement: Evidence is captured under the change directory
Deterministic automated test, quality-gate, and related Verify outputs for the active change MUST be captured under that change’s `evidence/` directory (or the archived change evidence path after archive). For `chg-w03-s01-deepseek-api-gateway`, evidence MUST live under `openspec/changes/chg-w03-s01-deepseek-api-gateway/evidence/` (or its archive path). Persistence integration tests MUST continue to use Testcontainers PostgreSQL where already required. This capability MUST NOT transfer Playwright product e2e ownership into this slice. Mandatory Verify evidence MUST include the full local quality-gate orchestrator `PASS` run where quality gates apply; GitHub Actions may supply independent post-push remote verification logs but MUST NOT replace local full-gate evidence and MUST NOT be treated as a pre-entry block onto `main`.

#### Scenario: Evidence files are present for Verify under the active change
- **WHEN** quality-gate and application-test evidence is prepared for Verify of `chg-w03-s01-deepseek-api-gateway`
- **THEN** reproducible command outputs exist under that change’s `evidence/` directory, including full local quality-gate `PASS` output when gates are run for closure, and do not depend on Playwright product e2e

#### Scenario: Testcontainers evidence remains permitted for persistence
- **WHEN** API persistence integration evidence is captured as part of the required automated test set
- **THEN** Testcontainers PostgreSQL may be used and the resulting outputs are recorded under the active change `evidence/` directory

#### Scenario: Remote CI does not replace local gate evidence
- **WHEN** a GitHub Actions post-push workflow run log is available
- **THEN** it may corroborate remote verification but MUST NOT substitute for the required local full quality-gate `PASS` evidence

### Requirement: Persistence configuration failure is covered by automated tests
Automated tests MUST demonstrate that missing or malformed `DATABASE_URL` configuration causes startup rejection, and that readiness probe failure maps to HTTP 503 with an explicit non-ok database status. These configuration and mapping tests MUST NOT require a live Docker daemon.

#### Scenario: Missing or malformed DATABASE_URL is rejected
- **WHEN** automated tests exercise API startup with missing or malformed `DATABASE_URL`
- **THEN** the tests pass by demonstrating startup rejection without serving HTTP traffic

#### Scenario: Readiness failure mapping is demonstrated without Docker
- **WHEN** automated tests exercise readiness handling with a failed database probe
- **THEN** the tests pass by demonstrating HTTP 503 with an explicit non-ok database status

### Requirement: Testcontainers PostgreSQL covers migration and readiness paths
Automated API persistence integration tests MUST start an ephemeral PostgreSQL container via Testcontainers using a pinned PostgreSQL major compatible with the Compose baseline, apply committed migrations with `prisma migrate deploy`, execute a successful baseline metadata round trip through the Prisma client, demonstrate readiness success against the live container, and demonstrate readiness failure against an unreachable database. Existing `w00-s02` web, API liveness, and shared-contracts test suites MUST continue to pass.

#### Scenario: Migrations and metadata round trip succeed in Testcontainers
- **WHEN** persistence integration tests start Testcontainers PostgreSQL and apply committed migrations
- **THEN** `prisma migrate deploy` succeeds and a baseline metadata insert-and-read round trip succeeds through the Prisma client

#### Scenario: Readiness success and failure are demonstrated against real Postgres
- **WHEN** persistence integration tests probe readiness against a live Testcontainers database and against an unreachable database URL or stopped container
- **THEN** readiness returns the success contract for the live database and HTTP 503 with explicit non-ok database status for the unreachable case

#### Scenario: Prior baseline suites remain green
- **WHEN** the full required automated test set for this slice is executed
- **THEN** existing web shell, API liveness, and shared-contracts suites continue to pass

### Requirement: Compose runtime evidence covers success and blocked paths
Deterministic runtime evidence MUST capture Compose startup for `postgres`, `api`, and `web`, successful `GET /health` and `GET /health/ready` responses, host reachability of the web service, and at least one blocked path such as readiness returning HTTP 503 after Postgres becomes unavailable.

#### Scenario: Compose success path is evidenced
- **WHEN** Compose runtime evidence is captured for a healthy stack
- **THEN** outputs show `postgres`, `api`, and `web` started, liveness and readiness succeeding, and the web service reachable from the host

#### Scenario: Compose blocked readiness path is evidenced
- **WHEN** Compose runtime evidence captures a blocked database condition
- **THEN** outputs show readiness returning HTTP 503 with an explicit non-ok database status while the failure remains operator-visible

### Requirement: Quality gates invoke the established application test suites
The required quality-gate orchestrator (`scripts/run-quality-gates.sh`) and the post-push GitHub Actions workflow that invokes it MUST run the established application automated test suites via `nx run-many -t test` (or equivalent), including Testcontainers-backed persistence tests where already required. Persistence integration tests MUST NOT be marked CI-skipped. SpecPilot Docker Compose MUST NOT be used as the test database vehicle inside CI.

#### Scenario: Gate run executes application tests including Testcontainers paths
- **WHEN** the full quality-gate orchestrator runs on an environment with Docker available
- **THEN** the established web, API, shared-contracts, and Testcontainers persistence suites are executed as part of the automated test gate and are not skipped solely because the run is remote CI

#### Scenario: Compose is not used as the CI test database
- **WHEN** automated tests run under the quality-gate orchestrator in GitHub Actions
- **THEN** SpecPilot Compose project resources are not started as the CI database; ephemeral Testcontainers PostgreSQL remains the integration path where required

### Requirement: Local project registration success and blocked paths are covered by automated tests
Automated tests MUST demonstrate a successful local project registration path (HTTP 201 with persisted canonical `repositoryPath`) and at least one meaningful blocked or failure path (HTTP 422 or 409 with stable `{ code, message }` and no partial insert). Coverage MUST include realpath/symlink duplicate identity where practical, `displayName` max-length rejection, and deterministic mapping of unique-constraint violations to HTTP 409. Web tests MUST cover empty, loading, success, and blocked/error registration UI states against the API contracts. Existing health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Registration success path is demonstrated
- **WHEN** automated API or integration tests register an eligible temp repository containing `.specpilot/project.yaml`
- **THEN** the tests pass by demonstrating HTTP 201, a persisted Project whose `repositoryPath` is the canonical realpath, and no modification of the fixture repository contents beyond pre-existing files

#### Scenario: Registration blocked path is demonstrated
- **WHEN** automated tests exercise a blocked eligibility case such as missing `project.yaml` or overlong `displayName`
- **THEN** the tests pass by demonstrating HTTP 422 with the expected `code`, stable `{ code, message }` body, and no Project row inserted

#### Scenario: Unique constraint race maps to 409
- **WHEN** automated tests force or simulate a Prisma unique-constraint violation on `repositoryPath` or `slug`
- **THEN** the tests pass by demonstrating HTTP 409 with `duplicate_repository_path` or `duplicate_project_slug` as appropriate

#### Scenario: Web registration states are covered
- **WHEN** web tests exercise the registration surface with mocked empty list, in-flight request, 201 success, and 422/409 error responses
- **THEN** empty, loading, success, and blocked/error outcomes are demonstrated

### Requirement: Project YAML configuration success and blocked paths are covered by automated tests
Automated tests MUST demonstrate a successful project.yaml parse/validate/persist path (HTTP 201 register with `configuration.status` `attached`, or HTTP 200 refresh) that creates an immutable `ProjectConfigurationVersion` and sets `configurationVersionId`, and at least one meaningful blocked or failure path. Coverage MUST include `project_yaml_too_large` (>262144 bytes) before parse, exact-byte `sourceHash` behavior (no pre-hash normalization), same-hash idempotency, fail-closed pointer retention on validation failure, register attach blocked outcomes that keep the `Project`, refresh expected HTTP 422 codes, and refresh unexpected HTTP 500 `configuration_refresh_failed` where practical. Shared-contracts tests MUST cover the `RegisterProjectResponse` discriminated union. Web tests MUST cover attach/refresh empty, loading, success, and blocked/error states. Existing registration, health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Configuration attach success path is demonstrated
- **WHEN** automated API or integration tests register an eligible temp repository containing a schema-valid `.specpilot/project.yaml` within size limits
- **THEN** the tests pass by demonstrating HTTP 201 with `configuration.status` `attached`, a persisted version row, and `configurationVersionId` equal to `version.id`

#### Scenario: Oversized YAML blocked path is demonstrated
- **WHEN** automated tests exercise configuration attach or refresh against a `.specpilot/project.yaml` larger than 262144 bytes
- **THEN** the tests pass by demonstrating the `project_yaml_too_large` outcome, no version row insert, and no `configurationVersionId` move

#### Scenario: Register attach blocked keeps the project
- **WHEN** automated tests register an eligible repository whose YAML fails parse or schema validation
- **THEN** the tests pass by demonstrating HTTP 201 with `configuration.status` `blocked`, `configurationVersionId` null, a retained Project row, and no configuration version row

#### Scenario: Refresh expected and unexpected failures are covered
- **WHEN** automated tests exercise refresh against an expected validation failure and, where practical, an unexpected infrastructure failure
- **THEN** the tests pass by demonstrating HTTP 422 with a specific code for the expected path and HTTP 500 with `configuration_refresh_failed` for the unexpected path

#### Scenario: Shared RegisterProjectResponse union is covered
- **WHEN** shared-contracts tests validate attached, blocked, and ambiguous `RegisterProjectResponse` payloads
- **THEN** valid attached/blocked payloads are accepted and incomplete or ambiguous unions are rejected

#### Scenario: Web configuration outcomes are covered
- **WHEN** web tests exercise register attach and refresh surfaces with mocked attached, blocked, loading, and error responses
- **THEN** empty, loading, success, and blocked/error configuration outcomes are demonstrated

### Requirement: Git and OpenSpec discovery success and blocked paths are covered by automated tests
Automated tests MUST demonstrate a successful discovery refresh path (HTTP 200 with persisted `lastDiscovery` and non-null `lastInspectedAt`) and at least one meaningful blocked or failure path. Coverage MUST include non-git repository → Git `not_a_git_repository` with HTTP 200 persist; OpenSpec `openspec_root_missing` or limit/escape blocked outcomes with HTTP 200 persist where practical; hard path HTTP 422 without field updates; `GET` before refresh → HTTP 404 `discovery_not_found`; unexpected refresh failure → HTTP 500 `discovery_refresh_failed` where practical; registration still returning `lastInspectedAt: null`; closed discovery code unions and ambiguous shape rejection in shared-contracts; and web empty/loading/success/blocked discovery outcomes. Existing registration, configuration, health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Discovery refresh success path is demonstrated
- **WHEN** automated API or integration tests refresh discovery for a registered temp repository with a usable Git work tree and OpenSpec layout
- **THEN** the tests pass by demonstrating HTTP 200, persisted `lastDiscovery`, and non-null `lastInspectedAt`

#### Scenario: Non-git blocked Git outcome still persists
- **WHEN** automated tests refresh discovery against a readable registered directory that is not a Git work tree
- **THEN** the tests pass by demonstrating HTTP 200 with Git blocked `not_a_git_repository` and persisted snapshot fields

#### Scenario: Hard path failure does not update discovery fields
- **WHEN** automated tests refresh discovery after the stored repository path becomes missing or unreadable
- **THEN** the tests pass by demonstrating HTTP 422 with a repository code and unchanged `lastDiscovery` / `lastInspectedAt`

#### Scenario: Get before refresh returns discovery_not_found
- **WHEN** automated tests call `GET /projects/:id/discovery` before any refresh
- **THEN** the tests pass by demonstrating HTTP 404 with `code` `discovery_not_found`

#### Scenario: Shared discovery unions are covered
- **WHEN** shared-contracts tests validate ok, blocked, unknown-code, and ambiguous `ProjectDiscoveryDto` payloads
- **THEN** valid payloads are accepted and unknown codes or ambiguous unions are rejected

#### Scenario: Web discovery outcomes are covered
- **WHEN** web tests exercise discovery refresh/get surfaces with mocked empty, loading, success, and blocked/error responses
- **THEN** empty, loading, success, and blocked/error discovery outcomes are demonstrated

### Requirement: Project dashboard listing and discovery-health paths are covered by automated tests
Automated tests MUST demonstrate dashboard-oriented listing and discovery-health success plus at least one meaningful empty, never-inspected, blocked, or invalid path. Coverage MUST include: `deriveDiscoveryHealth` matrix cases (both-null `never_inspected`; exactly-one-null `invalid`; type-guard failure; projectId mismatch; inspectedAt instant mismatch; both-ok `ok`; git-only / openspec-only / both blocked); closed `summaryMessage` mapper strings without copying persisted subsystem messages; `POST /projects` 201 embedding `discoveryHealth` `never_inspected`; `GET /projects` empty array; multi-project `GET /projects` ordered by `registeredAt` DESC then `id` ASC; list rows after discovery refresh showing derived `ok` or `blocked`; shared-contracts acceptance/rejection for enriched `ProjectDto` / `discoveryHealth`; and web empty, loading, populated health labels, order preservation, and at least one blocked or never_inspected presentation. Existing registration, configuration, discovery, health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Health derivation matrix is covered
- **WHEN** unit tests exercise `deriveDiscoveryHealth` across the fail-closed matrix
- **THEN** never_inspected, invalid, ok, and blocked outcomes match the binding derivation rules

#### Scenario: Summary message mapper is covered
- **WHEN** unit tests map closed Git and OpenSpec blocked codes into `summaryMessage`
- **THEN** the exact Spanish mapper strings are produced and persisted free-text subsystem messages are not copied

#### Scenario: List ordering is covered with multiple projects
- **WHEN** automated API or integration tests register multiple projects and call `GET /projects`
- **THEN** the tests pass by demonstrating order `registeredAt` DESC with `id` ASC as tie-breaker

#### Scenario: Register embeds never_inspected discoveryHealth
- **WHEN** automated tests register a project successfully
- **THEN** the HTTP 201 `ProjectDto` includes `discoveryHealth.status` `never_inspected`

#### Scenario: Web dashboard outcomes are covered
- **WHEN** web tests exercise the dashboard list with mocked empty, loading, populated, blocked or never_inspected, and error responses
- **THEN** empty, loading, populated health, order preservation, and error outcomes are demonstrated

### Requirement: Context-source resolution success and blocked paths are covered by automated tests
Automated tests MUST demonstrate a successful context-source resolve path (HTTP 200 with sorted `paths` for a registered project with active configuration) and at least one meaningful empty or blocked/failure path. Coverage MUST include: empty match → HTTP 200 `pathCount` 0; missing configuration → HTTP 422 `configuration_not_found`; invalid/missing stage → HTTP 422 `invalid_review_stage`; unknown project → HTTP 404 `project_not_found`; out-of-tree symlink → HTTP 422 `context_path_escape` with no partial paths; in-tree symlink omitted; defensive mandatory exclude applied when snapshot omits one; invalid patterns (empty, NUL, absolute, backslash, `..`) → `invalid_context_patterns`; leading `!` not treated as negation; case-sensitive matching; `.git` omitted but counted; visit/match/UTF-8 payload limits → `context_resolution_limit_exceeded` without truncation; timeout → `context_resolution_timeout` where practical; `EACCES`/`EPERM` → `context_entry_unreadable` where practical; unexpected failure → HTTP 500 `context_resolve_failed` without path leakage where practical; shared-contracts acceptance/rejection for resolve DTOs and unknown codes; and web idle/loading/success/empty/blocked outcomes including the 200-path display cap copy when `pathCount > 200`. Existing registration, configuration, discovery, dashboard, health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Resolve success path is demonstrated
- **WHEN** automated API or integration tests resolve context sources for a registered temp repository with attached configuration and matching files
- **THEN** the tests pass by demonstrating HTTP 200 with `status` `ok` and sorted repository-relative `paths`

#### Scenario: Empty resolve success is demonstrated
- **WHEN** automated tests resolve against a tree that matches no include/exclude candidates
- **THEN** the tests pass by demonstrating HTTP 200 with `pathCount` 0

#### Scenario: Missing configuration is blocked
- **WHEN** automated tests resolve for a registered project without an active configuration version
- **THEN** the tests pass by demonstrating HTTP 422 with `code` `configuration_not_found`

#### Scenario: Out-of-tree symlink is blocked without partial results
- **WHEN** automated tests resolve a fixture containing a symlink that escapes the repository root
- **THEN** the tests pass by demonstrating HTTP 422 with `code` `context_path_escape` and no success path list

#### Scenario: Mandatory exclude is applied when snapshot omits it
- **WHEN** automated tests resolve using a snapshot whose persisted excludes omit a mandatory secret-path pattern
- **THEN** the matching secret-bearing path is not a candidate and the success `exclude` array includes the effective mandatory pattern

#### Scenario: Shared resolve unions are covered
- **WHEN** shared-contracts tests validate ok, blocked, unknown-code, unknown-stage, and ambiguous resolve payloads
- **THEN** valid payloads are accepted and unknown codes, unknown stages, or ambiguous unions are rejected

#### Scenario: Web resolve outcomes are covered
- **WHEN** web tests exercise the resolve surface with mocked idle, loading, success, empty, blocked/error, and `pathCount > 200` responses
- **THEN** idle, loading, success, empty, blocked/error, and the 200-path display-cap copy are demonstrated

### Requirement: Secret detection success and blocked paths are covered by automated tests
Automated tests MUST demonstrate a successful secret-scan path (HTTP 200 with clean eligible paths for a registered project with active configuration) and at least one meaningful blocked or failure path. Coverage MUST include: empty candidates → HTTP 200 with `candidatePathCount` 0; planted closed-pattern secret in an included file → either HTTP 200 with path excluded from `eligiblePaths` or HTTP 422 `unsafe_context_bundle` when no eligible paths remain; `unsafe_context_bundle` body requiring only safe counts; oversize/`fstat` unscannable without counting toward `totalBytesRead`; NUL and invalid UTF-8 unscannable; pre-read total-byte overflow → `secret_scan_limit_exceeded`; timeout → `secret_scan_timeout` where practical; invalid relative path → `context_path_escape`; symlink/`EACCES` mid-scan → `secret_scan_entry_unreadable` with no partial ok; detector dedupe and ordering; finding payloads without match text; shared-contracts acceptance/rejection including conditional unsafe counts and rejection of snippet fields; unexpected failure → HTTP 500 `secret_scan_failed` without content leakage where practical; and web idle/loading/success/empty/blocked outcomes including unsafe counts-only presentation. Product fixtures with secret-like content MUST use temporary directories or change `evidence/` quarantine paths and MUST NOT weaken SpecPilot repository CI secret scanning. Existing registration, configuration, discovery, dashboard, resolve, health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Clean secret-scan success path is demonstrated
- **WHEN** automated API or integration tests secret-scan a registered temp repository with attached configuration and clean included files
- **THEN** the tests pass by demonstrating HTTP 200 with `status` `ok` and `eligiblePaths` equal to resolve candidates

#### Scenario: Detected secret excludes or blocks unsafely
- **WHEN** automated tests plant a closed-pattern secret in an included candidate file and run secret scan
- **THEN** the tests pass by demonstrating either HTTP 200 with that path absent from `eligiblePaths` and a deduplicated finding without match text, or HTTP 422 `unsafe_context_bundle` with required safe counts when no eligible paths remain

#### Scenario: Oversize unscannable does not inflate totalBytesRead
- **WHEN** automated unit or integration tests classify a file with `fstat` size greater than 1048576
- **THEN** the tests pass by demonstrating `unscannable_content` exclusion without reading contents and without counting that file toward the total-byte read budget used for `secret_scan_limit_exceeded`

#### Scenario: Shared secret-scan unions are covered
- **WHEN** shared-contracts tests validate ok, unsafe-with-counts, non-unsafe-without-counts, unknown-code, snippet-bearing finding, and ambiguous secret-scan payloads
- **THEN** valid payloads are accepted and invalid conditional fields, unknown codes, or forbidden finding fields are rejected

#### Scenario: Web secret-scan outcomes are covered
- **WHEN** web tests exercise the secret-scan surface with mocked idle, loading, success, empty, success-with-exclusions, unsafe blocked, and error responses
- **THEN** idle, loading, success, empty, exclusions, unsafe counts-only, and blocked/error outcomes are demonstrated without rendering file contents or secret values

#### Scenario: Repository CI scanner remains unweakened by fixtures
- **WHEN** product secret-scan fixtures are introduced for automated tests
- **THEN** fixtures are confined to temp dirs or quarantined evidence paths and SpecPilot repository secret scanning is not weakened to pass induced tracked fixtures

### Requirement: Context-bundle success and blocked paths are covered by automated tests
Automated tests MUST demonstrate a successful context-bundle create path (HTTP 201 with persisted immutable manifest including content hashes, full-file line ranges, token estimates, and algorithm ids for a registered project with active configuration) and at least one meaningful blocked or failure path. Coverage MUST include: empty candidates → HTTP 201 empty bundle; oversize + clean → HTTP 201 with oversize in `exclusions` as `unscannable_content` and clean path in `entries`; sole oversize candidate → HTTP 422 `unsafe_context_bundle` with counts only and no row; total-byte overflow → propagated `secret_scan_limit_exceeded` with no row; shared-pipeline timeout → propagated `secret_scan_timeout` with no row; injected hash/token/canonicalization/`manifestHash` failure → HTTP 500 `context_bundle_failed` with no row; Prisma transaction failure → HTTP 500 `context_bundle_failed` with no partial row; same-bytes single-open spies proving detectors/hash/line/token consume the same byte object and no reread after a mutation opportunity; `manifestHash` stability and sensitivity matrix (identical material, changed exclusion, changed estimator/policy id, entry order, id/createdAt excluded); type guards rejecting removed `context_bundle_*` blocked codes and enforcing conditional unsafe counts; GET by id and latest `limit=1`; invalid latest query → `invalid_context_bundle_query`; public secret-scan regression remains green; and web idle/loading/success/empty/blocked outcomes without file contents or transmission flags. Existing registration, configuration, discovery, dashboard, resolve, secret-scan, health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Clean context-bundle success path is demonstrated
- **WHEN** automated API or integration tests create a context bundle for a registered temp repository with attached configuration and clean included files
- **THEN** the tests pass by demonstrating HTTP 201 with persisted entries containing `contentHash`, line ranges, token estimates, and algorithm ids

#### Scenario: Oversize mixed with clean persists exclusions and entries
- **WHEN** automated tests include one oversize candidate and one clean candidate
- **THEN** the tests pass by demonstrating HTTP 201 with the oversize path excluded as `unscannable_content` and the clean path present in `entries`

#### Scenario: Sole oversize candidate blocks without a row
- **WHEN** automated tests create a bundle whose only candidate is oversize
- **THEN** the tests pass by demonstrating HTTP 422 `unsafe_context_bundle` with required safe counts and zero `ContextBundle` rows

#### Scenario: Same-bytes single-open invariant is demonstrated
- **WHEN** automated unit or integration tests spy filesystem open/read during bundle create and mutate the repository file after the first read
- **THEN** the tests pass by demonstrating a single open/read for the clean path, same byte object consumption across detect/hash/line/token, and no second read of the mutated path

#### Scenario: Construction and Prisma failures map to context_bundle_failed
- **WHEN** automated tests inject hash/token/canonicalization failure or Prisma insert failure during create
- **THEN** the tests pass by demonstrating HTTP 500 `context_bundle_failed` with no persisted or partial row

#### Scenario: Shared context-bundle unions are covered
- **WHEN** shared-contracts tests validate ok bundles, unsafe-with-counts, non-unsafe-without-counts, removed blocked codes, and ambiguous context-bundle payloads
- **THEN** valid payloads are accepted and invalid conditional fields, removed codes, or forbidden body fields are rejected

#### Scenario: Web context-bundle outcomes are covered
- **WHEN** web tests exercise the context-bundle surface with mocked idle, loading, success, empty, unsafe blocked, and error responses
- **THEN** idle, loading, success, empty, unsafe counts-only, and blocked/error outcomes are demonstrated without rendering file contents or transmission flags

### Requirement: Disclosure preview and approval success and blocked paths are covered by automated tests
Automated tests MUST demonstrate a successful disclosure path (create bundle → preview creates metadata-only session with ephemeral excerpts → status `approvalRequired` true → approve with `previewSessionId` → status `approvalRequired` false → latest approval with `contentTransmitted` false and both policy ids) and the blocked/failure matrix required by `context-preview-and-approval`. Coverage MUST include: approval without `previewSessionId` → `disclosure_preview_required` and no approval row; expired preview → `disclosure_preview_expired` and no approval row; session for another bundle/project → binding/required rejection and no approval row; changed `previewPolicyId` → `disclosure_preview_policy_mismatch`; mutate file after preview before approve → `disclosure_preview_integrity_mismatch` and no approval row; unchanged file → approval succeeds; coverage invalidation when `previewPolicyId` or `approvalPolicyId` changes; full-file excerpt preserves original CRLF/text exactly; multiple-range canonical extraction; invalid persisted ranges block with no session; `previewIntegrityHash` stable for identical material and changes when excerpt changes; preview session stores no excerpt/body/raw bytes; failed preview creates no session; failed approval creates no approval row; `ContextBundle` remains immutable and free of `contentTransmitted`; type guards require approval `contentTransmitted === false` and reject it on bundle/preview DTOs; and web idle/loading/success/empty/blocked outcomes for preview and approval with Spanish copy, both policy ids, and the 20-entry display cap. Existing registration, configuration, discovery, dashboard, resolve, secret-scan, context-bundle, health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Preview then approve success path is demonstrated
- **WHEN** automated API or integration tests preview and approve a valid bundle with unchanged live files
- **THEN** the tests pass by demonstrating HTTP 200 preview with a persisted metadata-only session, HTTP 201 approval with both policy ids and `contentTransmitted` false, and no mutation of the `ContextBundle` row

#### Scenario: Approval without preview is rejected
- **WHEN** automated tests approve without a valid `previewSessionId`
- **THEN** the tests pass by demonstrating HTTP 422 `disclosure_preview_required` and zero approval rows

#### Scenario: Expired preview and post-preview mutation are rejected
- **WHEN** automated tests approve an expired session or mutate a file after preview before approve
- **THEN** the tests pass by demonstrating the corresponding expired or integrity mismatch code and zero approval rows

#### Scenario: Canonical extraction and integrity hash matrix is demonstrated
- **WHEN** automated unit or integration tests exercise full-file CRLF preservation, multi-range concatenation, invalid ranges, and hash stability/sensitivity
- **THEN** the tests pass by demonstrating exact excerpt rules, blocked invalid ranges without sessions, stable hashes for identical material, and changed hashes when excerpts change

#### Scenario: Preview session persistence excludes bodies
- **WHEN** automated tests inspect a successful preview-session database row
- **THEN** the tests pass by demonstrating absence of excerpts, file bodies, decoded text, and raw bytes in persisted columns

#### Scenario: Shared disclosure contracts are covered
- **WHEN** shared-contracts tests validate preview ok, approval ok with `contentTransmitted` false, approval request requiring `previewSessionId`, and rejection of `contentTransmitted` true or bundle transmission flags
- **THEN** valid payloads are accepted and invalid shapes are rejected

#### Scenario: Web disclosure outcomes are covered
- **WHEN** web tests exercise the disclosure surface with mocked idle, loading, success, empty, blocked, and error responses
- **THEN** idle, loading, success, empty, and blocked/error outcomes are demonstrated with both policy ids visible and without DeepSeek send controls

### Requirement: DeepSeek gateway probe success and blocked paths are covered by automated tests
Automated tests MUST cover DeepSeek gateway probe success with a fake port and at least the following blocked or failure paths with reproducible evidence under this change: default `discovery` and all four `DeepseekProbeStage` routes; rejection of `new`, unknown stages, and extra fields; exact outbound body constants; valid one-choice `finish_reason` `stop`; empty content; missing choices/message/content; multiple choices; `finish_reason` `length`; invalid provider envelope JSON; invalid content JSON; local schema mismatch; returned model mismatch; response body over 65536 bytes; no retry for semantic/envelope failures; exact retry attempts/delays for network, timeout, 429, 500, and 503 using injected clock/sleeper; `Retry-After` cap; no retry for 400/401/402/403/422; `deepseek_insufficient_balance` and `deepseek_provider_unavailable` classification; `attemptCount` and total `latencyMs` semantics; missing key makes zero HTTP attempts; API key never appears in logs, DTOs, or evidence; probe never reads repository, bundle, or disclosure data. Web tests MUST cover idle/loading/success/blocked probe outcomes. Shared-contracts tests MUST cover probe DTO guards including rejection of `stage` `new`.

#### Scenario: Probe success path is covered with a fake port
- **WHEN** automated API tests exercise a successful structured probe against a fake DeepSeek port
- **THEN** the ok contract including `attemptCount`, `providerHttpStatus` 200, and `deepseek-gateway-probe-v1` parsed body is asserted

#### Scenario: Stage validation matrix is covered
- **WHEN** automated tests exercise default discovery, all four stages, and rejection of `new`/unknown/extra fields
- **THEN** assertions prove the binding stage rules without live DeepSeek network calls

#### Scenario: Retry and classification matrix is covered without real waits
- **WHEN** automated tests exercise transient retries and terminal classifications with an injected sleeper
- **THEN** attempt counts, delays, and closed codes match the design matrix and tests do not sleep in real time

#### Scenario: Secret and isolation safety is covered
- **WHEN** automated tests exercise missing-key and success/failure logging/DTO capture
- **THEN** zero HTTP attempts occur when the key is missing, the API key never appears in artifacts, and no repository/bundle/disclosure reads are performed
