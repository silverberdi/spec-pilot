# Operator commands — chg-w02-s04-context-preview-and-approval

Hyphenated OpenSpec commands (operator-facing):

```text
/opsx-apply chg-w02-s04-context-preview-and-approval
/opsx-verify chg-w02-s04-context-preview-and-approval
/opsx-sync chg-w02-s04-context-preview-and-approval
/opsx-archive chg-w02-s04-context-preview-and-approval
```

## Success path (API)

1. Register project and create a context bundle for a stage (`POST /projects/:id/context-bundles`).
2. Preview: `POST /projects/:id/context-bundles/:bundleId/preview` with `{}`.
3. Approve: `POST /projects/:id/context-bundles/:bundleId/disclosure-approvals` with `{ "previewSessionId": "<id>", "manifestHash": "<hash>", "decision": "approved" }`.
4. Status: `GET /projects/:id/context-bundles/:bundleId/disclosure-status`.
5. Latest: `GET /projects/:id/disclosure-approvals?stage=<stage>&limit=1`.

## Console

Use **Vista previa** then **Aprobar divulgación** on the disclosure panel. Preview sessions expire in 15 minutes. Approval does not send content to DeepSeek.

## Blocked examples

- Approve without `previewSessionId` → `disclosure_preview_required`
- Approve after mutating a previewed file → `disclosure_preview_integrity_mismatch`
- Approve after session expiry → `disclosure_preview_expired`
