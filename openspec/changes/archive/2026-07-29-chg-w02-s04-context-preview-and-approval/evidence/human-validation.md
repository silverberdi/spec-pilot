# Human validation — chg-w02-s04-context-preview-and-approval

Status: **PASS (operator confirmed)**

Confirmed through operator-executed runtime validation via
`evidence/operator-human-validation.sh`.

## Runtime freshness

- `GET /health` returned 200.
- Preview, disclosure-status, and disclosure-approvals routes were live.
- `context_disclosure_preview_sessions` existed.
- `context_disclosure_approvals` existed.
- `ContextBundle` had no approval, decision, preview-session, or transmission columns.

## Required checks

### Clean bundle

- Disposable project registration returned 201.
- Planning `ContextBundle` creation returned 201.
- Bundle status was `ok`.
- `manifestHash` was valid lowercase SHA-256.
- Bundle DTO contained no `contentTransmitted` field.

### Initial status

- HTTP 200.
- `approvalRequired` was true.
- `coveringApprovalId` was null.
- `previewPolicyId` was `bounded-selected-text-v1`.
- `approvalPolicyId` was `explicit-disclosure-approval-v1`.
- `contentTransmitted` was false.

### Preview

- HTTP 200.
- A preview session was created; `previewSessionId` present.
- Both policy ids matched the binding constants.
- `previewIntegrityHash` was valid lowercase SHA-256.
- `createdAt` / `expiresAt` valid; expiry ~15 minutes after creation.
- `itemCount` matched `items.length`.
- Repository-relative paths and valid content hashes returned.
- Excerpts matched stored line ranges; CRLF preserved exactly; Unicode exact.
- Independent content-hash and `previewIntegrityHash` checks passed.
- No absolute host paths, raw bytes, secret values, detector payloads, stacks,
  or unexpected body fields exposed.

### Preview persistence

- Exactly one preview-session row created; metadata only.
- No excerpt, file body, decoded text, raw bytes, snippets, secret values,
  or absolute repository paths persisted.

### Approval

- HTTP 201; bound to `previewSessionId`.
- `manifestHash` and `previewIntegrityHash` matched the preview.
- Both policy ids matched; `decision` was `approved`.
- `contentTransmitted` was false; `approvalRequired` was false.
- Exactly one append-only approval row created.
- No excerpts, file bodies, raw bytes, decoded text, host paths, or secrets returned.

### Post-approval status / latest

- Status HTTP 200: `approvalRequired` false; `coveringApprovalId` matched;
  `contentTransmitted` remained false; bundle identity unchanged.
- Latest HTTP 200: returned the created approval with matching session/policy ids
  and `contentTransmitted` false.

### Identical material coverage

- Second `ContextBundle` created with new UUID and equal `manifestHash`.
- Disclosure status returned `approvalRequired` false; existing approval covered it.
- No preview session or approval was auto-created.

### Blocked paths

- Mutate-after-preview: approval `422` `disclosure_preview_integrity_mismatch`;
  no approval row; re-preview against stale bundle `422`; no new session.
- Approval without `previewSessionId`: `422` `disclosure_preview_required`; no row.
- Foreign preview session rejected with implemented closed code; no row.
- Invalid latest query: `422` `invalid_disclosure_approval_query`; no row churn.

### Persistence / immutability / cleanup

- `ContextBundle` row contents unchanged after preview and approval.
- All approval rows had `contentTransmitted` false.
- No `ContextBundle` approval/preview/transmission columns existed.
- Blocked flows persisted no approval rows; preview/approval metadata only.
- Only disposable Project rows deleted by generated ids; FK cascades removed
  bundles, sessions, and approvals; only generated disposable directories removed.
- Disposable projects returned 404; no disposable rows remained; original
  project count restored; no DB reset/volume deletion; no existing project
  modified; `axioma-db-dev` untouched.

## Operator sign-off

- [x] Operator confirms success path observed
- [x] Operator confirms blocked/failure path observed
- [x] Date / initials: 2026-07-29 / operator

Overall result: **PASS**
