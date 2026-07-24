# Security Baseline

- Bind local services to loopback by default.
- No authentication initially means no remote exposure.
- Never log provider API keys or raw authorization values.
- Store secrets outside Git using environment injection or macOS keychain-compatible mechanism.
- Validate repository paths with realpath and deny traversal/symlink escape.
- Read-only repository permissions in the initial release.
- Secret scan every outbound context payload.
- Encrypt sensitive database fields if any are later introduced.
- Maintain immutable audit events for run state transitions and budget decisions.
- Add Google authentication before remote or multiuser access.
