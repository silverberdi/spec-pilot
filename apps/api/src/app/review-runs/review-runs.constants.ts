import { REVIEW_RUN_IN_FLIGHT_STATES } from '@specpilot/shared-contracts';

/** Create-time stale recovery TTL (design D0 / D9). */
export const STALE_RUN_TTL_MS = 180_000;

export const IN_FLIGHT_STATES = REVIEW_RUN_IN_FLIGHT_STATES;

export const REVIEW_RUN_LIST_DEFAULT_LIMIT = 20;
export const REVIEW_RUN_LIST_MAX_LIMIT = 50;

/** Gateway codes that map to transmission outcome `provider_failed`. */
export const PROVIDER_FAILED_CODES = new Set<string>([
  'deepseek_not_configured',
  'deepseek_auth_failed',
  'deepseek_insufficient_balance',
  'deepseek_rate_limited',
  'deepseek_provider_unavailable',
  'deepseek_transport_failed',
  'deepseek_timeout',
  'deepseek_request_rejected',
  'deepseek_gateway_failed',
]);

/** Gateway codes that map to transmission outcome `response_invalid`. */
export const RESPONSE_INVALID_CODES = new Set<string>([
  'deepseek_empty_response',
  'deepseek_truncated_response',
  'deepseek_response_invalid',
  'deepseek_schema_invalid',
  'deepseek_model_mismatch',
  'review_schema_invalid',
  'review_verdict_invalid',
]);
