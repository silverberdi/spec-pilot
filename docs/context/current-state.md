# Current State

Lifecycle: `w01-s03-archived`

- Product name: SpecPilot
- Repository: `spec-pilot`
- Active wave: `w01`
- Active change: none (ready for `chg-w01-s04-project-dashboard`)
- Completed archived slices: `w00-s01` … `w00-s04`, `w01-s01-project-registration`, `w01-s02-project-configuration`, `w01-s03-git-and-openspec-discovery`
- Cursor is the only current implementer.
- Working policy: main-only (no per-change branches, no Pull Requests).
- Project registration: `POST/GET /projects` with realpath identity; presence-only eligibility for `.specpilot/project.yaml`.
- Project configuration: parse/validate/version/persist immutable `ProjectConfigurationVersion`; attach on register; `POST /projects/:id/configuration/refresh`; `GET /projects/:id/configuration`.
- Project discovery: read-only Git + OpenSpec inspection; `POST /projects/:id/discovery/refresh`; `GET /projects/:id/discovery`; persists `lastDiscovery` + `lastInspectedAt` on completed cycles (including blocked subsystem outcomes).
- Compose API: authorized host root via gitignored override (`SPECPILOT_HOST_REPOS_ROOT`, read-only); API image includes `git`.
- Next: start `w01-s04-project-dashboard` / `chg-w01-s04-project-dashboard` when operator-approved.
