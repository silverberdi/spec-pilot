# Current State

Lifecycle: `w01-s04-archived` (wave `w01` complete)

- Product name: SpecPilot
- Repository: `spec-pilot`
- Active wave: `w01` (all slices archived)
- Active change: none (ready for Wave 2 when operator-approved)
- Completed archived slices: `w00-s01` … `w00-s04`, `w01-s01-project-registration`, `w01-s02-project-configuration`, `w01-s03-git-and-openspec-discovery`, `w01-s04-project-dashboard`
- Cursor is the only current implementer.
- Working policy: main-only (no per-change branches, no Pull Requests).
- Project registration: `POST/GET /projects` with realpath identity; presence-only eligibility for `.specpilot/project.yaml`.
- Project configuration: immutable `ProjectConfigurationVersion`; attach on register; refresh/get APIs.
- Project discovery: read-only Git + OpenSpec inspection; refresh/get APIs; persists `lastDiscovery` + `lastInspectedAt`.
- Project dashboard: Spanish multi-project list with fail-closed `discoveryHealth`; `GET /projects` ordered by `registeredAt` DESC, `id` ASC; no auto-discovery on load.
- Compose: API host root via gitignored override; web builds require `PRIMEUI_LICENSE` in gitignored `.env`.
- Next: start Wave 2 / next approved change when operator-approved.
