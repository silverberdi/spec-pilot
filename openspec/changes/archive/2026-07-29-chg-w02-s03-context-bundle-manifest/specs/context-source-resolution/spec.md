## MODIFIED Requirements

### Requirement: Keep Wave 2 later-slice behaviors out of resolve
Context-source resolution MUST NOT itself perform secret-content detection, build immutable context-bundle manifests, estimate tokens, preview file contents, require approval gates, or call DeepSeek. Secret-content detection and unsafe-bundle blocking remain owned by `secret-detection-and-exclusion`, which MAY invoke resolve in-process and consume its candidate path set. Context-bundle creation MAY depend on resolve only as the upstream path enumerator through that shared scanning pipeline. Resolve MUST continue to enumerate paths without reading candidate file bytes for scanning, hashing, token estimation, or preview display.

#### Scenario: Resolve does not open file contents for scanning or preview
- **WHEN** resolve enumerates candidate paths
- **THEN** candidate file contents are not read for secret scanning, hashing, token estimation, or preview display

#### Scenario: Secret scan may consume resolve without changing resolve Non-Goals
- **WHEN** `secret-detection-and-exclusion` invokes resolve in-process for a stage
- **THEN** resolve still returns path-only results and does not perform content detection inside the resolve capability

#### Scenario: Context-bundle pipeline may depend on resolve via shared scan
- **WHEN** `context-bundle-manifest` runs the shared scanning pipeline for a stage
- **THEN** resolve is used only as the upstream path enumerator and still does not hash, estimate tokens, or persist manifests itself

### Requirement: Resolved candidate sets are consumable by secret detection
The context-source resolve success contract (`stage`, `configurationVersionId`, `sourceHash`, and ordered `paths`) MUST remain a stable in-process input for `secret-detection-and-exclusion` and for the shared scanning engine used by `context-bundle-manifest`. Resolve MUST NOT accept client path overrides on behalf of secret scan or context-bundle create. Resolve identity fields used downstream MUST continue to come from the active configuration and the resolve request stage.

#### Scenario: Secret scan uses resolve paths only
- **WHEN** secret detection runs after a successful internal resolve
- **THEN** the candidate path set scanned is exactly the resolve `paths` array for that project and stage

#### Scenario: Context-bundle shared pipeline uses resolve paths only
- **WHEN** context-bundle creation runs the shared scanning pipeline after a successful internal resolve
- **THEN** the candidate path set processed is exactly the resolve `paths` array for that project and stage
