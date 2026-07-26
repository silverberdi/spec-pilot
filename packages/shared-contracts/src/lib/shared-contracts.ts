export type HealthStatus = 'ok';
export type HealthService = 'api';
export type DatabaseStatus = 'ok' | 'unavailable';

export interface HealthResponse {
  status: HealthStatus;
  service: HealthService;
}

export interface ReadyResponse {
  status: HealthStatus;
  service: HealthService;
  database: 'ok';
}

export interface UnreadyResponse {
  status: 'error';
  service: HealthService;
  database: 'unavailable';
}

export function createHealthResponse(): HealthResponse {
  return { status: 'ok', service: 'api' };
}

export function createReadyResponse(): ReadyResponse {
  return { status: 'ok', service: 'api', database: 'ok' };
}

export function createUnreadyResponse(): UnreadyResponse {
  return { status: 'error', service: 'api', database: 'unavailable' };
}

/**
 * Minimal repository-owned runtime validator for the baseline health contract.
 * Framework-independent (no Angular / NestJS imports).
 */
export function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return record['status'] === 'ok' && record['service'] === 'api';
}

export function isReadyResponse(value: unknown): value is ReadyResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record['status'] === 'ok' &&
    record['service'] === 'api' &&
    record['database'] === 'ok'
  );
}
