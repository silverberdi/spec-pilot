# Current State

Lifecycle: `w03-s02-review-run-orchestration-archived`

- Product name: SpecPilot
- Repository: `spec-pilot`
- Active wave: `w03`
- Active change: none (archived `chg-w03-s02-review-run-orchestration`)
- Completed archived slices: `w00-s01` … `w00-s04`, `w01-s01` … `w01-s04`, `w02-s01` … `w02-s04`, `w03-s01`, `w03-s02`
- Cursor is the only current implementer.
- Working policy: main-only (no per-change branches, no Pull Requests).
- Project registration: `POST/GET /projects` with realpath identity; presence-only eligibility for `.specpilot/project.yaml`.
- Project configuration: immutable `ProjectConfigurationVersion`; attach on register; refresh/get APIs.
- Project discovery: read-only Git + OpenSpec inspection; refresh/get APIs; persists `lastDiscovery` + `lastInspectedAt`.
- Project dashboard: Spanish multi-project list with fail-closed `discoveryHealth`.
- Context-source resolution, secret detection, context bundles, and disclosure preview/approval remain as archived in Wave 2.
- DeepSeek gateway (archived `w03-s01`, generalized in `w03-s02`): `DeepseekGatewayPort.completeStructured` returns discriminated `DeepseekStructuredExecutionResult`; profiles `probe` and `review_run_orchestration`; public probe DTO/route unchanged; fixed base URL `https://api.deepseek.com`; env `DEEPSEEK_API_KEY` only.
- Review-run orchestration (archived `w03-s02`): persists `ReviewRun` + append-only `ReviewRunTransition` + append-only `ContextDisclosureTransmission` (UNIQUE `reviewRunId`, no `ReviewRun.transmissionId`); sync `POST /projects/:id/review-runs` create+execute; get/list APIs; reconstructs approved excerpts via Wave 2 helpers; `budgetCheckStatus=not_enforced`; stale recovery `staleRunTtlMs=180000`; Spanish **Iniciar revisión** console; no budget enforcement, findings, or prompt-history product surfaces.
- Compose: API may forward `DEEPSEEK_API_KEY` from gitignored `.env`; web builds require `PRIMEUI_LICENSE`.
- Next expected change: `chg-w03-s03-monthly-budget-controls` (when authorized; not started).
