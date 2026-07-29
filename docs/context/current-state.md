# Current State

Lifecycle: `w02-complete-ready-for-w03`

- Product name: SpecPilot
- Repository: `spec-pilot`
- Active wave: `w02` complete; next expected wave `w03`
- Active change: none
- Completed archived slices: `w00-s01` … `w00-s04`, `w01-s01-project-registration`, `w01-s02-project-configuration`, `w01-s03-git-and-openspec-discovery`, `w01-s04-project-dashboard`, `w02-s01-context-source-resolution`, `w02-s02-secret-detection-and-exclusion`, `w02-s03-context-bundle-manifest`, `w02-s04-context-preview-and-approval`
- Cursor is the only current implementer.
- Working policy: main-only (no per-change branches, no Pull Requests).
- Project registration: `POST/GET /projects` with realpath identity; presence-only eligibility for `.specpilot/project.yaml`.
- Project configuration: immutable `ProjectConfigurationVersion`; attach on register; refresh/get APIs.
- Project discovery: read-only Git + OpenSpec inspection; refresh/get APIs; persists `lastDiscovery` + `lastInspectedAt`.
- Project dashboard: Spanish multi-project list with fail-closed `discoveryHealth`; `GET /projects` ordered by `registeredAt` DESC, `id` ASC; no auto-discovery on load.
- Context-source resolution: ephemeral `POST /projects/:id/context-sources/resolve` with stage `new|planning|applied|verify`; picomatch include/exclude; defensive mandatory excludes; `lstat` symlink policy; paths only (no content reads); Spanish console with 200-path display cap.
- Secret detection: ephemeral `POST /projects/:id/context-sources/secret-scan` via shared same-bytes pipeline; path-level exclusion; `unsafe_context_bundle` when no eligible paths remain; never returns secret values; Spanish console distinct from resolve.
- Context bundles: immutable append-only `ContextBundle` via `POST /projects/:id/context-bundles` (201), GET by id, GET latest `limit=1`; algorithm ids (`full-file-lines-v1`, `unicode-codepoints-div-4-v1`) + full `manifestHash`; no `contentTransmitted` on bundle rows.
- Disclosure preview/approval: mandatory preview session (`ContextDisclosurePreviewSession`, 15m TTL, metadata-only) then approval (`ContextDisclosureApproval` with `contentTransmitted: false`); routes `POST .../preview`, `POST .../disclosure-approvals`, `GET .../disclosure-status`, `GET .../disclosure-approvals?stage=&limit=1`; policies `bounded-selected-text-v1` / `explicit-disclosure-approval-v1`; Spanish console with 20-excerpt display cap; no DeepSeek transmission.
- Compose: API host root via gitignored override; web builds require `PRIMEUI_LICENSE` in gitignored `.env`.
- Next: Wave 3 starts with expected change `chg-w03-s01-deepseek-api-gateway` when authorized.
