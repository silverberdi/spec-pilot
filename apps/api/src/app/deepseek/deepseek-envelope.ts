import {
  DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID,
  isDeepseekGatewayProbeParsedDto,
  type DeepseekGatewayProbeParsedDto,
  type DeepseekResolvedModelId,
} from '@specpilot/shared-contracts';
import { isResolvedModelCompatible } from './deepseek-model-catalog';
import { DEEPSEEK_MAX_RESPONSE_BYTES } from './deepseek.constants';

export type EnvelopeValidationSuccess = {
  ok: true;
  parsed: DeepseekGatewayProbeParsedDto;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export type EnvelopeValidationFailure = {
  ok: false;
  code:
    | 'deepseek_response_invalid'
    | 'deepseek_empty_response'
    | 'deepseek_truncated_response'
    | 'deepseek_schema_invalid'
    | 'deepseek_model_mismatch';
};

export function validateProviderEnvelope(
  bodyBytes: Buffer,
  resolvedModelId: DeepseekResolvedModelId,
): EnvelopeValidationSuccess | EnvelopeValidationFailure {
  if (bodyBytes.byteLength > DEEPSEEK_MAX_RESPONSE_BYTES) {
    return { ok: false, code: 'deepseek_response_invalid' };
  }

  let envelope: unknown;
  try {
    envelope = JSON.parse(bodyBytes.toString('utf8'));
  } catch {
    return { ok: false, code: 'deepseek_response_invalid' };
  }

  if (envelope === null || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return { ok: false, code: 'deepseek_response_invalid' };
  }
  const record = envelope as Record<string, unknown>;
  const choices = record['choices'];
  if (!Array.isArray(choices)) {
    return { ok: false, code: 'deepseek_response_invalid' };
  }
  if (choices.length !== 1) {
    return { ok: false, code: 'deepseek_response_invalid' };
  }
  const choice0 = choices[0];
  if (choice0 === null || typeof choice0 !== 'object' || Array.isArray(choice0)) {
    return { ok: false, code: 'deepseek_response_invalid' };
  }
  const choice = choice0 as Record<string, unknown>;
  if (choice['finish_reason'] !== 'stop') {
    return { ok: false, code: 'deepseek_truncated_response' };
  }
  const message = choice['message'];
  if (message === null || typeof message !== 'object' || Array.isArray(message)) {
    return { ok: false, code: 'deepseek_response_invalid' };
  }
  const content = (message as Record<string, unknown>)['content'];
  if (typeof content !== 'string') {
    return { ok: false, code: 'deepseek_response_invalid' };
  }
  if (content.trim().length === 0) {
    return { ok: false, code: 'deepseek_empty_response' };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    return { ok: false, code: 'deepseek_response_invalid' };
  }
  if (!isDeepseekGatewayProbeParsedDto(parsedJson)) {
    return { ok: false, code: 'deepseek_schema_invalid' };
  }

  if (typeof record['model'] === 'string') {
    if (!isResolvedModelCompatible(record['model'], resolvedModelId)) {
      return { ok: false, code: 'deepseek_model_mismatch' };
    }
  }

  let usage: EnvelopeValidationSuccess['usage'];
  const usageRaw = record['usage'];
  if (usageRaw !== null && typeof usageRaw === 'object' && !Array.isArray(usageRaw)) {
    const u = usageRaw as Record<string, unknown>;
    usage = {};
    if (typeof u['prompt_tokens'] === 'number') {
      usage.promptTokens = u['prompt_tokens'];
    }
    if (typeof u['completion_tokens'] === 'number') {
      usage.completionTokens = u['completion_tokens'];
    }
    if (typeof u['total_tokens'] === 'number') {
      usage.totalTokens = u['total_tokens'];
    }
  }

  return {
    ok: true,
    parsed: parsedJson,
    usage,
  };
}

export function buildProbeOutboundBody(resolvedModelId: DeepseekResolvedModelId): string {
  const example = {
    ok: true,
    probe: DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID,
    message: 'gateway-probe-ok',
  };
  return JSON.stringify({
    model: resolvedModelId,
    stream: false,
    temperature: 0,
    max_tokens: 256,
    response_format: { type: 'json_object' },
    thinking: { type: 'disabled' },
    messages: [
      {
        role: 'system',
        content:
          'Return only valid json matching the example object. Do not include markdown.',
      },
      {
        role: 'user',
        content: `Respond with json exactly like this example: ${JSON.stringify(example)}`,
      },
    ],
  });
}

/** Documented safe request-id header names (first match wins). */
const SAFE_REQUEST_ID_HEADERS = [
  'x-request-id',
  'request-id',
  'x-ds-request-id',
] as const;

export function extractSafeProviderRequestId(
  headers: Headers | Record<string, string | undefined>,
): string | undefined {
  const get = (name: string): string | undefined => {
    if (typeof (headers as Headers).get === 'function') {
      return (headers as Headers).get(name) ?? undefined;
    }
    const record = headers as Record<string, string | undefined>;
    return record[name] ?? record[name.toLowerCase()];
  };
  for (const name of SAFE_REQUEST_ID_HEADERS) {
    const value = get(name);
    if (typeof value === 'string' && value.trim().length > 0 && value.length <= 128) {
      return value.trim();
    }
  }
  return undefined;
}
