## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Shared same-bytes engine preserves oversize unscannable semantics
The shared scanning engine used by public secret scan and context-bundle create MUST preserve exact oversize classification: when `fileSize > 1048576`, classify as `unscannable_content`, do not read bytes, do not run detectors, do not produce clean-byte material, do not increment `totalBytesRead`, and exclude the path. Public secret-scan HTTP behavior for oversize, total-byte overflow, timeout, unreadable entries, and `unsafe_context_bundle` MUST remain unchanged.

#### Scenario: Oversize remains unscannable on public scan
- **WHEN** public secret scan encounters a candidate with `fileSize` greater than 1048576
- **THEN** the path is excluded as `unscannable_content` without reading contents and without counting toward `totalBytesRead`
