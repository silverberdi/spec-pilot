## ADDED Requirements

### Requirement: Compose forwards only DEEPSEEK_API_KEY for the DeepSeek gateway
The local Compose API service MAY receive `DEEPSEEK_API_KEY` from gitignored local environment configuration. Normal production/runtime Compose configuration MUST NOT introduce operator-configurable `DEEPSEEK_BASE_URL`. Tracked `.env.example` (or equivalent) MUST list `DEEPSEEK_API_KEY` as an empty placeholder only and MUST NOT commit real keys. Foreign Docker resources including `axioma-db-dev` MUST remain untouched by SpecPilot Compose gateway wiring.

#### Scenario: Only the API key is operator-configurable for the gateway
- **WHEN** Compose and env example files for this change are inspected
- **THEN** `DEEPSEEK_API_KEY` may be forwarded from gitignored local env with an empty tracked placeholder, and `DEEPSEEK_BASE_URL` is not part of normal operator Compose configuration

#### Scenario: Foreign containers remain untouched
- **WHEN** SpecPilot Compose services are started or rebuilt for gateway key wiring
- **THEN** no foreign container such as `axioma-db-dev` is created, reset, or modified as part of that wiring

## MODIFIED Requirements

### Requirement: Env examples stay secret-safe
Compose and env documentation MUST use placeholders or documented non-secret local-development defaults only. Real credential-bearing env files MUST remain gitignored. The local runtime MUST NOT require committing secrets to satisfy Compose startup. When DeepSeek gateway support is documented, tracked examples MUST include only the `DEEPSEEK_API_KEY` variable name with an empty placeholder and MUST NOT document a normal-runtime `DEEPSEEK_BASE_URL` override.

#### Scenario: No secrets required in tracked Compose/env files
- **WHEN** tracked Compose and example env files are inspected
- **THEN** they contain only placeholders or documented non-secret local-development defaults and do not require committed secrets to start

#### Scenario: DeepSeek key placeholder is empty and base URL is not operator-configured
- **WHEN** tracked env examples mention DeepSeek gateway configuration
- **THEN** `DEEPSEEK_API_KEY` appears only as an empty placeholder and `DEEPSEEK_BASE_URL` is not exposed as normal operator configuration
