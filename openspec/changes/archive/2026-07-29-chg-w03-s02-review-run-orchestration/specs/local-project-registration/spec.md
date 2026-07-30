## ADDED Requirements

### Requirement: Project-scoped review-run endpoints are exposed under projects
The registered-project API surface MUST expose `POST /projects/:id/review-runs`, `GET /projects/:id/review-runs/:runId`, and `GET /projects/:id/review-runs` without changing realpath identity or registration semantics. Unknown projects MUST continue to return HTTP 404 `project_not_found` on these routes.

#### Scenario: Review-run create is project-scoped
- **WHEN** an operator posts a review-run create for a registered project id
- **THEN** the route is handled under `/projects/:id/review-runs` and does not alter project registration identity rules

#### Scenario: Unknown project on review-run create returns 404
- **WHEN** create is posted for an unknown project id
- **THEN** the response is HTTP 404 `project_not_found`
