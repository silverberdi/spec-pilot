## MODIFIED Requirements

### Requirement: Minimal Spanish-first discovery console outcomes
`apps/web` MUST expose a Spanish-first discovery outcomes surface with explicit empty, loading, success, and blocked/error outcomes driven by the discovery API. The surface MUST provide an explicit refresh action for a known project id and MUST show last inspection time when present plus Git and OpenSpec summaries after refresh or get. The surface MUST NOT claim delivery execution capability. Multi-project discovery-health listing is delivered by `project-dashboard` using persisted `lastInspectedAt` / `lastDiscovery` projections and MUST NOT replace these per-project discovery refresh/get semantics or invent a second discovery engine. Dashboard load MUST NOT auto-run discovery refresh.

#### Scenario: Empty never-inspected state
- **WHEN** the discovery surface loads for a known project that has never been inspected
- **THEN** an empty/never-inspected outcome is shown with a ready refresh action

#### Scenario: Loading state during refresh
- **WHEN** `POST /projects/:id/discovery/refresh` is in flight
- **THEN** a loading state is presented and refresh is not treated as complete

#### Scenario: Success state shows Git and OpenSpec summaries
- **WHEN** refresh returns HTTP 200 with ok or blocked subsystem outcomes
- **THEN** the UI shows inspection time and Git/OpenSpec summaries without claiming target-repository mutation

#### Scenario: Hard API error surfaces operator message
- **WHEN** refresh returns HTTP 422 or 500 with `{ code, message }`
- **THEN** the UI shows the blocked/error outcome using the operator-facing message

#### Scenario: Dashboard consumes persisted discovery without replacing refresh
- **WHEN** the project dashboard presents discovery health for registered projects
- **THEN** health is derived from persisted discovery fields without replacing explicit per-project discovery refresh/get endpoints
