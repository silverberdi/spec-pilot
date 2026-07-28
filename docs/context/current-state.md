# Current State

Lifecycle: `w02-s01-archived`

- Product name: SpecPilot
- Repository: `spec-pilot`
- Active wave: `w02`
- Active change: none (ready for next approved Wave 2 change)
- Completed archived slices: `w00-s01` … `w00-s04`, `w01-s01-project-registration`, `w01-s02-project-configuration`, `w01-s03-git-and-openspec-discovery`, `w01-s04-project-dashboard`, `w02-s01-context-source-resolution`
- Cursor is the only current implementer.
- Working policy: main-only (no per-change branches, no Pull Requests).
- Project registration: `POST/GET /projects` with realpath identity; presence-only eligibility for `.specpilot/project.yaml`.
- Project configuration: immutable `ProjectConfigurationVersion`; attach on register; refresh/get APIs.
- Project discovery: read-only Git + OpenSpec inspection; refresh/get APIs; persists `lastDiscovery` + `lastInspectedAt`.
- Project dashboard: Spanish multi-project list with fail-closed `discoveryHealth`; `GET /projects` ordered by `registeredAt` DESC, `id` ASC; no auto-discovery on load.
- Context-source resolution: ephemeral `POST /projects/:id/context-sources/resolve` with stage `new|planning|applied|verify`; picomatch include/exclude; defensive mandatory excludes; `lstat` symlink policy; paths only (no content reads); Spanish console with 200-path display cap.
- Compose: API host root via gitignored override; web builds require `PRIMEUI_LICENSE` in gitignored `.env`.
- Next: start next approved Wave 2 change when operator-approved.
