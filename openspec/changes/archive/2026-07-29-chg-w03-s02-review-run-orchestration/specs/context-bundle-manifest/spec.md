## MODIFIED Requirements

### Requirement: Keep preview approval and transmission out of this slice
Context-bundle create/get/latest MUST NOT preview file contents, collect disclosure approval, mark transmission, call DeepSeek, reserve budget, create review runs, or mutate `ContextBundle` rows after insert. Create/get/latest responses MUST omit file bodies, decoded text, matched secrets, approval decisions, and transmission flags, and MUST continue to forbid `contentTransmitted` on bundle DTOs and Prisma rows. Separate capabilities (`context-preview-and-approval` and `review-run-orchestration`) MAY consume immutable bundle identity (`id`, `manifestHash`, entries, algorithm/policy ids) for disclosure approval and for review-run preparing-context / append-only `ContextDisclosureTransmission` evidence. Those capabilities MUST NOT mutate `ContextBundle` rows and MUST NOT reopen create/get/latest product Non-Goals beyond supplying that identity.

#### Scenario: Success does not expose file contents or approval controls
- **WHEN** create or get succeeds
- **THEN** responses omit file bodies, decoded text, matched secrets, approval decisions, and transmission flags

#### Scenario: No update or delete product endpoints
- **WHEN** the projects API surface for context bundles is inspected
- **THEN** no product update or delete endpoint for `ContextBundle` is exposed

#### Scenario: Review-run may bind identity without mutating the bundle
- **WHEN** a review run completes using an explicit `contextBundleId`
- **THEN** the corresponding `ContextBundle` row remains unchanged and still has no `contentTransmitted` field
