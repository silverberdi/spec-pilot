## ADDED Requirements

### Requirement: Review-run orchestration success and blocked paths are covered by automated tests
Automated tests under this change MUST cover at least: explicit bundle required and no latest substitution; bundle stage mismatch; approval missing vs policy mismatch as distinct codes; mutate-after-approval integrity block before provider; approved excerpts reaching the fake gateway in order; bounds failure before provider; no `ReviewRun.transmissionId`; unique `ContextDisclosureTransmission.reviewRunId` and inverse load; no transmission on prerequisite block; missing key with `invocationBegan` false and zero transmission; transport failure with `provider_failed` transmission; envelope/schema/verdict failures with `response_invalid` transmission; completed transmission; post-provider Prisma failure without a second DeepSeek call; transition atomicity and terminal immutability; partial unique concurrency and stale recovery after 180000 ms; `changeId` rules for `new` vs other stages; completed/blocked/failed retrievable without content/prompts/raw responses; and unchanged probe behavior. Evidence MUST be reproducible under the change directory.

#### Scenario: Success path is tested with fake gateway
- **WHEN** automated review-run tests execute a completed create with a fake gateway
- **THEN** they assert terminal `completed`, one `completed` transmission, and persisted transitions

#### Scenario: Integrity block before provider is tested
- **WHEN** automated tests simulate post-approval content mutation
- **THEN** they assert `blocked` `review_context_integrity_mismatch`, zero gateway attempts, and zero transmission rows

#### Scenario: Probe regression coverage remains green
- **WHEN** DeepSeek probe automated tests run after this change
- **THEN** probe public behavior and ephemeral outcomes still pass
