# Current State

Lifecycle: `w03-s01-deepseek-api-gateway-archived`

- Product name: SpecPilot
- Repository: `spec-pilot`
- Active wave: `w03`
- Active change: none (awaiting `chg-w03-s02-review-run-orchestration`)
- Completed archived slices: `w00-s01` … `w00-s04`, `w01-s01` … `w01-s04`, `w02-s01` … `w02-s04`, `w03-s01`
- Cursor is the only current implementer.
- Working policy: main-only (no per-change branches, no Pull Requests).
- Project registration: `POST/GET /projects` with realpath identity; presence-only eligibility for `.specpilot/project.yaml`.
- Project configuration: immutable `ProjectConfigurationVersion`; attach on register; refresh/get APIs.
- Project discovery: read-only Git + OpenSpec inspection; refresh/get APIs; persists `lastDiscovery` + `lastInspectedAt`.
- Project dashboard: Spanish multi-project list with fail-closed `discoveryHealth`.
- Context-source resolution, secret detection, context bundles, and disclosure preview/approval remain as archived in Wave 2.
- DeepSeek gateway (archived `w03-s01`): project-scoped `POST /projects/:id/deepseek/probe` with `DeepseekProbeStage` (`discovery|planning|applied|verify`, default discovery); fixed base URL `https://api.deepseek.com`; structured JSON + local schema `deepseek-gateway-probe-v1`; deterministic retries; env `DEEPSEEK_API_KEY` only; Spanish probe console; no review runs/budgets/findings; no provider-call persistence.
- Compose: API may forward `DEEPSEEK_API_KEY` from gitignored `.env`; web builds require `PRIMEUI_LICENSE`.
- Next expected change: `chg-w03-s02-review-run-orchestration`.
