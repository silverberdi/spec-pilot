# Human validation

Status: **PASS** (operator-approved)

Confirmed through operator-executed runtime validation of
`openspec/changes/chg-w02-s02-secret-detection-and-exclusion/evidence/operator-human-validation.sh`.

## Runtime freshness

- `GET /health` returned 200.
- Secret-scan route was live (`project_not_found` for an unknown project).

## Clean success

- Disposable registration HTTP 201.
- Secret scan HTTP 200, `status=ok`, `stage=planning`.
- `candidatePathCount=2`, `eligiblePathCount=2`, matched `eligiblePaths.length`.
- `findings=[]`, `unscannable=[]`.
- Eligible paths repository-relative and deterministically ordered.
- No file contents, matched values, snippets, offsets, line numbers, or surrounding context.

## Partial exclusion success

- Secret scan HTTP 200, `status=ok`.
- At least one clean path remained eligible; dirty path excluded.
- Findings contained only `path` + `detectorId`.
- No secret value or snippet in the response.
- `eligiblePathCount=2`, finding count 2.

## Unsafe blocked outcome

- Disposable registration HTTP 201.
- Secret scan HTTP 422, `status=blocked`, `code=unsafe_context_bundle`.
- Safe counts present: `candidatePathCount=1`, `findingCount=2`, `unscannableCount=0`.
- No eligiblePaths, finding paths, detector details, unscannable paths, matched values, snippets, offsets, line numbers, file contents, stacks, or absolute host paths.

## Unscannable-content behavior

- Disposable registration HTTP 201.
- Secret scan HTTP 200.
- Unscannable path excluded; clean path remained eligible.
- Response exposed only `path` + `reason=unscannable_content`.
- No bytes or decoded content returned.

## Cleanup

- Only the three disposable Project rows deleted by generated id.
- Only the three generated temporary repository directories removed.
- Deleted projects subsequently returned 404; disposable directories no longer existed.
- No database reset or volume removal; no existing project modified; `axioma-db-dev` untouched.

## Overall

**PASS**

- Operator: SpecPilot operator
- Date: 2026-07-28
- Result: PASS
