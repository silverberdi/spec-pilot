## ADDED Requirements

### Requirement: Compose continues to forward DEEPSEEK_API_KEY for review-run orchestration
Local Compose MUST continue to forward SpecPilot-owned `DEEPSEEK_API_KEY` into the API service for DeepSeek gateway use by both probe and review-run orchestration. Compose MUST NOT commit secrets, MUST NOT introduce operator `DEEPSEEK_BASE_URL`, and MUST NOT touch foreign Docker resources.

#### Scenario: API service still receives DEEPSEEK_API_KEY from env
- **WHEN** Compose API service environment is inspected
- **THEN** `DEEPSEEK_API_KEY` may be forwarded from gitignored local env and no secret value is committed
