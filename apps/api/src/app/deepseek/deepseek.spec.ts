import {
  buildProbeOutboundBody,
  validateProviderEnvelope,
} from './deepseek-envelope';
import {
  resolveDeepseekModelAlias,
  modelFromProbeStage,
  modelFromReviewStage,
} from './deepseek-model-catalog';
import { DeepseekHttpAdapter } from './deepseek-http.adapter';
import { DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID } from '@specpilot/shared-contracts';
import { DEEPSEEK_MAX_TOKENS, DEEPSEEK_PRODUCTION_BASE_URL } from './deepseek.constants';

describe('deepseek-model-catalog', () => {
  it('resolves aliases and rejects legacy ids', () => {
    expect(resolveDeepseekModelAlias('deepseek-flash')).toBe('deepseek-v4-flash');
    expect(resolveDeepseekModelAlias('deepseek-pro')).toBe('deepseek-v4-pro');
    expect(resolveDeepseekModelAlias('deepseek-chat')).toBeNull();
    expect(resolveDeepseekModelAlias('deepseek-reasoner')).toBeNull();
  });

  it('resolves models for all four probe stages', () => {
    const review = {
      provider: 'deepseek',
      models: {
        discovery: 'deepseek-flash',
        planning: 'deepseek-pro',
        applied: 'deepseek-pro',
        verify: 'deepseek-v4-pro',
      },
    };
    expect(modelFromProbeStage(review, 'discovery')?.resolvedModelId).toBe(
      'deepseek-v4-flash',
    );
    expect(modelFromProbeStage(review, 'planning')?.resolvedModelId).toBe(
      'deepseek-v4-pro',
    );
    expect(modelFromProbeStage(review, 'applied')?.alias).toBe('deepseek-pro');
    expect(modelFromProbeStage(review, 'verify')?.resolvedModelId).toBe(
      'deepseek-v4-pro',
    );
  });

  it('maps review stage new to discovery model key', () => {
    const review = {
      provider: 'deepseek',
      models: {
        discovery: 'deepseek-flash',
        planning: 'deepseek-pro',
        applied: 'deepseek-pro',
        verify: 'deepseek-pro',
      },
    };
    expect(modelFromReviewStage(review, 'new')?.resolvedModelId).toBe(
      'deepseek-v4-flash',
    );
    expect(modelFromReviewStage(review, 'planning')?.alias).toBe('deepseek-pro');
  });
});

describe('deepseek-envelope', () => {
  const validParsed = {
    ok: true as const,
    probe: DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID,
    message: 'gateway-probe-ok',
  };

  function envelope(overrides: Record<string, unknown> = {}) {
    return Buffer.from(
      JSON.stringify({
        model: 'deepseek-v4-flash',
        choices: [
          {
            finish_reason: 'stop',
            message: { content: JSON.stringify(validParsed) },
          },
        ],
        ...overrides,
      }),
      'utf8',
    );
  }

  it('builds outbound body with binding constants', () => {
    const body = JSON.parse(buildProbeOutboundBody('deepseek-v4-flash'));
    expect(body.stream).toBe(false);
    expect(body.temperature).toBe(0);
    expect(body.max_tokens).toBe(DEEPSEEK_MAX_TOKENS);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(JSON.stringify(body.messages).toLowerCase()).toContain('json');
  });

  it('accepts a valid one-choice stop envelope', () => {
    const result = validateProviderEnvelope(envelope(), 'deepseek-v4-flash');
    expect(result.ok).toBe(true);
  });

  it('rejects empty content', () => {
    const buf = Buffer.from(
      JSON.stringify({
        choices: [{ finish_reason: 'stop', message: { content: '   ' } }],
      }),
      'utf8',
    );
    expect(validateProviderEnvelope(buf, 'deepseek-v4-flash')).toEqual({
      ok: false,
      code: 'deepseek_empty_response',
    });
  });

  it('rejects finish_reason length as truncated', () => {
    const buf = Buffer.from(
      JSON.stringify({
        choices: [
          {
            finish_reason: 'length',
            message: { content: JSON.stringify(validParsed) },
          },
        ],
      }),
      'utf8',
    );
    expect(validateProviderEnvelope(buf, 'deepseek-v4-flash')).toEqual({
      ok: false,
      code: 'deepseek_truncated_response',
    });
  });

  it('rejects multiple choices and schema mismatch', () => {
    expect(
      validateProviderEnvelope(
        Buffer.from(
          JSON.stringify({
            choices: [
              { finish_reason: 'stop', message: { content: '{}' } },
              { finish_reason: 'stop', message: { content: '{}' } },
            ],
          }),
          'utf8',
        ),
        'deepseek-v4-flash',
      ).ok,
    ).toBe(false);

    const schemaFail = Buffer.from(
      JSON.stringify({
        choices: [
          {
            finish_reason: 'stop',
            message: { content: JSON.stringify({ ok: true, probe: 'x', message: 'a' }) },
          },
        ],
      }),
      'utf8',
    );
    expect(validateProviderEnvelope(schemaFail, 'deepseek-v4-flash')).toEqual({
      ok: false,
      code: 'deepseek_schema_invalid',
    });
  });

  it('rejects model mismatch and oversize body', () => {
    expect(
      validateProviderEnvelope(
        envelope({ model: 'deepseek-v4-pro' }),
        'deepseek-v4-flash',
      ),
    ).toEqual({ ok: false, code: 'deepseek_model_mismatch' });

    const big = Buffer.alloc(65_537, 0x61);
    expect(validateProviderEnvelope(big, 'deepseek-v4-flash')).toEqual({
      ok: false,
      code: 'deepseek_response_invalid',
    });
  });
});

describe('deepseek-http.adapter retries', () => {
  it('retries 503 with binding delays via injected sleeper', async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const fetchImpl = jest.fn(async () => {
      calls += 1;
      if (calls < 3) {
        return new Response('unavailable', { status: 503 });
      }
      return new Response(
        JSON.stringify({
          model: 'deepseek-v4-flash',
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({
                  ok: true,
                  probe: DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID,
                  message: 'ok',
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as unknown as typeof fetch;

    const adapter = new DeepseekHttpAdapter({
      baseUrl: 'http://deepseek.test',
      fetchImpl,
      clock: { now: () => 1_000_000 + sleeps.length },
      sleeper: {
        sleep: async (ms) => {
          sleeps.push(ms);
        },
      },
    });

    const result = await adapter.completeStructured({
      resolvedModelId: 'deepseek-v4-flash',
      requestedModelAlias: 'deepseek-flash',
      apiKey: 'test-key',
      profile: 'probe',
    });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.attemptCount).toBe(3);
      expect(result.invocationBegan).toBe(true);
    }
    expect(sleeps).toEqual([500, 1000]);
    expect(DEEPSEEK_PRODUCTION_BASE_URL).toBe('https://api.deepseek.com');
  });

  it('does not retry semantic envelope failures', async () => {
    let calls = 0;
    const fetchImpl = jest.fn(async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          choices: [{ finish_reason: 'stop', message: { content: '{' } }],
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const adapter = new DeepseekHttpAdapter({
      fetchImpl,
      sleeper: { sleep: async () => undefined },
    });
    const result = await adapter.completeStructured({
      resolvedModelId: 'deepseek-v4-flash',
      requestedModelAlias: 'deepseek-flash',
      apiKey: 'test-key',
      profile: 'probe',
    });
    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.invocationBegan).toBe(true);
      expect(result.attemptCount).toBe(1);
    }
    expect(calls).toBe(1);
  });

  it('maps 402 to insufficient balance without retry', async () => {
    let calls = 0;
    const adapter = new DeepseekHttpAdapter({
      fetchImpl: (async () => {
        calls += 1;
        return new Response('pay', { status: 402 });
      }) as unknown as typeof fetch,
      sleeper: { sleep: async () => undefined },
    });
    const result = await adapter.completeStructured({
      resolvedModelId: 'deepseek-v4-flash',
      requestedModelAlias: 'deepseek-flash',
      apiKey: 'test-key',
      profile: 'probe',
    });
    expect(result).toMatchObject({
      status: 'failed',
      invocationBegan: true,
      code: 'deepseek_insufficient_balance',
      attemptCount: 1,
    });
    expect(calls).toBe(1);
  });

  it('returns invocationBegan false and attemptCount 0 when key missing', async () => {
    let calls = 0;
    const adapter = new DeepseekHttpAdapter({
      fetchImpl: (async () => {
        calls += 1;
        return new Response('x', { status: 200 });
      }) as unknown as typeof fetch,
    });
    const result = await adapter.completeStructured({
      resolvedModelId: 'deepseek-v4-flash',
      requestedModelAlias: 'deepseek-flash',
      apiKey: '  ',
      profile: 'probe',
    });
    expect(result).toMatchObject({
      status: 'failed',
      invocationBegan: false,
      code: 'deepseek_not_configured',
      attemptCount: 0,
    });
    expect(calls).toBe(0);
  });
});
