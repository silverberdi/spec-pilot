# w02 — Secure Context Assembly

## Goal

Deliver the secure context assembly capabilities defined by the roadmap while preserving the current release boundaries and OpenSpec governance.

## Slices

### `w02-s01-context-source-resolution`

Resolve stage-specific configured source sets.

Expected change: `chg-w02-s01-context-source-resolution`

### `w02-s02-secret-detection-and-exclusion`

Prevent secret disclosure and block unsafe bundles.

Expected change: `chg-w02-s02-secret-detection-and-exclusion`

### `w02-s03-context-bundle-manifest`

Create immutable bundle manifests, hashes, and token estimates.

Expected change: `chg-w02-s03-context-bundle-manifest`

### `w02-s04-context-preview-and-approval`

Preview content disclosure before first or policy-changing runs.

Expected change: `chg-w02-s04-context-preview-and-approval`

## Wave closure

All slices satisfy their acceptance criteria, deterministic checks pass, OpenSpec Verify is exactly `PASS`, documentation/context is synchronized, changes are synced and archived, and any explicitly required human approval is complete.
