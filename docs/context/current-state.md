# Current State

Lifecycle: `w01-s02-archived`

- Product name: SpecPilot
- Repository: `spec-pilot`
- Active wave: `w01`
- Active change: none (archived `chg-w01-s02-project-configuration`)
- Completed archived slices: `w00-s01` … `w00-s04`, `w01-s01-project-registration`, `w01-s02-project-configuration`
- Cursor is the only current implementer.
- Working policy: main-only (no per-change branches, no Pull Requests).
- Project registration: `POST/GET /projects` with realpath identity; presence-only eligibility for `.specpilot/project.yaml`.
- Project configuration: parse/validate/version/persist immutable `ProjectConfigurationVersion`; attach on register (`RegisterProjectResponse.configuration`); `POST /projects/:id/configuration/refresh`; `GET /projects/:id/configuration`.
- Compose API: authorized host root via gitignored override (`SPECPILOT_HOST_REPOS_ROOT`, read-only).
- Next: continue `w01` with `w01-s03-git-and-openspec-discovery` when authorized.
