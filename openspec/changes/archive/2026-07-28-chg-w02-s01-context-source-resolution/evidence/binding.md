# Change binding

| Field | Value |
|---|---|
| Wave | `w02` |
| Slice | `w02-s01-context-source-resolution` |
| Change | `chg-w02-s01-context-source-resolution` |
| User Stories | `us-w02-s01-context-source-resolution-001`, `us-w02-s01-context-source-resolution-002`, `us-w02-s01-context-source-resolution-003` |
| Implementer | Cursor |
| Dependencies | Archived Wave 1 (`w01-s01` … `w01-s04`); Wave 0 foundation; ADR-002; ADR-003; ADR-004; ADR-005; main-only working policy |
| Traceability | `proposal.md`, `design.md`, `specs/**/*.md`, `tasks.md` |

## Exclusions (summary)

No Prisma/DB migration; no per-stage `project.yaml` overlays; no secret-content scanning (`w02-s02`); no manifests/hashes/tokens (`w02-s03`); no preview/approval (`w02-s04`); no candidate file-byte reads; no DeepSeek; no delivery/Git-write/OpenSpec apply-verify-sync-archive; no auth/multiuser; no Git submodule detection; no API pagination/per-path follow-ups; no later-wave scope.
