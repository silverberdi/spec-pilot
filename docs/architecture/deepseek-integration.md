# DeepSeek Integration

## Models

- `deepseek-v4-flash`: discovery, extraction, classification, summarization, inexpensive structural prechecks.
- `deepseek-v4-pro`: planning review, applied implementation review, correction prompt synthesis, and Verify readiness analysis.

Model routing is configurable per project and stage.

## API contract

Use the official OpenAI-compatible DeepSeek endpoint. Require JSON output validated against a local schema. Store provider request metadata without secrets.

## Reliability

- one deliberate request per analysis step unless a retry is explicitly allowed;
- retry only transient transport or rate-limit failures;
- never retry semantic failures automatically;
- cap retries and reserve estimated budget before dispatch;
- record model alias and resolved model version when available;
- fail closed when response schema validation fails.

## Cost controls

Estimate tokens before execution, reserve projected cost, reject when remaining budget is insufficient, then reconcile estimated versus actual usage.
