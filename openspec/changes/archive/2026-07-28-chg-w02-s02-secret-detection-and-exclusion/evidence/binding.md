# Change binding

| Field | Value |
|---|---|
| Wave | `w02` |
| Slice | `w02-s02-secret-detection-and-exclusion` |
| Change | `chg-w02-s02-secret-detection-and-exclusion` |
| User Stories | `us-w02-s02-secret-detection-and-exclusion-001`, `us-w02-s02-secret-detection-and-exclusion-002`, `us-w02-s02-secret-detection-and-exclusion-003` |
| Implementer | Cursor |
| Dependencies | Archived `w02-s01-context-source-resolution`; archived Wave 1 (`w01-s01` … `w01-s04`); Wave 0 foundation; ADR-002; ADR-003; ADR-004; ADR-005; main-only working policy |
| Traceability | `proposal.md`, `design.md`, `specs/**/*.md`, `tasks.md` |

## Exclusions (summary)

No Prisma/DB migration; no `project.yaml` schema expansion; no immutable manifests/hashes/tokens (`w02-s03`); no preview/approval (`w02-s04`); no DeepSeek product API calls; no delivery/Git-write/OpenSpec apply-verify-sync-archive; no auth/multiuser; no client-supplied path lists; no MIME/extension binary heuristics; no redacted file bodies; no weakening of SpecPilot repo CI secret scanning; no later-wave scope.
