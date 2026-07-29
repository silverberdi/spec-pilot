## ADDED Requirements

### Requirement: Project-scoped DeepSeek probe endpoint is exposed under projects
The registered-project API surface MUST expose `POST /projects/:id/deepseek/probe` as defined by `deepseek-api-gateway` without changing realpath identity, presence-only eligibility, registration create/list semantics, configuration attach/refresh/get, discovery refresh/get, context-source resolve, secret-scan, context-bundle create/get/latest, or disclosure preview/approval semantics. DeepSeek probe MUST NOT run automatically on `POST /projects`, `GET /projects`, resolve, secret-scan, context-bundle create, preview, or approval. No product update or delete endpoint for DeepSeek gateway resources MUST be exposed. The probe request MUST accept only `DeepseekProbeStage` and MUST NOT accept `ReviewStage` value `new`.

#### Scenario: Probe is routed for a registered project
- **WHEN** an operator posts to `/projects/:id/deepseek/probe` for an existing project
- **THEN** the projects API routes the request to the DeepSeek gateway probe and returns HTTP 200 ok or a closed error contract

#### Scenario: Registration and context workflows do not auto-probe
- **WHEN** an operator registers a project, resolves context, secret-scans, creates a bundle, previews, or approves disclosure
- **THEN** DeepSeek probe is not invoked as part of those operations
