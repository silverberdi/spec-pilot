## MODIFIED Requirements

### Requirement: Keep Wave 2 later-slice behaviors out of resolve
Context-source resolution MUST NOT itself perform secret-content detection, build immutable context-bundle manifests, estimate tokens, preview file contents, require approval gates, or call DeepSeek. Secret-content detection and unsafe-bundle blocking are owned by `secret-detection-and-exclusion`, which MAY invoke resolve in-process and consume its candidate path set. Resolve MUST continue to enumerate paths without reading candidate file bytes for scanning, hashing, token estimation, or preview display.

#### Scenario: Resolve does not open file contents for scanning or preview
- **WHEN** resolve enumerates candidate paths
- **THEN** candidate file contents are not read for secret scanning, hashing, token estimation, or preview display

#### Scenario: Secret scan may consume resolve without changing resolve Non-Goals
- **WHEN** `secret-detection-and-exclusion` invokes resolve in-process for a stage
- **THEN** resolve still returns path-only results and does not perform content detection inside the resolve capability

## ADDED Requirements

### Requirement: Resolved candidate sets are consumable by secret detection
The context-source resolve success contract (`stage`, `configurationVersionId`, `sourceHash`, and ordered `paths`) MUST remain a stable in-process input for `secret-detection-and-exclusion`. Resolve MUST NOT accept client path overrides on behalf of secret scan. Resolve identity fields used by secret scan MUST continue to come from the active configuration and the resolve request stage.

#### Scenario: Secret scan uses resolve paths only
- **WHEN** secret detection runs after a successful internal resolve
- **THEN** the candidate path set scanned is exactly the resolve `paths` array for that project and stage
