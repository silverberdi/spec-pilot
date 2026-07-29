## ADDED Requirements

### Requirement: Project-scoped secret-scan endpoint is exposed under projects
The registered-project API surface MUST expose `POST /projects/:id/context-sources/secret-scan` as defined by `secret-detection-and-exclusion` without changing realpath identity, presence-only eligibility, registration create/list semantics, configuration attach/refresh/get, discovery refresh/get, or context-source resolve semantics. Secret scan MUST NOT run automatically on `POST /projects`, `GET /projects`, or `POST /projects/:id/context-sources/resolve`.

#### Scenario: Secret scan is available for a registered project id
- **WHEN** an operator calls `POST /projects/:id/context-sources/secret-scan` with a valid `{ stage }` for an existing project that has active configuration
- **THEN** the projects API routes the request to secret detection and returns the scan success or blocked/error contract

#### Scenario: Registration list and resolve do not auto-run secret scan
- **WHEN** an operator registers a project, lists projects, or resolves context sources
- **THEN** secret detection is not invoked as part of those operations
