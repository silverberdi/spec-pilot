# Human validation

Status: PASS

## Operator confirmation

- Date: 2026-07-28
- Confirmed through operator-executed runtime validation:
  - API health returned HTTP 200.
  - Success path (registered SpecPilot repository):
    - `POST /projects/:id/discovery/refresh` returned HTTP 200.
    - `git.status` was `ok` with branch `main`, a valid HEAD SHA, and dirty state.
    - `openspec.status` was `ok` with active changes, artifact presence, and `archivedChangeCount`.
    - `GET /projects/:id/discovery` returned the persisted snapshot.
    - Project detail returned `lastInspectedAt` matching the persisted discovery `inspectedAt`.
  - Get-before-refresh path (disposable registered project):
    - Registration returned HTTP 201 with `lastInspectedAt` null.
    - `GET /projects/:id/discovery` returned HTTP 404 with `code` `discovery_not_found`.
  - Completed blocked discovery cycle (same disposable project; no Git; no `openspec/` root):
    - `POST` discovery refresh returned HTTP 200 (not 422 or 500).
    - `git.status` was `blocked` with `code` `not_a_git_repository`.
    - `openspec.status` was `blocked` with `code` `openspec_root_missing`.
    - `GET` discovery returned the same persisted blocked snapshot.
    - Project detail contained a non-null `lastInspectedAt`.
  - Cleanup:
    - Disposable `Project` row deleted by generated id only; cascading configuration rows removed via FK.
    - Only the generated temporary directory was removed.
    - Subsequent project GET returned 404; disposable directory gone.
    - No database reset, volume removal, unrelated project modification, or `axioma-db-dev` impact.
  - Visual validation (Spanish console):
    - “Actualizar descubrimiento” is displayed.
    - Discovery refresh presentation accepted by the operator.
    - No `w01-s04` multi-project discovery-health dashboard or delivery controls are present.
- Task 10.1 approved by operator.
- Continuous closure sequence (Verify → sync → post-sync validation → archive → final validation → one final commit → push) explicitly authorized; no further routine approval requested.
