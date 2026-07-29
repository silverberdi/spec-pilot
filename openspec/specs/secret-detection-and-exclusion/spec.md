# secret-detection-and-exclusion

## Purpose

Scan resolved stage candidate paths for secret-bearing content; exclude unsafe or unscannable paths from the eligible context set; block unsafe bundles when exclusion leaves insufficient evidence; remain read-only and never expose raw secrets.

## Requirements

### Requirement: Scan resolved candidates for secret content and compute eligible paths
The system SHALL scan the internally resolved candidate path set for a registered project and requested review stage for secret-bearing content, exclude unsafe or unscannable paths from the eligible context set, and block the bundle when exclusion leaves insufficient evidence. Review stages MUST be exactly the closed union `new` | `planning` | `applied` | `verify`. The scan request body MUST be exactly `{ stage: ReviewStage }` and MUST NOT accept a client-supplied `paths` array. The service MUST invoke context-source resolution in-process for that project and stage; if resolve fails, the scan MUST propagate resolve HTTP mapping and codes and MUST NOT scan. Scan results MUST be ephemeral (no Prisma persistence of scan outcomes, findings, or eligible sets). The public secret-scan HTTP surface MUST remain read-only toward the target repository and MUST NOT transmit payloads to DeepSeek or any external provider, execute Git or OpenSpec delivery commands, mutate repository files, return clean-byte material, build or persist immutable manifests, estimate tokens on the public response, preview file contents, or require approval gates. Internals MAY be refactored into a shared same-bytes scanning engine that exposes ephemeral clean-file material only to trusted in-process consumers such as `context-bundle-manifest`, without changing public secret-scan HTTP behavior.

#### Scenario: Clean candidates return eligible paths equal to resolve paths
- **WHEN** an operator runs a secret scan for a registered project with active configuration whose resolved candidates contain only clean scannable text
- **THEN** the system returns HTTP 200 with `status` `ok`, `eligiblePaths` equal to the resolve `paths` in the same order, `eligiblePathCount` equal to `eligiblePaths.length`, empty `findings`, and empty `unscannable`

#### Scenario: Empty resolve candidates are empty success
- **WHEN** internal resolve returns `ok` with `pathCount` 0
- **THEN** the scan returns HTTP 200 with `status` `ok`, `candidatePathCount` 0, `eligiblePaths` empty, `findings` empty, and `unscannable` empty without opening files

#### Scenario: Partial exclusion with remaining eligible paths is success
- **WHEN** at least one candidate path has a secret finding or is unscannable and at least one other candidate remains eligible
- **THEN** the response is HTTP 200 `ok` with excluded paths omitted from `eligiblePaths` while preserving resolve order for remaining paths

#### Scenario: Client-supplied paths are not accepted
- **WHEN** a scan request includes any client path list field in addition to or instead of relying on internal resolve
- **THEN** the system MUST NOT use client paths as the scan input set

#### Scenario: Scan does not persist or mutate
- **WHEN** a successful or blocked scan completes
- **THEN** no scan snapshot table/column is written, `ProjectConfigurationVersion.normalizedConfig` is unchanged, and no files under the registered repository are created, modified, or deleted

#### Scenario: Public scan response omits clean bytes
- **WHEN** a secret scan completes successfully
- **THEN** the HTTP response does not include raw file bytes, decoded text, content hashes, line ranges, or token estimates

### Requirement: Propagate resolve refusals and require valid stage
Secret scan MUST fail closed before content reading when stage is missing/invalid, the project is unknown, or internal resolve returns a blocked or error outcome. Unknown projects MUST return HTTP 404. Resolve blocked codes MUST be returned as HTTP 422 `SecretScanBlockedDto` with the same resolve `code`.

#### Scenario: Unknown project returns 404
- **WHEN** `POST /projects/:id/context-sources/secret-scan` targets an unknown project id
- **THEN** the response is HTTP 404 with `code` `project_not_found`

#### Scenario: Invalid stage returns 422
- **WHEN** the request body omits `stage` or supplies a value outside `new` | `planning` | `applied` | `verify`
- **THEN** the response is HTTP 422 with blocked `code` `invalid_review_stage` and `stage` null

#### Scenario: Missing configuration propagates resolve block
- **WHEN** the project exists but has no active configuration version
- **THEN** the response is HTTP 422 with blocked `code` `configuration_not_found` and no candidate file contents are read

### Requirement: Enforce TOCTOU-resistant open and path revalidation
Each candidate path from resolve MUST be revalidated as repository-relative before open. The system MUST reject before open with HTTP 422 `context_path_escape` when the path is absolute, has leading `./`, contains a backslash, contains a `..` segment, or contains a NUL byte. The filesystem path MUST be built only under the canonical `repositoryPath`. Open MUST use semantics equivalent to `O_RDONLY | O_NOFOLLOW`. The system MUST NOT use `readFile(path)` after a separate realpath check-then-open. The system MUST `fstat` the open file descriptor, require a regular file, read from that same descriptor, and close the descriptor in `finally`. Symlink on open, `ELOOP`, disappeared file, non-regular after `fstat`, `EACCES`/`EPERM` during open/`fstat`/read, or short/inconsistent read MUST return HTTP 422 `secret_scan_entry_unreadable` with no partial ok result. The system MUST NOT follow, retry, or resolve to an alternate file.

#### Scenario: Invalid relative path is rejected before open
- **WHEN** a candidate path contains `..`, a backslash, leading `./`, is absolute, or contains NUL
- **THEN** the response is HTTP 422 with `code` `context_path_escape` and the file is not opened for scan

#### Scenario: Symlink or unreadable entry mid-scan blocks without partial ok
- **WHEN** open/`fstat`/read fails because the path is a symlink under `O_NOFOLLOW`, loops, is missing, is non-regular, or is permission-denied
- **THEN** the response is HTTP 422 with `code` `secret_scan_entry_unreadable` and no HTTP 200 eligible set is returned

### Requirement: Classify scannable content with exact size UTF-8 and NUL rules
After a successful open and `fstat`, `fileSize` MUST come from `fstat` of the open descriptor. If `fileSize > 1048576`, the path MUST be excluded as `unscannable_content` without partial read and without running detectors, and MUST NOT count toward `totalBytesRead`. Eligible-size files MUST be read completely. Bytes containing at least one `0x00` MUST be classified as binary and excluded as `unscannable_content` without detectors. Otherwise decode MUST use semantics equivalent to `new TextDecoder('utf-8', { fatal: true })`; invalid UTF-8 MUST be excluded as `unscannable_content`. An empty file MUST be treated as valid scannable clean text. The system MUST NOT use MIME detection, extension allowlists, or other binary heuristics in this change. Raw bytes and decoded text MUST NEVER be returned or logged.

#### Scenario: Oversize file is unscannable without reading contents
- **WHEN** `fstat` reports `fileSize` greater than 1048576
- **THEN** the path appears in `unscannable` with reason `unscannable_content`, detectors do not run, contents are not read, and `totalBytesRead` is not increased for that file

#### Scenario: NUL byte marks binary unscannable
- **WHEN** a within-limit file’s bytes contain at least one NUL `0x00`
- **THEN** the path is excluded as `unscannable_content` and detectors do not run

#### Scenario: Invalid UTF-8 is unscannable
- **WHEN** a within-limit file without NUL fails fatal UTF-8 decode
- **THEN** the path is excluded as `unscannable_content` and detectors do not run

#### Scenario: Empty file is clean scannable text
- **WHEN** a candidate regular file has `fileSize` 0
- **THEN** the path remains eligible unless other rules exclude it and is not marked unscannable solely for being empty

### Requirement: Enforce exact total-byte and wall-time scan bounds
Maximum total bytes read MUST be 52428800. Before reading an eligible-size file, if `totalBytesRead + fileSize > 52428800`, the system MUST return HTTP 422 `secret_scan_limit_exceeded` without reading that file and without a partial ok body. After a successful read, the exact byte count read MUST be added to `totalBytesRead`. Maximum scan wall time MUST be 30000 ms excluding resolve time. The deadline MUST be checked before opening each file, after each file read, and during detector loops where practical. Timeout MUST return HTTP 422 `secret_scan_timeout` with no partial eligible set.

#### Scenario: Total byte bound blocks before read
- **WHEN** reading the next eligible-size file would make `totalBytesRead + fileSize` exceed 52428800
- **THEN** the response is HTTP 422 with `code` `secret_scan_limit_exceeded`, that file is not read, and no ok body is returned

#### Scenario: Scan timeout blocks without partial ok
- **WHEN** the 30000 ms scan deadline excluding resolve time is exceeded
- **THEN** the response is HTTP 422 with `code` `secret_scan_timeout` and no partial eligible set is returned

### Requirement: Run closed detectors with binding regexes and deduplicated findings
For every scannable text file the system MUST run all closed pattern detectors with exactly these regex semantics: `aws_access_key` `/AKIA[0-9A-Z]{16}/g`; `generic_api_key_assignment` `/(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"\r\n]{12,}['"]/gi`; `private_key_block` `/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g`; `github_pat` `/ghp_[A-Za-z0-9]{36}/g`; `slack_token` `/xox[baprs]-[A-Za-z0-9-]{10,}/g`. Entropy detector `high_entropy_token` MUST consider candidate runs `/[A-Za-z0-9+/=_-]{32,}/g` with Shannon entropy ≥ 4.5 bits/char and MUST stop further entropy candidate processing after 20 positive entropy matches in one file while still running pattern detectors fully. Findings MUST deduplicate to at most one `SecretFindingDto` per `(path, detectorId)`, including at most one `high_entropy_token` per path. Matched text, offsets, snippets, line numbers, and surrounding context MUST NEVER appear in DTOs or logs. Any finding for a path MUST exclude that entire path from `eligiblePaths`. Product scan allowlist MUST be empty. The system MUST NOT shell out to SpecPilot’s repository CI secret scanner.

#### Scenario: Pattern detector excludes whole path
- **WHEN** a scannable file matches `github_pat` (or another closed pattern detector)
- **THEN** exactly one finding for that `(path, detectorId)` is emitted without match text and the path is omitted from `eligiblePaths`

#### Scenario: Findings are deduplicated per path and detector
- **WHEN** the same detector matches multiple times in one file
- **THEN** the ok `findings` array contains at most one entry for that `(path, detectorId)`

#### Scenario: Entropy cap does not suppress pattern detectors
- **WHEN** a file yields more than 20 positive entropy matches
- **THEN** entropy candidate processing stops after 20 positives, at most one `high_entropy_token` finding is emitted for the path, and pattern detectors still execute fully

### Requirement: Expose POST secret-scan with deterministic ordering and closed error contracts
The system MUST expose `POST /projects/:id/context-sources/secret-scan`. Successful scans MUST return HTTP 200 `SecretScanOkDto` including `candidatePathCount` from internal resolve, `eligiblePathCount` equal to `eligiblePaths.length`, `eligiblePaths` preserving exact resolve order after exclusions, `findings` sorted by path with exact JS `a < b` then detector order `aws_access_key`, `generic_api_key_assignment`, `private_key_block`, `github_pat`, `slack_token`, `high_entropy_token`, and `unscannable` sorted by path with exact JS `a < b`. When `candidatePathCount >= 1` and `eligiblePaths` is empty after exclusions, the system MUST return HTTP 422 `SecretScanBlockedDto` with `code` `unsafe_context_bundle` and required fields only `candidatePathCount`, `findingCount` (deduplicated findings count), and `unscannableCount` (unique unscannable paths); it MUST NOT include eligible paths, finding paths, detector details, unscannable paths, matched values, snippets, or file contents. Those three count fields MUST be absent for all other blocked codes. Other expected scan refusals MUST use HTTP 422 with `secret_scan_limit_exceeded`, `secret_scan_timeout`, `secret_scan_entry_unreadable`, `context_path_escape`, or propagated resolve blocked codes. Unexpected infrastructure failures MUST return HTTP 500 `ProjectErrorResponse` with `code` `secret_scan_failed`, a safe message, and MUST NOT leak contents, stacks, or absolute host paths. `secret_scan_failed` MUST NOT be a member of the HTTP 422 blocked-code union. The system MUST NOT provide a persisted last-scan GET endpoint in this change.

#### Scenario: Unsafe empty-after-exclude returns counts only
- **WHEN** resolve yields at least one candidate and every candidate is excluded by findings and/or unscannable classification
- **THEN** the response is HTTP 422 with `code` `unsafe_context_bundle` and required `candidatePathCount`, `findingCount`, and `unscannableCount`, without path or detector detail arrays

#### Scenario: Ok response ordering is deterministic
- **WHEN** a successful scan has mixed eligible paths, findings, and unscannable entries
- **THEN** `eligiblePaths` preserve resolve order, `findings` are path-then-detector ordered, `unscannable` are path-ordered, and `eligiblePathCount` equals `eligiblePaths.length`

#### Scenario: Unexpected infrastructure returns 500
- **WHEN** an unexpected infrastructure failure occurs during scan
- **THEN** the response is HTTP 500 with `code` `secret_scan_failed` and a safe message without file contents, match text, stack, or absolute host path leakage

### Requirement: Keep later Wave 2 and provider behaviors out of secret scan
The public secret-scan HTTP surface MUST NOT build immutable context-bundle manifests, persist `ContextBundle` rows, preview file contents to operators, require approval gates, or call DeepSeek. SpecPilot repository CI secret scanning MUST remain independent and MUST NOT be weakened to pass product fixtures. A shared same-bytes scanning engine used by secret scan MAY expose ephemeral clean-file material to trusted in-process `context-bundle-manifest` consumers; that reuse MUST NOT change public secret-scan request/response contracts or reopen secret-scan product Non-Goals beyond providing the shared engine.

#### Scenario: Public scan does not create manifests or call DeepSeek
- **WHEN** a secret scan completes successfully or blocked
- **THEN** no immutable bundle manifest is persisted by the public scan endpoint, and no content preview, approval gate, or DeepSeek/external provider call is performed

#### Scenario: Repository CI scanner remains unweakened
- **WHEN** product scan fixtures are introduced for this change
- **THEN** SpecPilot `baseline-validation-and-secret-scanning` / `scripts/scan-secrets.py` behavior is not weakened to ignore prohibited patterns in scanned tracked paths

#### Scenario: Shared engine may serve trusted in-process consumers
- **WHEN** `context-bundle-manifest` invokes the shared scanning engine in-process
- **THEN** ephemeral clean-byte material may be provided to that trusted consumer while public secret-scan HTTP responses still omit clean bytes

### Requirement: Shared same-bytes engine preserves oversize unscannable semantics
The shared scanning engine used by public secret scan and context-bundle create MUST preserve exact oversize classification: when `fileSize > 1048576`, classify as `unscannable_content`, do not read bytes, do not run detectors, do not produce clean-byte material, do not increment `totalBytesRead`, and exclude the path. Public secret-scan HTTP behavior for oversize, total-byte overflow, timeout, unreadable entries, and `unsafe_context_bundle` MUST remain unchanged.

#### Scenario: Oversize remains unscannable on public scan
- **WHEN** public secret scan encounters a candidate with `fileSize` greater than 1048576
- **THEN** the path is excluded as `unscannable_content` without reading contents and without counting toward `totalBytesRead`
