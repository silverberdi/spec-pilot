## Context

Wave `w02-s01-context-source-resolution` is archived: SpecPilot can resolve a deterministic, stage-scoped candidate path set via `POST /projects/:id/context-sources/resolve` with picomatch include/exclude, defensive mandatory secret-*path* excludes, `lstat` symlink policy, and ephemeral path-only results (no content reads). Path-level excludes keep `.env` / keys / `secrets/` out of the candidate set, but any secret that lives *inside* an otherwise included source file still passes resolve as “ok.”

Slice `w02-s02-secret-detection-and-exclusion` adds a fail-closed **content** safety gate on that candidate set: detect secret-bearing text, exclude unsafe paths from the eligible context set, and block the bundle when exclusion leaves insufficient evidence. Stakeholders: SpecPilot operator (approvals); Cursor (sole implementer). Main-only working policy remains binding. This capability is distinct from SpecPilot’s own repository CI scanner (`scripts/scan-secrets.py` / `baseline-validation-and-secret-scanning`).

## Goals / Non-Goals

**Goals:**

- Consume the resolved candidate path set for a registered project and review stage (`new` | `planning` | `applied` | `verify`) and scan candidate **file contents** for secret-bearing patterns plus bounded entropy/credential heuristics.
- Exclude finding paths (and unscannable/oversize paths) from the eligible context set; return safe finding metadata only (never raw secret values, match snippets, offsets, line numbers, or surrounding context).
- Block the bundle as unsafe when a non-empty candidate set is fully eliminated by exclusions/findings (insufficient remaining evidence), or when the scan cannot complete safely.
- Fail closed on missing project/configuration, resolve failure, unreadable candidates, detector errors, or bound breaches; never present a partial or incomplete scan as a safe eligible set.
- Remain read-only toward target repositories; no DeepSeek / external transmission; no Git/OpenSpec/delivery execution from SpecPilot.
- Expose shared contracts plus NestJS API and a minimal Spanish-first Angular surface for scan outcomes (success with eligible set, empty, blocked unsafe, loading, error).
- Deliver deterministic automated evidence for clean success and at least one blocked unsafe/failure path; keep quality gates green without weakening repo-level secret scanning.
- Update docs/context inventory and package summary as needed.

**Non-Goals:**

- Immutable context-bundle manifests, content hashes, selected line ranges as durable audit, or token estimates (`w02-s03`).
- Context preview UI that displays file contents, or approval gates before runs (`w02-s04`).
- Expanding `schemaVersion: 1` or changing portable `project.yaml` context patterns (consume resolve + existing configuration).
- Persisting scan/audit rows (ephemeral scan only; later slices own durable manifests/audit).
- DeepSeek product API calls, review runs, findings ledger as product evidence, budget ledger, prompts.
- Editing target repositories; executing delivery/Git write/OpenSpec workflows from SpecPilot.
- Authentication/multiuser; Windows/Linux support; remote repos without local checkout.
- Weakening SpecPilot repo-level `baseline-validation-and-secret-scanning` / quality gates to pass fixtures.
- Accepting client-supplied path lists as scan input (clients MUST NOT dictate which files are scanned).
- In-file redaction that returns sanitized file bodies; exclusion is path-level omit only in this slice.
- MIME detection, extension allowlists, or additional binary heuristics beyond NUL-byte classification in this slice.
- Editing OpenSpec-generated integrations except via `openspec update`.

## Decisions

### D1 — Ephemeral scan (no persistence)

Scan results are compute-on-demand. Do **not** add Prisma columns/tables for scan outcomes, findings, or eligible sets in this slice.

| Concern | Approach |
|---|---|
| Freshness | Every scan re-resolves candidates then re-reads file bytes |
| Later slices | `w02-s03` owns durable manifests/hashes/tokens; this slice returns the live eligible set + safe finding summary |
| Operator UX | Explicit scan action; no stale “last scanned” DB field |

- *Alternative considered:* persist latest scan JSON on `Project`. Rejected — durable form belongs to future manifest/audit (`w02-s03`), not a second snapshot type; also raises secret-metadata retention risk.
- *Alternative considered:* immutable scan version rows. Rejected — out of scope; duplicates future audit.

### D2 — Scan always starts from internal resolve (never trust client paths)

`POST .../secret-scan` accepts only `{ stage: ReviewStage }`. The service MUST:

1. Invoke the existing `ContextSourceResolutionService.resolve(projectId, stage)` (or equivalent in-process port).
2. If resolve returns blocked/404/500 semantics, **propagate** that outcome (same HTTP mapping / codes) and **do not** scan.
3. If resolve returns `ok` (including empty `paths`), proceed to content scan over that `paths` array only.

Do **not** accept a client-provided `paths[]`. Do **not** re-walk with different include/exclude rules than resolve.

- *Alternative considered:* client posts resolved paths. Rejected — path injection / bypass of resolve containment and mandatory excludes.
- *Alternative considered:* require the UI to call resolve then scan. Rejected for API safety — server must re-resolve even if UI already resolved; UI may still call resolve separately for path-list UX.

### D3 — Exclusion vs block policy (binding)

Architecture requires both exclusion and unsafe-bundle blocking. Binding rules:

| Condition | Outcome |
|---|---|
| Resolve `ok` with `pathCount === 0` | Scan **200** `ok`; `eligiblePaths: []`; `findings: []`; `unscannable: []`; empty success (nothing to scan) |
| All scanned candidates clean | **200** `ok`; `eligiblePaths` = full candidate `paths` preserving exact resolver order |
| One or more secret findings and/or unscannable exclusions, and ≥1 path remains eligible | **200** `ok`; `eligiblePaths` = candidates with excluded paths removed, preserving exact resolver order; `findings` / `unscannable` per D6.1 ordering |
| Candidates `candidatePathCount ≥ 1` and after exclusions `eligiblePaths.length === 0` | **422** `blocked` with `code: 'unsafe_context_bundle'` and required safe counts only (D6.2) |
| Incomplete scan (unreadable mid-scan, detector throw, bound exceed, timeout) | **422** / **500** per D5–D7 — **no** partial “ok” eligible set |

**Path-level omit only:** do not return redacted file contents. A finding on a file excludes the **entire** repository-relative path from `eligiblePaths`.

**Unscannable files** (oversize / invalid UTF-8 / NUL binary per D5.2): exclude from `eligiblePaths` with reason `unscannable_content` (not a secret finding). They count toward the “excluded” set for the empty-eligible block rule above.

- *Alternative considered:* block on any secret finding even if other clean files remain. Rejected for this slice name (“exclusion”); later preview/approval (`w02-s04`) can raise the bar before transmission. Empty-after-exclude remains hard-block.
- *Alternative considered:* keep unscannable files in eligible set. Rejected — unknown binary may hide secrets; fail closed by excluding them.
- *Alternative considered:* in-file line redaction. Rejected — `w02-s03`/`w02-s04` territory; path omit is sufficient and safer for API responses.

### D4 — Detector set (binding, local-only, executable)

Implement detectors in TypeScript inside `apps/api` (pure helpers unit-testable without Nest). Do **not** shell out to `scripts/scan-secrets.py` (that tool is SpecPilot-repo CI, has different allowlists/paths, and must not be weakened for product fixtures). Product scan allowlist is empty in this slice.

#### D4.1 — Closed pattern detectors (executable regex semantics)

Run **all** closed pattern detectors for every scannable text file. Regex semantics MUST be exactly:

| `detectorId` | Regex |
|---|---|
| `aws_access_key` | `/AKIA[0-9A-Z]{16}/g` |
| `generic_api_key_assignment` | `/(api[_-]?key\|secret\|token\|password)\s*[:=]\s*['"][^'"\r\n]{12,}['"]/gi` |
| `private_key_block` | `/-----BEGIN (?:RSA \|EC \|OPENSSH )?PRIVATE KEY-----/g` |
| `github_pat` | `/ghp_[A-Za-z0-9]{36}/g` |
| `slack_token` | `/xox[baprs]-[A-Za-z0-9-]{10,}/g` |

#### D4.2 — Bounded entropy heuristic (executable)

| Parameter | Binding |
|---|---|
| Candidate runs | `/[A-Za-z0-9+/=_-]{32,}/g` |
| Metric | Shannon entropy over the token’s character multiset |
| Threshold | Entropy **≥ 4.5** bits/char → positive entropy match |
| Cap | Stop further entropy **candidate processing** after **20** positive entropy matches in one file; pattern detectors still execute fully |

#### D4.3 — Finding emission and deduplication (binding)

- Never place matched text, offsets, snippets, line numbers, or surrounding context in DTOs or logs.
- Deduplicate findings to **at most one** `SecretFindingDto` per `(path, detectorId)`.
- A path MAY have multiple findings when different detector IDs trigger.
- The entropy processing cap is internal; the DTO still has **at most one** `high_entropy_token` finding per path.
- Any finding for a path excludes that entire path from `eligiblePaths`.

- *Alternative considered:* reuse Python scanner via subprocess. Rejected — platform/process coupling, weaker Nest testability, risk of conflating CI and product scanners.
- *Alternative considered:* third-party secret-scanning SaaS or npm “detect-secrets” with network. Rejected — local-first; prefer first-party patterns + entropy for this slice.
- *Alternative considered:* configurable per-project detector toggles in YAML. Rejected — no schema expansion; fixed closed set for determinism.

### D5 — Safe open, classification, decode, and scan bounds (binding)

#### D5.1 — Path revalidation and open (TOCTOU-resistant)

Each candidate path comes from internal resolve but MUST be revalidated before open:

Reject **before** open with **422** `context_path_escape` when the repository-relative path is:

- absolute;
- has leading `./`;
- contains a backslash `\`;
- contains a `..` path segment;
- contains a NUL byte.

Then:

1. Build the filesystem path **only** by joining under the canonical `repositoryPath`.
2. Open with semantics equivalent to **`O_RDONLY | O_NOFOLLOW`**.
3. Do **not** use `readFile(path)` after a separate `realpath` check-then-open race.
4. `fstat` the **open file descriptor**.
5. Require the descriptor to represent a **regular file**.
6. Read bytes from that **same** descriptor only.
7. Close the descriptor in `finally`.

Map these to **422** `secret_scan_entry_unreadable` with **no** partial ok result:

- symlink encountered on open (`O_NOFOLLOW`);
- `ELOOP`;
- file disappeared;
- descriptor is a directory / non-regular after `fstat`;
- `EACCES` / `EPERM` during open / `fstat` / read;
- short or inconsistent read;
- unexpected read failure that is still an expected entry-level failure.

Do **not** follow, retry, or resolve to an alternate file. Escape detected **before** open remains **422** `context_path_escape`. Truly unexpected infrastructure errors map to **500** `secret_scan_failed`.

#### D5.2 — Exact scannable-content classification

After a successful open + `fstat` of a regular file:

1. Obtain `fileSize` from **`fstat` of the open descriptor**.
2. If `fileSize > 1048576`:
   - exclude as `unscannable_content`;
   - **do not** read partially;
   - **do not** run detectors;
   - do **not** add to `totalBytesRead` (contents were not read).
3. Else, before reading: if `totalBytesRead + fileSize > 52428800` → **422** `secret_scan_limit_exceeded`; no file read; no partial ok body.
4. Read the **complete** byte contents only for files within the per-file limit.
5. After reading, add the **exact** byte count read to `totalBytesRead`.
6. If bytes contain **at least one** `0x00` NUL byte → classify as binary → exclude as `unscannable_content`; do not run detectors; do not return/log bytes.
7. Else decode with semantics equivalent to `new TextDecoder('utf-8', { fatal: true })`.
8. Invalid UTF-8 → exclude as `unscannable_content`; do not run detectors.
9. Empty file (`fileSize === 0`): valid text, scannable, clean (no findings unless detectors somehow match empty string—they must not).
10. Never return or log the raw bytes or decoded text.

**Do not** add MIME detection, extension allowlists, or other binary heuristics in this slice. NUL-byte presence is the only binary classifier beyond size/UTF-8 rules.

#### D5.3 — Bound table

| Bound | Value | On exceed / violation |
|---|---|---|
| Per-file max size (`fstat`) | **1048576** (1 MiB) | Exclude `unscannable_content`; no partial read; no detectors; not counted in `totalBytesRead` |
| Max total bytes read | **52428800** (50 MiB) | **422** `secret_scan_limit_exceeded` checked **before** reading an eligible-size file when `totalBytesRead + fileSize` would exceed; no partial ok |
| Max scan wall time | **30000** ms **excluding** resolve time | **422** `secret_scan_timeout`; no partial eligible set |

Deadline checks MUST run:

- before opening each file;
- after each file read;
- during detector loops where practical.

#### D5.4 — Privacy of scanned material

Never log or return file contents, decoded text, matched text, offsets, snippets, line numbers, or surrounding context.

- *Alternative considered:* stream and scan without size cap. Rejected — DoS / memory risk.
- *Alternative considered:* truncate and scan first 1 MiB of huge files. Rejected — secrets past the window would be missed; exclude whole file as unscannable instead.
- *Alternative considered:* `stat` then `readFile` after realpath. Rejected — TOCTOU; binding open is `O_RDONLY|O_NOFOLLOW` + `fstat` on the same fd.
- *Alternative considered:* MIME / extension binary heuristics. Rejected — out of scope for this slice; NUL + UTF-8 fatal only.

### D6 — Response contract (binding)

Shared contracts in `packages/shared-contracts`:

```ts
type ReviewStage = 'new' | 'planning' | 'applied' | 'verify'; // reuse

type SecretDetectorId =
  | 'aws_access_key'
  | 'generic_api_key_assignment'
  | 'private_key_block'
  | 'github_pat'
  | 'slack_token'
  | 'high_entropy_token';

type SecretFindingDto = {
  path: string; // repository-relative
  detectorId: SecretDetectorId;
  // NO matchedValue, NO snippet, NO offsets, NO line numbers, NO surrounding context
};

type UnscannablePathDto = {
  path: string;
  reason: 'unscannable_content';
};

type SecretScanOkDto = {
  status: 'ok';
  projectId: string;
  stage: ReviewStage;
  configurationVersionId: string;
  sourceHash: string;
  scannedAt: string; // ISO-8601
  candidatePathCount: number; // from internal resolve result
  eligiblePathCount: number; // MUST equal eligiblePaths.length
  eligiblePaths: string[]; // resolver order with excluded paths removed; empty only when candidatePathCount === 0 on ok, or never when unsafe-blocked
  findings: SecretFindingDto[]; // deduped; never includes secret values
  unscannable: UnscannablePathDto[];
};

type SecretScanBlockedCode =
  | 'unsafe_context_bundle'
  | 'secret_scan_limit_exceeded'
  | 'secret_scan_timeout'
  | 'secret_scan_entry_unreadable'
  // plus resolve-propagated blocked codes (same closed union as ContextSourceResolveBlockedCode)
  | ContextSourceResolveBlockedCode;

type SecretScanBlockedDto = {
  status: 'blocked';
  projectId: string;
  stage: ReviewStage | null;
  code: SecretScanBlockedCode;
  message: string;
  // REQUIRED iff code === 'unsafe_context_bundle'; ABSENT for all other blocked codes:
  candidatePathCount?: number;
  findingCount?: number;
  unscannableCount?: number;
  // NEVER include eligiblePaths, finding paths, detector details, unscannable paths,
  // matched values, snippets, or file contents
};

type SecretScanDto = SecretScanOkDto | SecretScanBlockedDto;
```

#### D6.1 — Deterministic response ordering (binding)

- `eligiblePaths`: preserve the **exact resolver order** after excluded paths are removed (do **not** re-sort).
- `findings`: sort by `path` using exact JS `a < b` ordering; ties broken by detector order:
  1. `aws_access_key`
  2. `generic_api_key_assignment`
  3. `private_key_block`
  4. `github_pat`
  5. `slack_token`
  6. `high_entropy_token`
- `unscannable`: sort by `path` using exact JS `a < b` ordering.
- `candidatePathCount` comes from the internal resolve result.
- `eligiblePathCount` MUST equal `eligiblePaths.length`.
- `findingCount` (unsafe block) counts **deduplicated** `SecretFindingDto` entries.
- `unscannableCount` (unsafe block) counts **unique** excluded unscannable paths.

#### D6.2 — `unsafe_context_bundle` response invariants (binding)

When `candidatePathCount >= 1` and `eligiblePaths` becomes empty:

- Return **422** `SecretScanBlockedDto`.
- `code = 'unsafe_context_bundle'`.
- Include **only** the three required safe counts: `candidatePathCount`, `findingCount`, `unscannableCount`.
- Do **not** include: `eligiblePaths`, finding paths, detector details, unscannable paths, matched values, snippets, or file contents.
- Those three count fields are **required** for `unsafe_context_bundle` and **absent** for all other blocked codes.
- Type guards MUST enforce these conditional fields (reject missing counts on unsafe; reject present counts on other blocked codes).
- `message` MAY state that all candidates were excluded due to secrets/unscannable content **without** listing paths.

**HTTP mapping:**

| Outcome | HTTP | Body |
|---|---|---|
| Clean or partially excluded with remaining eligible (or empty candidates) | **200** | `SecretScanOkDto` |
| Unknown project | **404** | `ProjectErrorResponse` `project_not_found` |
| Resolve blocked codes / pre-open path escape | **422** | `SecretScanBlockedDto` with same resolve / `context_path_escape` code |
| Unsafe empty-after-exclude / scan limits / timeout / unreadable mid-scan | **422** | `SecretScanBlockedDto` |
| Unexpected infra | **500** | `ProjectErrorResponse` `secret_scan_failed` (new); safe message; no paths/contents/stacks |

Notes:

- `secret_scan_failed` is **only** a 500 code; not in the 422 blocked union.
- Type guards MUST reject unknown detector ids, unknown blocked codes, forbidden fields (`matchedValue`, `snippet`, offsets, line numbers), and violated conditional count fields.

- *Alternative considered:* always HTTP 200 with status discriminant. Rejected — align with resolve’s 422 refusal model for expected blocks.
- *Alternative considered:* return match snippets redacted. Rejected — redaction bugs leak secrets; path + detectorId is enough.
- *Alternative considered:* include finding paths on unsafe block for operator UX. Rejected — counts only; reduces path amplification in error channels.

### D7 — API surface

#### `POST /projects/:id/context-sources/secret-scan`

Request body:

```ts
{ stage: ReviewStage }
```

Behavior: parse/validate stage → resolve in-process → scan per D4–D5 → return D6.

No `GET` last-scan endpoint. Operators re-POST to refresh.

Error mapping summary:

| Condition | HTTP | Code |
|---|---|---|
| Unknown `projectId` | 404 | `project_not_found` |
| Resolve refusals | 422 | existing resolve blocked codes |
| Invalid relative path before open | 422 | `context_path_escape` |
| All candidates excluded (findings and/or unscannable) | 422 | `unsafe_context_bundle` |
| Total byte bound would be exceeded | 422 | `secret_scan_limit_exceeded` |
| Scan wall-time bound | 422 | `secret_scan_timeout` |
| Symlink / ELOOP / missing / non-regular / EACCES / EPERM / short read mid-scan | 422 | `secret_scan_entry_unreadable` |
| Unexpected infra | 500 | `secret_scan_failed` |

- *Alternative considered:* nest under `/security/scan`. Rejected — keep under context-sources pipeline beside resolve.
- *Alternative considered:* combine resolve+scan into one endpoint replacing resolve. Rejected — resolve remains useful alone for path UX; scan is an explicit safety step.

### D8 — Modular monolith boundaries

Implement inside existing `apps/api` `ProjectsModule`:

- `SecretDetectionService` (or equivalent): `scan(projectId, stage)` orchestrates resolve → safe open/read → detect → exclude/block
- Pure detector helpers (`detectSecretsInText`, entropy) unit-testable without Nest / without filesystem
- Thin fd-based reader adapter with D5.1 containment + `O_RDONLY|O_NOFOLLOW` + `fstat`
- Reuse `ContextSourceResolutionService` as an in-process dependency (port if needed for tests)
- Shared DTOs/type guards in `packages/shared-contracts`
- No new Nx domain package; boundaries unchanged (web → shared-contracts only; API must not import web)
- No new runtime dependency required if first-party detectors suffice; if a pinned helper is added, regenerate `package-summary.json`

- *Alternative considered:* new `SecurityModule`. Deferred — single consumer under projects until a second consumer appears.

### D9 — Minimal Angular scan outcomes

Extend the existing Spanish-first console (same project + stage selection as resolve):

- Action “Analizar secretos en fuentes” (or equivalent) when a project and stage are selected.
- On success: show stage, `candidatePathCount`, `eligiblePathCount`, `sourceHash` short prefix, finding count, unscannable count; list eligible paths with display cap **200** (same pattern as resolve); list findings as `path` + `detectorId` only (cap **50** displayed); MUST NOT show file contents or secret values.
- On `unsafe_context_bundle`: show `message` plus the three safe counts only.
- States: idle, loading, success (including empty candidates), success-with-exclusions (findings/unscannable non-empty but eligible remain), blocked/error (`message`/`code`).
- Copy clarifies this is local secret detection—not preview, approve, or send to DeepSeek.

- *Alternative considered:* API-only. Rejected — US-003 requires operator-visible console outcomes.
- *Alternative considered:* reuse resolve button to always scan. Rejected — keep resolve and scan as distinct operator actions.

### D10 — Test strategy and evidence

Jest + existing Testcontainers PostgreSQL pattern:

1. **Unit — pattern detectors:** each `detectorId` positive fixture against the binding regexes in D4.1; clean text negative; ensure return shape has no secret substring / offset / line fields; dedupe to one finding per `(path, detectorId)`.
2. **Unit — entropy:** high-entropy token ≥32 chars triggers; low-entropy repeated chars do not; stop entropy candidate processing after 20 positives; DTO still ≤1 `high_entropy_token` per path; pattern detectors still run fully.
3. **Unit — exclusion policy:** finding excludes path; mixed clean+dirty → ok with reduced eligible preserving resolver order; all dirty → unsafe block with required counts; unscannable excludes without being a finding.
4. **Unit — classification (D5.2):** empty file → clean scannable; `fileSize > 1048576` via fstat → unscannable, no read, not in `totalBytesRead`; NUL byte → unscannable; invalid UTF-8 (`TextDecoder` fatal) → unscannable; no MIME/extension heuristics.
5. **Unit — safe open / TOCTOU (D5.1):** absolute / `./` / `\` / `..` / NUL path → `context_path_escape` before open; `O_NOFOLLOW` symlink / ELOOP / missing / non-regular / EACCES → `secret_scan_entry_unreadable`; no `readFile`-after-realpath pattern; fd closed in finally.
6. **Unit — limit accounting (D5.3):** oversize unscannable does not increase `totalBytesRead`; pre-read `totalBytesRead + fileSize` overflow → `secret_scan_limit_exceeded` without reading; deadline checks before open / after read → `secret_scan_timeout` with no partial ok.
7. **Unit — ordering (D6.1):** eligiblePaths preserve resolver order; findings path-then-detector order; unscannable path order; `eligiblePathCount === eligiblePaths.length`.
8. **API/integration:** attached config + clean fixture tree → 200 ok eligible equals candidates; planted secret in included file → ok-with-exclusion or 422 `unsafe_context_bundle` per D3/D6.2 (counts required, paths absent on unsafe); no configuration → resolve-propagated 422; unknown project → 404; invalid stage → 422; injected infra failure → 500 `secret_scan_failed` without content leakage.
9. **Web:** idle/loading/success/blocked; findings show detectorId only; unsafe shows counts only; no content fetch; display caps honored.
10. Quality gates must `PASS`; do **not** weaken `scripts/scan-secrets.py`. Product test fixtures with fake secrets MUST live under clearly labeled temp dirs / change `evidence/` quarantine patterns already respected by the repo scanner—not in tracked source that the CI scanner would fail.
11. Capture evidence under this change’s `evidence/`.

Integration fixtures SHOULD use temporary directories with a minimal `.specpilot/project.yaml` and small file trees—avoid depending on the SpecPilot monorepo itself as the only fixture.

### D11 — Security, privacy, observability

- Read candidate bytes only for local detection via D5.1 fd open; never transmit to DeepSeek or any external network from this slice.
- Never persist, log, or return raw secret values, matched text, offsets, snippets, line numbers, surrounding context, decoded text, or file bodies.
- Log project id, stage, error `code`, candidate/eligible/finding/unscannable counts on completion; do not log path lists at info if large; never log file contents or detector match text.
- Absolute `repositoryPath` remains DB-only; client errors MUST NOT leak stacks or absolute host paths beyond existing messaging style.
- Pre-open relative-path validation + `O_RDONLY|O_NOFOLLOW` + same-fd `fstat`/read closes TOCTOU symlink/replacement races without following alternate targets.
- Oversize unscannable exclusions do not inflate `totalBytesRead`; total-byte enforcement is pre-read fail-closed.
- Reuse Compose authorized read-only host root — no new mount policy.
- No authentication change; no repository mutation; no Git subprocesses.
- Keep SpecPilot CI secret scanner independent and unweakened.

### D12 — Relationship to later Wave 2 slices

| Later slice | Consumes this slice as |
|---|---|
| `w02-s03` | `eligiblePaths` (+ later content selection) to build immutable manifests/hashes/tokens |
| `w02-s04` | Eligible/manifest set for operator preview/approval before disclosure |

This slice MUST NOT implement manifests, token estimates, content preview, or approval “early.”

### D13 — Docs and lifecycle

Update `docs/context/**` and package summary if dependencies change. Document operator secret-scan flow and the distinction from repo CI scanning. Sync/archive only after Verify exactly `PASS` with operator approval.

## Risks / Trade-offs

- [False positives from entropy / generic assignment patterns] → Closed executable detector set + thresholds; unit fixtures; path omit (not snippet return); operators see detectorId; tune only with evidence in a later change if needed.
- [False negatives (novel secret formats)] → Accepted for this slice; patterns aligned with baseline scanner family; not a guarantee of perfect detection; fail closed on unscannable.
- [Large repos / many files] → Inherit resolve bounds; add read byte + time bounds with exact pre-read total accounting; fail closed on exceed.
- [TOCTOU between resolve and read] → Revalidate relative path; `O_RDONLY|O_NOFOLLOW` + same-fd `fstat`/read; mid-scan failures → 422 `secret_scan_entry_unreadable`; no partial ok; no follow/retry.
- [Operators expecting file preview] → UI copy + Non-Goals; paths/detector ids only.
- [Planted secrets in tracked fixtures trip CI scanner] → Use temp dirs / evidence quarantine; never commit live secret-like fixtures into scanned tracked paths without quarantine.
- [Scope creep into manifests/preview/DeepSeek] → Explicit Non-Goals; tasks reject hash/token/preview/provider calls.
- [Block-only-when-empty feels soft vs block-on-any-finding] → Documented trade-off; `w02-s04` can require approval before send; empty-after-exclude remains hard block with counts-only body.
- [Duplicate resolve cost when UI already resolved] → Accepted for safety; scan always re-resolves server-side.
- [NUL-only binary heuristic misses some binaries without NUL] → Accepted; invalid UTF-8 still excludes; MIME/extension heuristics deferred.

## Migration Plan

1. Add shared-contracts secret-scan DTOs, blocked-code union extensions, conditional `unsafe_context_bundle` count fields + type guards, and `secret_scan_failed` on `ProjectErrorResponse`.
2. Implement pure detectors (D4 executable regexes + entropy) + fd-based reader (D5) helpers; add `SecretDetectionService` in `ProjectsModule` wiring resolve → scan (no Prisma migration).
3. Add `POST /projects/:id/context-sources/secret-scan`.
4. Extend Angular console with secret-scan action and outcomes (Spanish-first; display caps; unsafe counts).
5. Add unit + Testcontainers + web tests covering D10; write `evidence/` artifacts with safe fixtures.
6. Run `npm run quality-gates`; update docs/context and package summary as needed.
7. Operator-approved commit/push on `main` after reported validations.
8. Operator-approved Verify exactly `PASS`, sync, archive.

**Rollback:** revert slice commits on `main`; no DB migration to roll back for this slice; never touch foreign Docker resources (e.g. `axioma-db-dev`).

## Open Questions

None blocking for APPLY_READY. Detector threshold tuning (`high_entropy_token` 4.5 / length 32) may be revisited only with deterministic false-positive evidence after implementation—not as deferred acceptance criteria.
