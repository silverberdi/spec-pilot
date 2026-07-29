# Human validation — chg-w02-s03-context-bundle-manifest

Status: **PASS (operator confirmed)**

Confirmed through operator-executed runtime validation via
`evidence/operator-human-validation.sh`.

## Runtime freshness

- `GET /health` returned 200.
- The context-bundles route was live and returned `project_not_found` for an unknown project.
- The database schema contained no `content_transmitted` column.

## Required checks

### Clean success path

- Disposable project registration returned 201.
- `POST /projects/:id/context-bundles` returned 201 with `status=ok`, `stage=planning`.
- `manifestSchemaVersion=1`, `selectionPolicyId=full-file-lines-v1`,
  `tokenEstimatorId=unicode-codepoints-div-4-v1`.
- `manifestHash` and every `contentHash` were valid lowercase SHA-256 hex.
- Counts matched (`entryCount`/`eligiblePathCount`/`excludedPathCount`).
- `totalTokenEstimate` matched the sum of per-entry estimates.
- Independent content-hash and token calculations matched the API.
- Unicode fixture proved Unicode code points (not UTF-16 units or raw UTF-8 bytes).
- No `contentTransmitted`, file contents, decoded text, snippets, matched values,
  secrets, absolute host paths, or raw bytes in the response.

### GET / latest / append-only

- GET by id returned 200 with unchanged persisted material.
- Latest `stage=planning&limit=1` returned the most recent bundle id.
- Duplicate create returned 201 with a new UUID and equal `manifestHash`;
  two independent rows; no overwrite.

### Empty / oversize+clean / unsafe / invalid query

- Empty manifest: 201 with zero entries/exclusions/tokens and valid algorithm ids + hash.
- Oversize+clean: clean in entries; oversize excluded once as `unscannable_content`
  without contentHash/lineRanges/tokenEstimate; no file contents exposed.
- Unsafe oversize-only: 422 `blocked` / `unsafe_context_bundle` with safe counts only
  (`candidatePathCount=1`, `findingCount=0`, `unscannableCount=1`); zero rows persisted.
- Invalid latest `limit=2`: 422 `invalid_context_bundle_query` (not blocked DTO); no row churn.

### Persistence / cleanup

- Row counts and duplicate hash/id invariants held; metadata-only JSON; no
  `content_transmitted` column; no content/path leakage in persisted payloads.
- Only disposable Project rows deleted by id (FK cascade for ContextBundle);
  only generated temp directories removed; disposable projects/bundles gone;
  no DB reset/volume removal; existing projects unmodified; `axioma-db-dev` untouched.

## Operator sign-off

- [x] Operator confirms success path observed
- [x] Operator confirms blocked/failure path observed
- [x] Date / initials: 2026-07-29 / operator

Overall result: **PASS**
