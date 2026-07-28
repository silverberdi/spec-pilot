## ADDED Requirements

### Requirement: Project-scoped context-source resolve endpoint is exposed under projects
The registered-project API surface MUST expose `POST /projects/:id/context-sources/resolve` as defined by `context-source-resolution` without changing realpath identity, presence-only eligibility, registration create/list semantics, configuration attach/refresh/get, or discovery refresh/get. Resolve MUST NOT run automatically on `POST /projects` or `GET /projects`.

#### Scenario: Resolve is available for a registered project id
- **WHEN** an operator calls `POST /projects/:id/context-sources/resolve` with a valid `{ stage }` for an existing project that has active configuration
- **THEN** the projects API routes the request to context-source resolution and returns the resolve success or blocked/error contract

#### Scenario: Registration and list do not auto-resolve context sources
- **WHEN** an operator registers a project or lists projects
- **THEN** context-source resolution is not invoked as part of those operations
