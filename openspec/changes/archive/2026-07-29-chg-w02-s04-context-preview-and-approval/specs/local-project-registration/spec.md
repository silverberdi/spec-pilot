## ADDED Requirements

### Requirement: Project-scoped disclosure preview and approval endpoints are exposed under projects
The registered-project API surface MUST expose `POST /projects/:id/context-bundles/:bundleId/preview`, `POST /projects/:id/context-bundles/:bundleId/disclosure-approvals`, `GET /projects/:id/context-bundles/:bundleId/disclosure-status`, and `GET /projects/:id/disclosure-approvals?stage=<ReviewStage>&limit=1` as defined by `context-preview-and-approval` without changing realpath identity, presence-only eligibility, registration create/list semantics, configuration attach/refresh/get, discovery refresh/get, context-source resolve, public secret-scan, or context-bundle create/get/latest semantics. Disclosure preview and approval MUST NOT run automatically on `POST /projects`, `GET /projects`, resolve, secret-scan, or context-bundle create. No product update or delete endpoint for preview sessions, disclosure approvals, or context bundles MUST be exposed.

#### Scenario: Preview is available for a registered project bundle
- **WHEN** an operator calls `POST /projects/:id/context-bundles/:bundleId/preview` for an existing project and bundle whose live files match entry hashes
- **THEN** the projects API routes the request to disclosure preview and returns HTTP 200 ok or a blocked/error contract

#### Scenario: Registration list resolve scan and bundle create do not auto-preview or approve
- **WHEN** an operator registers a project, lists projects, resolves context sources, runs secret scan, or creates a context bundle
- **THEN** disclosure preview session creation and disclosure approval are not invoked as part of those operations
