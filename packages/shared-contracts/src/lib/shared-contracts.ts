export type HealthStatus = 'ok';
export type HealthService = 'api';

export interface HealthResponse {
  status: HealthStatus;
  service: HealthService;
}

export function createHealthResponse(): HealthResponse {
  return { status: 'ok', service: 'api' };
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
