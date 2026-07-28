# Human validation

Status: PASS

## Operator confirmation

- Date: 2026-07-27
- Confirmed through operator-executed runtime validation after Compose rebuild remediation:
  - API readiness returned HTTP 200.
  - Project detail returned `configurationVersionId`.
  - Valid configuration refresh returned HTTP 200.
  - GET active configuration returned HTTP 200.
  - Active snapshot contained `schemaVersion: 1`, expected normalized configuration, and exact-byte SHA-256 `sourceHash`.
  - Invalid YAML refresh returned HTTP 422 with `project_yaml_parse_error`.
  - Invalid refresh did not replace or invalidate the prior active configuration.
  - After restoring `project.yaml`, refresh returned HTTP 200.
  - Same configuration version id and `sourceHash` were reused (same-byte idempotency).
  - `.specpilot/project.yaml` was restored and its working-tree check was clean.
- Confirmed visually in the Spanish Angular console:
  - “Actualizar configuración” is available.
  - Successful refresh shows attached configuration outcome and summary.
  - A blocked configuration path is not presented as success.
  - No `w01-s04` discovery-health dashboard or later-slice functionality is present.
- Task 9.1 approved by operator.
- Continuous closure sequence (Verify → sync → archive → final validation → commit → push) explicitly authorized.
