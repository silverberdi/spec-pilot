# .gitignore adoption review

Reviewed and corrected for `chg-w00-s01-repository-governance-and-openspec-foundation`.

## Secret / credential hygiene (aligned with `scripts/scan-secrets.py`)

Ignored (non-exhaustive):

- `.env`, `.env.*` (with `!.env.example` / `!.env.*.example` exceptions)
- `*.pem`, `*.p12`, `*.key`, `*.keystore`, `id_rsa`, `id_ed25519`
- `credentials.json`, `**/credentials/**`, `**/secrets/**`

## Outcome

`.gitignore` remains the adopted secret/credential hygiene gate for tracked content.
Live secrets must not be committed; validation also fail-closes via `scan-secrets.py`.
