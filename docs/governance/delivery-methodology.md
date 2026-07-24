# Delivery Methodology

## Hierarchy

`Roadmap → Wave → Slice → User Stories → OpenSpec tasks`

## Rules

- Every slice has exactly one expected OpenSpec change unless an approved exception is documented.
- IDs and change names are lowercase kebab-case.
- Imported package artifacts are planning candidates, not completed implementation.
- One executor owns a slice end-to-end; the other executor performs cross-review when the wave contract requires it.
- Verify must be exactly `PASS` before synchronized closure.
- No hidden deferred acceptance criteria.
- Deviations require synchronized roadmap/backlog/wave/User Story/OpenSpec updates before work resumes.

## Branch model

`slice/* → wave/* → main`

- Slice PRs target the active wave branch.
- Wave PRs target `main`.
- Direct pushes to protected integration branches are invalid.
