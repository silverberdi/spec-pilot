# Context and Privacy Architecture

## Minimal-context policy

Each review stage uses a configured source profile. Files are selected by deterministic include/exclude rules, then reduced to relevant sections where possible. Full source code is sent only when necessary for an applied implementation review.

## Mandatory exclusions

- `.env`, `.env.*`
- private keys and certificates
- credential stores
- tokens, cookies, authorization headers
- known secret folders
- binary artifacts unless explicitly supported later
- paths outside the registered repository

## Secret scanning

Before API submission, every text payload passes deterministic pattern checks plus configurable entropy/credential detectors. Any positive finding blocks the run unless the offending content can be safely excluded while retaining sufficient evidence.

## Audit

Persist the file path, hash, selected line ranges, exclusion reason, estimated tokens, and whether content was transmitted. Never persist raw secret values.
