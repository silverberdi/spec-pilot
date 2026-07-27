import {
  createHealthResponse,
  createReadyResponse,
  DISPLAY_NAME_MAX_LENGTH,
  isHealthResponse,
  isProjectDto,
  isProjectErrorResponse,
  isReadyResponse,
  validateRegisterProjectRequest,
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

describe('shared-contracts project registration', () => {
  it('accepts a well-formed ProjectDto', () => {
    expect(
      isProjectDto({
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
      }),
    ).toBe(true);
  });

  it('rejects ProjectErrorResponse missing code or message', () => {
    expect(isProjectErrorResponse({ code: 'x' })).toBe(false);
    expect(isProjectErrorResponse({ message: 'y' })).toBe(false);
    expect(isProjectErrorResponse({ code: 'x', message: 'y' })).toBe(true);
  });

  it('rejects overlong displayName via register request validator', () => {
    const overlong = 'a'.repeat(DISPLAY_NAME_MAX_LENGTH + 1);
    const result = validateRegisterProjectRequest({
      repositoryPath: '/tmp/demo',
      displayName: overlong,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid_display_name');
    }
  });

  it('accepts valid register request with optional displayName', () => {
    const result = validateRegisterProjectRequest({
      repositoryPath: '/tmp/demo',
      displayName: ' Demo ',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.repositoryPath).toBe('/tmp/demo');
      expect(result.request.displayName).toBe(' Demo ');
    }
  });
});
