import type { ProjectErrorCode } from '@specpilot/shared-contracts';
import {
  buildProbeOutboundBody,
  extractSafeProviderRequestId,
  validateProviderEnvelope,
} from './deepseek-envelope';
import type {
  DeepseekClock,
  DeepseekGatewayPort,
  DeepseekSleeper,
  DeepseekStructuredRequest,
  DeepseekStructuredResult,
} from './deepseek-gateway.port';
import { defaultClock, defaultSleeper } from './deepseek-gateway.port';
import {
  DEEPSEEK_CHAT_COMPLETIONS_PATH,
  DEEPSEEK_MAX_ATTEMPTS,
  DEEPSEEK_PER_ATTEMPT_TIMEOUT_MS,
  DEEPSEEK_PRODUCTION_BASE_URL,
  DEEPSEEK_RETRY_AFTER_CAP_MS,
  DEEPSEEK_RETRY_DELAYS_MS,
} from './deepseek.constants';

export type DeepseekHttpAdapterOptions = {
  /** Test-only base URL; never from project.yaml / public DTOs / Compose. */
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  clock?: DeepseekClock;
  sleeper?: DeepseekSleeper;
};

function classifyHttpStatus(status: number): {
  retry: boolean;
  code: ProjectErrorCode;
} {
  if (status === 401 || status === 403) {
    return { retry: false, code: 'deepseek_auth_failed' };
  }
  if (status === 402) {
    return { retry: false, code: 'deepseek_insufficient_balance' };
  }
  if (status === 429) {
    return { retry: true, code: 'deepseek_rate_limited' };
  }
  if (status === 500 || status === 503) {
    return { retry: true, code: 'deepseek_provider_unavailable' };
  }
  if (status >= 400 && status < 500) {
    return { retry: false, code: 'deepseek_request_rejected' };
  }
  if (status >= 500) {
    return { retry: true, code: 'deepseek_provider_unavailable' };
  }
  return { retry: false, code: 'deepseek_request_rejected' };
}

function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) {
    return undefined;
  }
  const asInt = Number.parseInt(header, 10);
  if (Number.isFinite(asInt) && asInt >= 0) {
    return Math.min(asInt * 1000, DEEPSEEK_RETRY_AFTER_CAP_MS);
  }
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) {
    const delta = dateMs - Date.now();
    if (delta > 0) {
      return Math.min(delta, DEEPSEEK_RETRY_AFTER_CAP_MS);
    }
  }
  return undefined;
}

export class DeepseekHttpAdapter implements DeepseekGatewayPort {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly clock: DeepseekClock;
  private readonly sleeper: DeepseekSleeper;
  private nextDelayOverrideMs: number | undefined;

  constructor(options: DeepseekHttpAdapterOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEEPSEEK_PRODUCTION_BASE_URL).replace(
      /\/$/,
      '',
    );
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.clock = options.clock ?? defaultClock;
    this.sleeper = options.sleeper ?? defaultSleeper;
  }

  async completeStructured(
    input: DeepseekStructuredRequest,
  ): Promise<DeepseekStructuredResult> {
    const started = this.clock.now();
    let attemptCount = 0;
    let lastFailure: DeepseekStructuredResult | null = null;

    for (let attempt = 1; attempt <= DEEPSEEK_MAX_ATTEMPTS; attempt += 1) {
      attemptCount = attempt;
      if (attempt > 1) {
        const delayIndex = attempt - 2;
        let delay: number =
          DEEPSEEK_RETRY_DELAYS_MS[
            Math.min(delayIndex, DEEPSEEK_RETRY_DELAYS_MS.length - 1)
          ] ?? 1000;
        if (this.nextDelayOverrideMs !== undefined) {
          delay = this.nextDelayOverrideMs;
          this.nextDelayOverrideMs = undefined;
        }
        await this.sleeper.sleep(delay);
      }

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        DEEPSEEK_PER_ATTEMPT_TIMEOUT_MS,
      );

      try {
        const response = await this.fetchImpl(
          `${this.baseUrl}${DEEPSEEK_CHAT_COMPLETIONS_PATH}`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${input.apiKey}`,
            },
            body: buildProbeOutboundBody(input.resolvedModelId),
            signal: controller.signal,
          },
        );

        if (response.status >= 200 && response.status < 300) {
          const buf = Buffer.from(await response.arrayBuffer());
          const validated = validateProviderEnvelope(
            buf,
            input.resolvedModelId,
          );
          if (!validated.ok) {
            return {
              ok: false,
              code: validated.code,
              attemptCount,
              latencyMs: this.clock.now() - started,
            };
          }
          return {
            ok: true,
            parsed: validated.parsed,
            attemptCount,
            providerHttpStatus: 200,
            providerRequestId: extractSafeProviderRequestId(response.headers),
            latencyMs: this.clock.now() - started,
            usage: validated.usage,
          };
        }

        const classified = classifyHttpStatus(response.status);
        lastFailure = {
          ok: false,
          code: classified.code,
          attemptCount,
          latencyMs: this.clock.now() - started,
        };
        if (!classified.retry || attempt === DEEPSEEK_MAX_ATTEMPTS) {
          return lastFailure;
        }
        if (response.status === 429 || response.status === 503) {
          const retryAfter = parseRetryAfterMs(
            response.headers.get('retry-after'),
          );
          if (retryAfter !== undefined) {
            this.nextDelayOverrideMs = retryAfter;
          }
        }
      } catch (err) {
        const aborted =
          err instanceof Error &&
          (err.name === 'AbortError' || /aborted/i.test(err.message));
        lastFailure = {
          ok: false,
          code: aborted ? 'deepseek_timeout' : 'deepseek_transport_failed',
          attemptCount,
          latencyMs: this.clock.now() - started,
        };
        if (attempt === DEEPSEEK_MAX_ATTEMPTS) {
          return lastFailure;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    return (
      lastFailure ?? {
        ok: false,
        code: 'deepseek_transport_failed',
        attemptCount,
        latencyMs: this.clock.now() - started,
      }
    );
  }
}
