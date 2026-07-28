# Human validation — PASS

Operator-executed runtime validation for `chg-w02-s01-context-source-resolution`
via `evidence/operator-human-validation.sh`.

## Confirmed outcomes

### Success path — registered SpecPilot project

- `GET /projects` returned 200.
- Registered `spec-pilot` resolved for stage `planning`.
- `POST /projects/:id/context-sources/resolve` returned 200.
- Response `status` was `ok`.
- Response `stage` was `planning`.
- `configurationVersionId` and `sourceHash` were present.
- `pathCount` matched `paths.length`.
- Returned paths were deterministic repository-relative paths.
- No returned path matched mandatory secret excludes:
  - `**/.env`
  - `**/.env.*`
  - `**/*.pem`
  - `**/*.key`
  - `**/secrets/**`
- Successful resolve returned **466** candidate paths.
- No file contents were exposed.

### Empty success path — disposable registered project

- Registration returned 201.
- Configuration attached successfully.
- Resolve returned 200 with `status` `ok`.
- `pathCount` was `0` and `paths` was `[]`.
- Empty result treated as successful resolution, not blocked.

### Blocked path

- Invalid stage returned 422.
- Response `status` was `blocked`.
- Code was `invalid_review_stage`.
- No partial paths were returned.

### Cleanup

- Only the disposable `Project` row was deleted by its generated id.
- Only the generated temporary repository directory was removed.
- Deleted project subsequently returned 404; disposable directory gone.
- No database reset or volume removal; no unrelated project modified.
- `axioma-db-dev` remained untouched.

## Operator confirmation

- [x] Success path confirmed
- [x] Empty or blocked path confirmed
- Operator: SpecPilot operator (explicit chat approval)
- Date: 2026-07-28
- Notes: Human validation for task 8.1 approved; continuous closure sequence authorized (Verify → sync → archive → commit → push).
