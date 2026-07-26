import {
  createHealthResponse,
  createReadyResponse,
  isHealthResponse,
  isReadyResponse,
} from './shared-contracts';

describe('shared-contracts health validator', () => {
  it('accepts the exact health success contract', () => {
    const payload = createHealthResponse();
    expect(isHealthResponse(payload)).toBe(true);
    expect(payload).toEqual({ status: 'ok', service: 'api' });
  });

  it('rejects invalid or incomplete payloads', () => {
    expect(isHealthResponse(null)).toBe(false);
    expect(isHealthResponse(undefined)).toBe(false);
    expect(isHealthResponse({})).toBe(false);
    expect(isHealthResponse({ status: 'ok' })).toBe(false);
    expect(isHealthResponse({ service: 'api' })).toBe(false);
    expect(isHealthResponse({ status: 'down', service: 'api' })).toBe(false);
    expect(isHealthResponse({ status: 'ok', service: 'web' })).toBe(false);
  });

  it('accepts the readiness success contract', () => {
    const payload = createReadyResponse();
    expect(isReadyResponse(payload)).toBe(true);
    expect(payload).toEqual({
      status: 'ok',
      service: 'api',
      database: 'ok',
    });
  });
});
