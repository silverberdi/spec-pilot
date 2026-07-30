## ADDED Requirements

### Requirement: Allow review-run integrity revalidation and transmission evidence without mutating approvals
Capability `review-run-orchestration` MAY load an existing covering `ContextDisclosureApproval`, reconstruct preview material with the existing canonical helpers, recompute `previewIntegrityHash`, and insert append-only `ContextDisclosureTransmission` rows that reference the approval and preview session. Preview and approval product endpoints MUST continue to remain free of DeepSeek calls. `ContextDisclosurePreviewSession` and `ContextDisclosureApproval` rows MUST NOT be mutated by review-run orchestration, and `contentTransmitted` MUST remain the literal false snapshot from approval insert time (never set to true by this change).

#### Scenario: Review-run transmission does not flip contentTransmitted
- **WHEN** a review run invokes DeepSeek after approval coverage succeeds
- **THEN** the referenced `ContextDisclosureApproval.contentTransmitted` remains false and no approval or preview-session update occurs

#### Scenario: Disclosure product APIs still do not call DeepSeek
- **WHEN** preview or approval endpoints are invoked
- **THEN** no DeepSeek or external provider call is performed by those endpoints
