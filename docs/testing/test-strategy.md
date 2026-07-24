# Test Strategy

## Layers

- Domain unit tests for state machines, verdict invariants, budget math, and configuration rules.
- Application tests with fake repository/OpenSpec/DeepSeek ports.
- Infrastructure integration tests using temporary Git repositories and Testcontainers PostgreSQL.
- Contract tests for DeepSeek structured responses and schema failures.
- API integration tests for registration, runs, findings, budget blocks, and history.
- Angular component tests for operational states.
- Playwright E2E for the four review journeys and secret/budget blocking.

## Non-negotiable failure tests

- stale or invalid project configuration;
- repository path escape;
- detected secret;
- insufficient evidence;
- invalid model JSON;
- budget exhausted;
- Verify result not exactly `PASS`;
- blocking finding accidentally paired with an approval verdict.
