## ADDED Requirements

### Requirement: Project-scoped context-bundle endpoints are exposed under projects
The registered-project API surface MUST expose `POST /projects/:id/context-bundles`, `GET /projects/:id/context-bundles/:bundleId`, and `GET /projects/:id/context-bundles?stage=<ReviewStage>&limit=1` as defined by `context-bundle-manifest` without changing realpath identity, presence-only eligibility, registration create/list semantics, configuration attach/refresh/get, discovery refresh/get, context-source resolve, or public secret-scan semantics. Context-bundle create MUST NOT run automatically on `POST /projects`, `GET /projects`, `POST /projects/:id/context-sources/resolve`, or `POST /projects/:id/context-sources/secret-scan`. No product update or delete endpoint for context bundles MUST be exposed.

#### Scenario: Context-bundle create is available for a registered project id
- **WHEN** an operator calls `POST /projects/:id/context-bundles` with a valid `{ stage }` for an existing project that has active configuration and clean candidates
- **THEN** the projects API routes the request to context-bundle creation and returns HTTP 201 ok or a blocked/error contract

#### Scenario: Registration list resolve and secret-scan do not auto-create bundles
- **WHEN** an operator registers a project, lists projects, resolves context sources, or runs secret scan
- **THEN** context-bundle creation is not invoked as part of those operations
