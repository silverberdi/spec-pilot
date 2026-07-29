# Binding — chg-w03-s01-deepseek-api-gateway

| Field | Value |
|---|---|
| Wave | `w03` |
| Slice | `w03-s01-deepseek-api-gateway` |
| Change | `chg-w03-s01-deepseek-api-gateway` |
| User Stories | `us-w03-s01-deepseek-api-gateway-001`, `us-w03-s01-deepseek-api-gateway-002`, `us-w03-s01-deepseek-api-gateway-003` |
| Implementer | Cursor |
| Dependencies | Archived Wave 2 (`w02-s01` … `w02-s04`); archived Wave 1 (`w01-s01` … `w01-s04`); Wave 0 foundation; ADR-002; ADR-003; ADR-004 (DeepSeek calls allowed; no repo edits); ADR-005; main-only working policy |
| Exclusions | `w03-s02` review-run orchestration; `w03-s03` budget reserve/reconcile/hard-block; `w03-s04` findings/prompts/history; provider-call Prisma migration; `DEEPSEEK_BASE_URL` operator config; `ReviewStage`/`new` on probe; client prompts/keys/base URL/tools/messages; repository/bundle/disclosure reads on probe; auth/multiuser; target-repo writes; delivery/Git-write/OpenSpec apply-verify-sync-archive from SpecPilot; alternate providers; weakening SpecPilot repo CI secret scanning; Wave 4+ |

Traceable to `proposal.md`, `design.md`, and `specs/**`.
