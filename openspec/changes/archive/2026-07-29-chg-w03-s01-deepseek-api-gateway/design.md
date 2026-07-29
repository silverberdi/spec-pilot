## Context

Wave 2 is archived through `w02-s04`: SpecPilot can resolve stage-scoped context, secret-scan it fail-closed, persist immutable `ContextBundle` manifests, and require metadata-only disclosure preview → explicit approval. No SpecPilot code path yet calls DeepSeek.

Slice `w03-s01-deepseek-api-gateway` opens Wave 3 by delivering a **bounded provider gateway** that invokes DeepSeek V4 Flash/Pro through the official OpenAI-compatible API with **structured JSON** responses validated against local schemas. Stakeholders: SpecPilot operator (probe/invoke); Cursor (sole implementer). Main-only working policy remains binding.

This slice does **not** own review-run orchestration (`w03-s02`), budget reserve/reconcile/hard-block (`w03-s03`), or findings/prompts/history (`w03-s04`). ADR-004 still forbids editing target repositories or executing delivery workflows from SpecPilot; calling DeepSeek is allowed.

Official model IDs (verified at design time against DeepSeek API docs): `deepseek-v4-flash`, `deepseek-v4-pro`. Production base URL (sole): `https://api.deepseek.com`.

## Goals / Non-Goals

**Goals:**

- Provide a NestJS DeepSeek gateway port/adapter in `apps/api` that can call Flash and Pro with structured JSON, validate the full provider envelope and local probe schema fail-closed, and expose deterministic retries for transient failures only.
- Map portable `project.yaml` model aliases (`deepseek-flash` / `deepseek-pro`, and already-qualified `deepseek-v4-*`) to official API model IDs using a closed **`DeepseekProbeStage`** (not `ReviewStage`).
- Load the API key only from SpecPilot-owned environment (`DEEPSEEK_API_KEY` only)—never from `project.yaml`, never committed, never browser-supplied.
- Expose a project-scoped **probe** API + Spanish-first console so operators can prove connectivity and structured-output validation without a review-run control plane.
- Return safe execution metadata (`attemptCount`, `providerHttpStatus`, optional safe `providerRequestId`, total `latencyMs`, usage summaries, schema id)—never API keys, raw provider bodies, `reasoning_content`, or secrets.
- Deliver deterministic automated evidence via a fakeable DeepSeek port and injected clock/sleeper; keep quality gates green without weakening repo secret scanning.
- Update docs/context inventory as needed.

**Non-Goals:**

- Review-run state machine, multi-step analysis pipelines, SSE progress for runs (`w03-s02`).
- Monthly budget estimate, reserve, reconcile, or hard-block (`w03-s03`)—probe MUST NOT claim budget reservation.
- Findings ledger, consolidated prompts, run history product surfaces (`w03-s04`).
- Sending approved context-bundle excerpts / file bodies on the probe path (probe uses a fixed synthetic schema payload only).
- Client-supplied prompts, schemas, API keys, base URLs, temperature, tools, or messages.
- Providers other than DeepSeek; OpenAI/Anthropic as product providers.
- Persisting durable provider-call ledgers or mutating `ContextBundle` / disclosure rows; no Prisma migration.
- Streaming (`stream` always `false`).
- Runtime `DEEPSEEK_BASE_URL` as operator/Compose configuration.
- Reusing `ReviewStage` (including `new`) on the probe endpoint without a separate canonical contract change.
- Separate `apps/worker` deployable required for this slice (gateway lives in `apps/api`).
- Authentication/multiuser; Windows/Linux support; target-repo writes; delivery/Git write/OpenSpec apply-verify-sync-archive from SpecPilot.
- Weakening SpecPilot repo-level secret scanning / quality gates.
- Editing OpenSpec-generated integrations except via `openspec update`.

## Decisions

### D0 — Binding constants

| Constant | Value |
|---|---|
| Provider id | `deepseek` only |
| Official Flash model | `deepseek-v4-flash` |
| Official Pro model | `deepseek-v4-pro` |
| Production base URL | `https://api.deepseek.com` (**sole**; no operator override) |
| Chat path | `/chat/completions` |
| `response_format` | `{ type: 'json_object' }` |
| `thinking` | `{ type: 'disabled' }` |
| `temperature` | `0` |
| `max_tokens` | `256` |
| `stream` | `false` |
| Max provider response body | `65536` bytes |
| Probe schema id | `deepseek-gateway-probe-v1` |
| Env API key | `DEEPSEEK_API_KEY` (**only** operator-supplied gateway secret/config) |
| `maxAttempts` | `3` |
| Retry delays | `500` ms before attempt 2; `1000` ms before attempt 3 (factor `2`, **jitter = none**) |
| Per-attempt timeout | `30_000` ms |
| `Retry-After` cap | `2000` ms (honor when valid on 429/503; else binding delay) |
| Default probe stage | `discovery` |

Apply-time verification: re-check official DeepSeek docs; if model IDs change, update `DeepseekModelCatalog` + shared contracts in one place—do not invent alternate providers.

### D1 — Ports and adapters (modular monolith)

```ts
interface DeepseekGatewayPort {
  completeStructured(input: DeepseekStructuredRequest): Promise<DeepseekStructuredResult>;
}
```

- **Production adapter:** HTTP client to DeepSeek Chat Completions using the **constant** production base URL; native `fetch` (or Nest-injected HTTP) with `AbortController` per attempt.
- **Test adapter:** in-memory fake returning fixture envelopes / transport errors / invalid JSON; replaces the port via DI—**no** runtime URL override required for automated tests.
- **Test-only URL injection:** if an HTTP-adapter integration test needs a local server, allow an **internal constructor / test-only** injected base URL that is **never** sourced from `project.yaml`, public DTOs, Angular, committed env, or normal Compose runtime.
- Nest module `DeepseekModule` owned by `apps/api`; later slices (`w03-s02+`) consume the same port and MUST NOT bypass it with ad-hoc HTTP.

- *Alternative considered:* call DeepSeek from Angular. Rejected — key would leak to browser.
- *Alternative considered:* operator-configurable `DEEPSEEK_BASE_URL`. Rejected — SSRF / misconfig surface; production URL is fixed (D4).

### D2 — Closed `DeepseekProbeStage` (not `ReviewStage`)

```ts
type DeepseekProbeStage =
  | 'discovery'
  | 'planning'
  | 'applied'
  | 'verify';
```

**Rules (binding):**

- `POST /projects/:id/deepseek/probe` accepts **only** `DeepseekProbeStage`.
- Default exact: **`discovery`** when `stage` is omitted.
- Resolution against active `ProjectConfigurationVersion` snapshot:
  - `discovery` → `review.models.discovery`
  - `planning` → `review.models.planning`
  - `applied` → `review.models.applied`
  - `verify` → `review.models.verify`
- **Do not** accept `new` on the probe endpoint.
- **Do not** reuse `ReviewStage` for this request unless a later approved change explicitly revises the canonical review-stage contract; `ReviewStage` continues to include `new` for resolve/secret-scan/bundles and is a different type.
- Unknown stage, `new`, or any extra body field → HTTP **422** `invalid_deepseek_probe_request` (no HTTP to DeepSeek).

**Alias catalog (unchanged):**

| Config / request alias | Resolved API model |
|---|---|
| `deepseek-flash` | `deepseek-v4-flash` |
| `deepseek-v4-flash` | `deepseek-v4-flash` |
| `deepseek-pro` | `deepseek-v4-pro` |
| `deepseek-v4-pro` | `deepseek-v4-pro` |
| legacy `deepseek-chat` / `deepseek-reasoner` | **reject** → `deepseek_model_unresolved` |

If `review.provider !== 'deepseek'` or the stage alias cannot resolve → `deepseek_model_unresolved`. Do **not** enforce `monthlyBudgetUsd` in this slice.

### D3 — Outbound probe body (exact constants)

The production adapter MUST send a fixed synthetic Chat Completions body (no client prompts/messages/tools/schema/temperature/base URL/key):

- `model`: resolved API model id
- `stream`: `false`
- `temperature`: `0`
- `max_tokens`: `256`
- `response_format`: `{ type: 'json_object' }`
- `thinking`: `{ type: 'disabled' }`
- `messages`: gateway-owned fixed system+user content that includes the word `json` and an example matching `deepseek-gateway-probe-v1` only

Probe MUST NOT read repository files, `ContextBundle` rows, disclosure sessions/approvals, or operator free-text.

### D4 — Production base URL security

- Sole production base URL: `https://api.deepseek.com`.
- **Remove** `DEEPSEEK_BASE_URL` from normal production/runtime configuration, operator docs, and Compose wiring.
- Compose / `.env.example` expose **only** `DEEPSEEK_API_KEY` (empty placeholder in example).
- Automated tests replace the port/adapter through DI; local fake-provider tests do not require a runtime URL override.
- Internal test-only injected URL is permitted solely for adapter HTTP integration tests (D1).

### D5 — Provider envelope validation (after HTTP 2xx, exact order, non-retryable)

After a successful HTTP status (2xx), validate in **this order**; stop at first failure; **never retry** any of these:

1. Response body byte length ≤ `65536`; else fail closed (`deepseek_response_invalid` / oversized treated as invalid envelope—binding: reject oversize before parse).
2. Body is valid JSON as the provider HTTP envelope.
3. `choices` is an array.
4. `choices.length === 1`.
5. `choices[0]` exists.
6. `finish_reason === 'stop'` (any other, especially `length` → `deepseek_truncated_response`).
7. `choices[0].message` exists.
8. `message.content` is a `string`.
9. `content.trim().length > 0` (else `deepseek_empty_response`).
10. `JSON.parse(content)` with **no** repair (failure → `deepseek_response_invalid`).
11. Parsed object satisfies **exactly** `deepseek-gateway-probe-v1` (else `deepseek_schema_invalid`).
12. If `response.model` is present, it MUST be compatible with `resolvedModelId` (else `deepseek_model_mismatch`).

Ignore and **never return**: `reasoning_content`, raw provider body, other provider fields, full header maps.

**Local schema `deepseek-gateway-probe-v1` (only registry entry this slice):**

```ts
{
  ok: true;
  probe: 'deepseek-gateway-probe-v1';
  message: string; // non-empty, max 200 chars
}
```

Validation via shared type guards / pure helpers—**no Zod-as-default**.

**Code mapping (binding):**

| Failure | Code | Retry? |
|---|---|---|
| empty / missing content | `deepseek_empty_response` | no |
| `finish_reason !== 'stop'` (esp. `length`) | `deepseek_truncated_response` | no |
| malformed envelope or invalid content JSON | `deepseek_response_invalid` | no |
| valid JSON, wrong local schema | `deepseek_schema_invalid` | no |
| returned model incompatible | `deepseek_model_mismatch` | no |

### D6 — Deterministic retries

| Setting | Binding |
|---|---|
| `maxAttempts` | `3` |
| Delay before attempt 2 | `500` ms |
| Delay before attempt 3 | `1000` ms |
| Exponential factor | `2` |
| Jitter | **none** |
| Per-attempt timeout | `30_000` ms via `AbortController` (cancel timed-out request) |
| `latencyMs` | **total wall-clock** including all attempts and delays |
| `Retry-After` on 429/503 | honor when valid, **capped at 2000 ms**; else use binding delay |
| Tests | injected clock/sleeper; **never** real-time waits |

**Retry matrix:**

| Condition | Retry? |
|---|---|
| network reset / connection failure / transient DNS | yes |
| timeout | yes until `maxAttempts` |
| HTTP 429 | yes |
| HTTP 500 | yes |
| HTTP 503 | yes |
| HTTP 400 / 401 / 402 / 403 / 422 / any other 4xx | **no** |
| HTTP success with envelope/empty/truncation/JSON/schema/model mismatch | **no** |

**Final codes after exhaustion / terminal classification:**

| Case | Code |
|---|---|
| Missing/blank `DEEPSEEK_API_KEY` (before any HTTP) | `deepseek_not_configured` |
| HTTP 401 / 403 | `deepseek_auth_failed` |
| HTTP 402 | `deepseek_insufficient_balance` |
| HTTP 429 exhausted | `deepseek_rate_limited` |
| HTTP 500 / 503 exhausted | `deepseek_provider_unavailable` |
| network / DNS / reset exhausted | `deepseek_transport_failed` |
| timeout exhausted | `deepseek_timeout` |
| HTTP 400 / 422 / other non-auth 4xx | `deepseek_request_rejected` |
| Unexpected local exception | `deepseek_gateway_failed` |

Do **not** collapse `deepseek_insufficient_balance` or `deepseek_provider_unavailable` into transport failure.

### D7 — API surface (project-scoped probe)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/projects/:id/deepseek/probe` | Live structured probe using `DeepseekProbeStage` → Flash/Pro |

**Request body:**

```ts
{ stage?: DeepseekProbeStage } // default 'discovery'; no other fields
```

Reject `new`, unknown stages, extra fields, client prompts, schemas, keys, base URLs, temperature, tools, messages → `invalid_deepseek_probe_request`.

**Ok response (binding):**

```ts
{
  status: 'ok';
  projectId: string;
  stage: DeepseekProbeStage;
  providerId: 'deepseek';
  modelAlias: string;
  resolvedModelId: 'deepseek-v4-flash' | 'deepseek-v4-pro';
  schemaId: 'deepseek-gateway-probe-v1';
  attemptCount: number; // integer 1..3
  providerHttpStatus: 200;
  providerRequestId?: string; // only from a documented safe request-id header when present
  latencyMs: number; // total wall-clock including retries/delays
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  parsed: { ok: true; probe: 'deepseek-gateway-probe-v1'; message: string };
}
```

**Blocked/error:** `ProjectErrorResponse` with closed codes (D9). Never include Authorization, API key, stacks, raw provider bodies, `reasoning_content`, or all headers. `attemptCount` on error responses only if the neighboring error contract safely supports optional metadata; otherwise keep `attemptCount` in safe server logs and test evidence only.

No update/delete product endpoints. No generic public “send any prompt” API in this slice.

### D8 — API key and readiness

- `DEEPSEEK_API_KEY` is the **only** operator-supplied gateway secret/config value.
- Missing or blank key → fail **before HTTP** with `deepseek_not_configured` (zero attempts).
- General application `/health` remains healthy when the optional gateway key is absent.
- Gateway-specific readiness/probe state reports **not configured** when the key is absent (distinct from general health).
- Never log, persist, echo, or include the key in DTOs, evidence, or archives.
- `.env.example` contains only the variable name with an empty placeholder.
- Compose forwards `DEEPSEEK_API_KEY` from gitignored local env only.
- Redaction of `sk-` / bearer patterns is defense-in-depth only; **raw upstream error bodies must not be returned at all**.

### D9 — Closed error codes

Add to `ProjectErrorResponse.code` / shared guards:

- `deepseek_not_configured`
- `deepseek_auth_failed`
- `deepseek_insufficient_balance`
- `deepseek_rate_limited`
- `deepseek_provider_unavailable`
- `deepseek_transport_failed`
- `deepseek_timeout`
- `deepseek_request_rejected`
- `deepseek_model_unresolved`
- `deepseek_empty_response`
- `deepseek_truncated_response`
- `deepseek_response_invalid`
- `deepseek_schema_invalid`
- `deepseek_model_mismatch`
- `invalid_deepseek_probe_request`
- `deepseek_gateway_failed` (HTTP 500 unexpected)

These MUST NOT be members of context-bundle / disclosure blocked unions.

### D10 — Safe execution metadata and observability

**Success DTO** MUST include `attemptCount` (1..3), `providerHttpStatus: 200`, optional `providerRequestId` (safe request-id header only), and total `latencyMs`.

**Server logs MAY include:** `projectId`, `probeStage`, configured alias, resolved model, `attemptCount`, total latency, HTTP status class, safe error code.

**Server logs MUST exclude:** prompts, request bodies, response bodies, API keys, Authorization, `reasoning_content`, and parsed `message`.

### D11 — Angular Spanish-first probe surface

In `apps/web`, add a minimal DeepSeek probe panel distinct from resolve / secret-scan / bundle / disclosure:

- Actions: **Probar DeepSeek** (probe); optional stage select among the four `DeepseekProbeStage` values (default discovery).
- States: idle, loading, success, blocked/error.
- Success shows: resolved model id, schema id, `attemptCount`, `latencyMs`, token usage if present, short `parsed.message` (not raw provider dump).
- Copy MUST state this is a connectivity/structured-output probe and does **not** start a review run or reserve budget.
- No API-key or base-URL input fields in the browser.

### D12 — Test strategy (explicit matrix)

| Area | Required coverage |
|---|---|
| Stages | Default `discovery`; all four probe stages; reject `new`, unknown stages, extra fields |
| Outbound | Exact body constants (`max_tokens` 256, `stream` false, `response_format`, `thinking` disabled, `temperature` 0) |
| Envelope | One valid choice + `finish_reason` `stop`; empty content; missing choices/message/content; multiple choices; `finish_reason` `length`; invalid envelope JSON; invalid content JSON; schema mismatch; model mismatch; body > 65536 |
| Retries | No retry for any semantic/envelope failure; exact attempts/delays for network, timeout, 429, 500, 503; `Retry-After` cap; no retry for 400/401/402/403/422 |
| Classification | `deepseek_insufficient_balance`; `deepseek_provider_unavailable`; do not collapse into transport |
| Metadata | `attemptCount` and total `latencyMs` semantics (injected clock/sleeper) |
| Secrets | API key never in logs/DTOs/evidence; missing key ⇒ zero HTTP attempts |
| Isolation | Probe path never reads repository, bundle, or disclosure data |
| Layers | Unit + integration (fake port) + web idle/loading/success/blocked + shared contract guards |

Live DeepSeek network calls are **not** required for automated gates; operator human validation may use a real key when present.

### D13 — No durable provider-call ledger / migration

Probe outcomes are ephemeral HTTP responses (+ UI state). No `DeepseekProviderCall` / review-run / budget / finding tables; **no Prisma migration**. Durable call audit belongs to `w03-s02` / `w03-s03`.

### D14 — Rollback

Revert gateway module, routes, UI, shared contracts, Compose/env docs; no DB migration to undo; never reset foreign volumes (including `axioma-db-dev`).

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Official model IDs change | Single catalog (D0); re-verify at apply; reject legacy chat/reasoner |
| JSON mode still returns invalid shape | Ordered envelope + local schema fail-closed (D5); no retry |
| Accidental secret exfiltration via probe | Synthetic payload only; no repo/bundle/disclosure reads (D3/D8) |
| SSRF via base URL override | Fixed production URL; no `DEEPSEEK_BASE_URL` (D4) |
| Operators confuse probe with review run | UI copy + Non-Goals; no run/budget APIs |
| Budget overspend before `w03-s03` | `max_tokens` 256; single probe; hard-block deferred |
| Flaky retry tests | Injected clock/sleeper; zero real waits (D6) |
| Key committed accidentally | Env-only; `.env` gitignored; secret scan; never return raw upstream bodies |
| Collapsing provider economics into transport | Distinct `deepseek_insufficient_balance` / `deepseek_provider_unavailable` (D6) |

## Open Questions

None blocking. Specs MUST absorb `DeepseekProbeStage`, envelope order, retry matrix, fixed base URL, success metadata, and closed codes from this design.
