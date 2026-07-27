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

/** Binding max length for Project.displayName (contract, model, tests). */
export const DISPLAY_NAME_MAX_LENGTH = 120;

export type ProjectStatus = 'registered';

export interface RegisterProjectRequest {
  repositoryPath: string;
  displayName?: string;
}

export interface ProjectDto {
  id: string;
  slug: string;
  displayName: string;
  repositoryPath: string;
  status: ProjectStatus;
  registeredAt: string;
  lastInspectedAt: string | null;
}

export interface ProjectErrorResponse {
  code: string;
  message: string;
}

export const PROJECT_ERROR_CODES = [
  'empty_repository_path',
  'relative_repository_path',
  'repository_not_found',
  'repository_not_directory',
  'repository_not_readable',
  'project_yaml_missing',
  'project_yaml_not_regular_file',
  'invalid_derived_slug',
  'invalid_display_name',
  'duplicate_repository_path',
  'duplicate_project_slug',
  'project_not_found',
  'internal_error',
] as const;

export type ProjectErrorCode = (typeof PROJECT_ERROR_CODES)[number];

export function isProjectErrorResponse(
  value: unknown,
): value is ProjectErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record['code'] === 'string' && typeof record['message'] === 'string';
}

export function isProjectDto(value: unknown): value is ProjectDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record['id'] === 'string' &&
    typeof record['slug'] === 'string' &&
    typeof record['displayName'] === 'string' &&
    typeof record['repositoryPath'] === 'string' &&
    record['status'] === 'registered' &&
    typeof record['registeredAt'] === 'string' &&
    (record['lastInspectedAt'] === null ||
      typeof record['lastInspectedAt'] === 'string')
  );
}

/**
 * Validates register request shape and displayName max length.
 * Path eligibility (absolute, realpath, yaml) is enforced by the API preflight.
 */
export function validateRegisterProjectRequest(
  value: unknown,
):
  | { ok: true; request: RegisterProjectRequest }
  | { ok: false; code: 'invalid_display_name' | 'empty_repository_path' } {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, code: 'empty_repository_path' };
  }
  const record = value as Record<string, unknown>;
  if (typeof record['repositoryPath'] !== 'string') {
    return { ok: false, code: 'empty_repository_path' };
  }
  const repositoryPath = record['repositoryPath'];
  if (repositoryPath.trim().length === 0) {
    return { ok: false, code: 'empty_repository_path' };
  }

  let displayName: string | undefined;
  if (record['displayName'] !== undefined && record['displayName'] !== null) {
    if (typeof record['displayName'] !== 'string') {
      return { ok: false, code: 'invalid_display_name' };
    }
    displayName = record['displayName'];
    if (displayName.trim().length > DISPLAY_NAME_MAX_LENGTH) {
      return { ok: false, code: 'invalid_display_name' };
    }
  }

  return {
    ok: true,
    request: displayName === undefined ? { repositoryPath } : { repositoryPath, displayName },
  };
}
