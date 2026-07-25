# `us-w06-s03-ready-for-verify-decision-002` — Prove safety and correctness

## Parent

- Wave: `w06`
- Slice: `w06-s03-ready-for-verify-decision`
- Expected OpenSpec change: `chg-w06-s03-ready-for-verify-decision`
- Implementer: `cursor`

## Story

As the SpecPilot operator, I need to validate the capability with deterministic evidence and safe failure handling so that the product advances with bounded, verifiable behavior.

## Acceptance criteria

1. Automated tests cover the primary success path and at least one meaningful blocked or failure path.
2. Security, privacy, persistence, budget, migration, and rollback impacts are addressed where applicable, with explicit no-impact statements otherwise.
3. Evidence is reproducible and does not rely only on task checkboxes or unsupported claims.
4. OpenSpec artifacts and implementation remain traceable to this slice and its User Stories.

## Evidence

- Deterministic automated test or validation output.
- Traceability to the approved proposal, design, specs, and tasks.
- OpenSpec Verify exactly `PASS` before closure.
- Relevant API/UI or operator evidence when the story exposes such a surface.
- Confirmation that no hidden deferred acceptance criterion remains.
