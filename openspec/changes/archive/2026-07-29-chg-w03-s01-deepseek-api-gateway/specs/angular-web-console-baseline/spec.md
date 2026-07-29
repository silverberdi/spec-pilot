## ADDED Requirements

### Requirement: Minimal Spanish-first DeepSeek probe console outcomes
`apps/web` MUST expose a Spanish-first DeepSeek probe operator surface distinct from resolve, secret-scan, context-bundle, and disclosure preview/approval actions. The surface MUST provide an explicit **Probar DeepSeek** action and MAY offer a stage control limited to `DeepseekProbeStage` values `discovery` | `planning` | `applied` | `verify` with default `discovery`. The surface MUST show idle, loading, success, and blocked/error states. On success it MUST show resolved model id, schema id `deepseek-gateway-probe-v1`, `attemptCount`, `latencyMs`, optional usage, and short `parsed.message` without raw provider dumps. Copy MUST state that the probe does not start a review run and does not reserve budget. The browser MUST NOT collect or submit API keys or base URLs.

#### Scenario: Probe success outcomes are visible
- **WHEN** a DeepSeek probe returns ok for the selected project
- **THEN** the Spanish console shows success including resolved model, schema id, attempt count, latency, and short parsed message without raw provider bodies

#### Scenario: Probe blocked outcomes are visible
- **WHEN** probe returns a closed DeepSeek error such as `deepseek_not_configured` or `deepseek_schema_invalid`
- **THEN** the console shows a blocked/error state with a safe operator-visible message and no API key or raw upstream body

#### Scenario: No browser API key field
- **WHEN** the DeepSeek probe surface is rendered
- **THEN** no API-key or base-URL input control is present
