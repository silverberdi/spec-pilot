# Change binding

| Field | Value |
|---|---|
| Wave | `w02` |
| Slice | `w02-s04-context-preview-and-approval` |
| Change | `chg-w02-s04-context-preview-and-approval` |
| User Stories | `us-w02-s04-context-preview-and-approval-001`, `us-w02-s04-context-preview-and-approval-002`, `us-w02-s04-context-preview-and-approval-003` |
| Implementer | Cursor |
| Dependencies | Archived `w02-s01-context-source-resolution`; archived `w02-s02-secret-detection-and-exclusion`; archived `w02-s03-context-bundle-manifest` (immutable `ContextBundle` identity + entries); archived Wave 1 (`w01-s01` … `w01-s04`); Wave 0 foundation; ADR-002 OpenSpec authority; ADR-003 PostgreSQL-only; ADR-004 read-only initial release + minimal disclosure; ADR-005 portable project contract; binding main-only working policy |
| Traceability | `proposal.md`, `design.md`, `specs/**/*.md`, `tasks.md` |

## Scope (summary)

- Preview disclosable content for a registered project's immutable `ContextBundle` by re-verifying live file bytes against each entry `contentHash`, constructing canonical bounded excerpts, and persisting a metadata-only, append-only `ContextDisclosurePreviewSession` (design D1).
- Require explicit disclosure approval bound to `previewSessionId` + `manifestHash` + `decision: 'approved'`, persisted as a separate append-only `ContextDisclosureApproval` audit aggregate with `contentTransmitted: false` (literal snapshot; never true this slice) (design D2).
- Version preview/approval behavior behind binding policy ids `bounded-selected-text-v1` / `explicit-disclosure-approval-v1`; coverage requires exact equality including both policy ids (design D0/D3).
- Never mutate, update, or delete `ContextBundle` or preview-session rows.
- Remain read-only toward target repositories; no DeepSeek / external transmission; no Git/OpenSpec/delivery execution from SpecPilot.

## Exclusions (summary)

No DeepSeek product API calls or provider payload transmission; no `contentTransmitted: true`; no review runs, findings ledger as product evidence, budget reservation/enforcement, or prompts; no mutation of `ContextBundle` rows for approval/transmission; no product update/delete endpoints for bundles, preview sessions, or approvals; no client-supplied excerpts, paths, ranges, hashes (other than the binding `manifestHash`), or file bodies; no authentication/multiuser; no Windows/Linux support; no delivery/Git-write/OpenSpec apply-verify-sync-archive workflows from SpecPilot; no weakening of SpecPilot's own repository-level `baseline-validation-and-secret-scanning` / quality gates; no Wave 3+ review engine or later-wave scope; no reject/revoke UX; no editing of OpenSpec-generated integrations except via `openspec update`.
