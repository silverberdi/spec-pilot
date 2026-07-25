# `us-w07-s03-verify-review-experience-001` — Deliver core behavior

## Parent

- Wave: `w07`
- Slice: `w07-s03-verify-review-experience`
- Expected OpenSpec change: `chg-w07-s03-verify-review-experience`
- Implementer: `cursor`

## Story

As the SpecPilot operator, I need to implement the core behavior of render blocking gates and exact next command. so that the product advances with bounded, verifiable behavior.

## Acceptance criteria

1. The slice delivers the explicitly declared capability: Render blocking gates and exact next command.
2. The implementation remains inside this slice and excludes later-slice or future-wave scope.
3. Domain/application contracts and public behavior are explicit enough to test independently.
4. Failure behavior is explicit, safe, and does not silently continue with invalid state.

## Evidence

- Deterministic automated test or validation output.
- Traceability to the approved proposal, design, specs, and tasks.
- OpenSpec Verify exactly `PASS` before closure.
- Relevant API/UI or operator evidence when the story exposes such a surface.
- Confirmation that no hidden deferred acceptance criterion remains.
