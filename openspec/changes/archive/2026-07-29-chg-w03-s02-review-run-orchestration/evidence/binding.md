# Binding — chg-w03-s02-review-run-orchestration

| Field | Value |
|---|---|
| Wave | `w03` |
| Slice | `w03-s02-review-run-orchestration` |
| Change | `chg-w03-s02-review-run-orchestration` |
| User Stories | `us-w03-s02-review-run-orchestration-001`, `us-w03-s02-review-run-orchestration-002`, `us-w03-s02-review-run-orchestration-003` |
| Implementer | Cursor |
| Dependencies | Archived `w03-s01-deepseek-api-gateway`; archived Wave 2 (`w02-s01` … `w02-s04`); archived Wave 1 (`w01-s01` … `w01-s04`); Wave 0 foundation; ADR-002; ADR-003; ADR-004 (DeepSeek calls allowed; no repo edits); ADR-005; main-only working policy |
| Exclusions | `w03-s03` budget estimate/reserve/reconcile/hard-block; `w03-s04` findings ledger/prompt-history; Waves 4–7 stage-depth product logic; `ReviewRun.transmissionId` scalar; mutation of Wave 2 aggregates / `contentTransmitted=true`; client-supplied excerpts/prompts/schemas/messages; silent latest-bundle substitution; automatic bundle recreation; worker/SSE/cancel endpoint requirement; auth/multiuser; target-repo writes; delivery/Git-write/OpenSpec apply-verify-sync-archive from SpecPilot; alternate providers; weakening SpecPilot repo CI secret scanning; Wave 4+ |

Traceable to `proposal.md`, `design.md`, and `specs/**`.
