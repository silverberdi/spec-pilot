# `us-w02-s02-secret-detection-and-exclusion-001` — Establish core capability

## Parent

- Wave: `w02`
- Slice: `w02-s02-secret-detection-and-exclusion`
- Expected OpenSpec change: `chg-w02-s02-secret-detection-and-exclusion`

## Story

As the SpecPilot operator, I need this slice to prevent secret disclosure and block unsafe bundles. so that the product advances with verifiable, bounded behavior.

## Acceptance criteria

1. The capability is represented by explicit domain/application contracts and no unrelated future scope.
2. Deterministic validation and automated tests cover success and at least one meaningful failure path.
3. Errors are explicit, safe, and persisted/auditable where applicable.
4. Relevant UI behavior is accessible and provides clear loading, empty, success, blocked, and error states when this story has a UI surface.
5. Documentation, OpenSpec artifacts, and context are synchronized before closure.

## Evidence

- Automated test output.
- OpenSpec Verify exactly `PASS`.
- Relevant API/UI evidence.
- Cross-review verdict when required.
- Confirmation of no hidden deferred acceptance criteria.
