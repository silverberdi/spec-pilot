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

/** Binding max size for `.specpilot/project.yaml` before parse (bytes). */
export const PROJECT_YAML_MAX_BYTES = 262144;

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
  configurationVersionId: string | null;
}

export interface ProjectConfigurationVersionDto {
  id: string;
  projectId: string;
  schemaVersion: number;
  sourceHash: string;
  normalizedConfig: Record<string, unknown>;
  validatedAt: string;
  createdAt: string;
}

export interface ProjectErrorResponse {
  code: string;
  message: string;
}

export type ConfigurationAttached = {
  status: 'attached';
  version: ProjectConfigurationVersionDto;
};

export type ConfigurationBlocked = {
  status: 'blocked';
  error: ProjectErrorResponse;
};

export type RegisterProjectResponse = ProjectDto & {
  configuration: ConfigurationAttached | ConfigurationBlocked;
};

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
  'configuration_not_found',
  'project_yaml_too_large',
  'project_yaml_parse_error',
  'unsupported_schema_version',
  'invalid_machine_id',
  'invalid_repository_contract',
  'invalid_executor',
  'invalid_validation_assistant',
  'invalid_budget_declaration',
  'invalid_context_patterns',
  'configuration_attach_failed',
  'configuration_refresh_failed',
  'not_a_git_repository',
  'git_inspect_failed',
  'git_inspection_timeout',
  'openspec_root_missing',
  'openspec_inspect_failed',
  'openspec_path_escape',
  'openspec_inspection_limit_exceeded',
  'discovery_not_found',
  'discovery_refresh_failed',
  'internal_error',
] as const;

export const GIT_DISCOVERY_BLOCKED_CODES = [
  'not_a_git_repository',
  'git_inspect_failed',
  'git_inspection_timeout',
] as const;

export type GitDiscoveryBlockedCode =
  (typeof GIT_DISCOVERY_BLOCKED_CODES)[number];

export const OPENSPEC_DISCOVERY_BLOCKED_CODES = [
  'openspec_root_missing',
  'openspec_inspect_failed',
  'openspec_path_escape',
  'openspec_inspection_limit_exceeded',
] as const;

export type OpenSpecDiscoveryBlockedCode =
  (typeof OPENSPEC_DISCOVERY_BLOCKED_CODES)[number];

export type OpenSpecChangeSummaryDto = {
  name: string;
  hasProposal: boolean;
  hasDesign: boolean;
  hasTasks: boolean;
  hasSpecs: boolean;
};

export type GitDiscoveryOk = {
  status: 'ok';
  isRepo: true;
  headSha: string | null;
  branch: string | null;
  dirty: boolean;
  upstream: string | null;
};

export type GitDiscoveryBlocked = {
  status: 'blocked';
  code: GitDiscoveryBlockedCode;
  message: string;
};

export type GitDiscoveryDto = GitDiscoveryOk | GitDiscoveryBlocked;

export type OpenSpecDiscoveryOk = {
  status: 'ok';
  rootPresent: true;
  activeChanges: OpenSpecChangeSummaryDto[];
  archivedChangeCount: number;
  cliAvailable: boolean;
};

export type OpenSpecDiscoveryBlocked = {
  status: 'blocked';
  code: OpenSpecDiscoveryBlockedCode;
  message: string;
};

export type OpenSpecDiscoveryDto = OpenSpecDiscoveryOk | OpenSpecDiscoveryBlocked;

export type ProjectDiscoveryDto = {
  projectId: string;
  inspectedAt: string;
  git: GitDiscoveryDto;
  openspec: OpenSpecDiscoveryDto;
};

export const GIT_EXEC_TIMEOUT_MS = 5000;
export const GIT_EXEC_MAX_BUFFER = 1048576;
export const OPENSPEC_MAX_ACTIVE_CHANGES = 500;
export const OPENSPEC_MAX_SPECS_ENTRIES = 10000;

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

export function isProjectConfigurationVersionDto(
  value: unknown,
): value is ProjectConfigurationVersionDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record['id'] === 'string' &&
    typeof record['projectId'] === 'string' &&
    typeof record['schemaVersion'] === 'number' &&
    typeof record['sourceHash'] === 'string' &&
    typeof record['normalizedConfig'] === 'object' &&
    record['normalizedConfig'] !== null &&
    !Array.isArray(record['normalizedConfig']) &&
    typeof record['validatedAt'] === 'string' &&
    typeof record['createdAt'] === 'string'
  );
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
      typeof record['lastInspectedAt'] === 'string') &&
    (record['configurationVersionId'] === null ||
      typeof record['configurationVersionId'] === 'string')
  );
}

export function isRegisterProjectResponse(
  value: unknown,
): value is RegisterProjectResponse {
  if (!isProjectDto(value)) {
    return false;
  }
  const record = value as unknown as Record<string, unknown>;
  const configuration = record['configuration'];
  if (typeof configuration !== 'object' || configuration === null) {
    return false;
  }
  const cfg = configuration as Record<string, unknown>;
  if (cfg['status'] === 'attached') {
    if ('error' in cfg) {
      return false;
    }
    if (!isProjectConfigurationVersionDto(cfg['version'])) {
      return false;
    }
    return (
      record['configurationVersionId'] ===
      (cfg['version'] as ProjectConfigurationVersionDto).id
    );
  }
  if (cfg['status'] === 'blocked') {
    if ('version' in cfg) {
      return false;
    }
    if (!isProjectErrorResponse(cfg['error'])) {
      return false;
    }
    return record['configurationVersionId'] === null;
  }
  return false;
}

function isGitDiscoveryBlockedCode(
  value: unknown,
): value is GitDiscoveryBlockedCode {
  return (
    typeof value === 'string' &&
    (GIT_DISCOVERY_BLOCKED_CODES as readonly string[]).includes(value)
  );
}

function isOpenSpecDiscoveryBlockedCode(
  value: unknown,
): value is OpenSpecDiscoveryBlockedCode {
  return (
    typeof value === 'string' &&
    (OPENSPEC_DISCOVERY_BLOCKED_CODES as readonly string[]).includes(value)
  );
}

function isOpenSpecChangeSummaryDto(
  value: unknown,
): value is OpenSpecChangeSummaryDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record['name'] === 'string' &&
    typeof record['hasProposal'] === 'boolean' &&
    typeof record['hasDesign'] === 'boolean' &&
    typeof record['hasTasks'] === 'boolean' &&
    typeof record['hasSpecs'] === 'boolean'
  );
}

export function isGitDiscoveryDto(value: unknown): value is GitDiscoveryDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['status'] === 'ok') {
    if ('code' in record) {
      return false;
    }
    const headSha = record['headSha'];
    const branch = record['branch'];
    const upstream = record['upstream'];
    const headOk =
      headSha === null ||
      (typeof headSha === 'string' && /^[a-f0-9]{40}$/.test(headSha));
    const branchOk =
      branch === null ||
      (typeof branch === 'string' && branch.length > 0 && branch !== 'HEAD');
    return (
      record['isRepo'] === true &&
      headOk &&
      branchOk &&
      typeof record['dirty'] === 'boolean' &&
      (upstream === null || typeof upstream === 'string')
    );
  }
  if (record['status'] === 'blocked') {
    return (
      isGitDiscoveryBlockedCode(record['code']) &&
      typeof record['message'] === 'string' &&
      !('isRepo' in record)
    );
  }
  return false;
}

export function isOpenSpecDiscoveryDto(
  value: unknown,
): value is OpenSpecDiscoveryDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['status'] === 'ok') {
    if ('code' in record) {
      return false;
    }
    if (record['rootPresent'] !== true) {
      return false;
    }
    if (!Array.isArray(record['activeChanges'])) {
      return false;
    }
    if (!record['activeChanges'].every(isOpenSpecChangeSummaryDto)) {
      return false;
    }
    return (
      typeof record['archivedChangeCount'] === 'number' &&
      Number.isFinite(record['archivedChangeCount']) &&
      typeof record['cliAvailable'] === 'boolean'
    );
  }
  if (record['status'] === 'blocked') {
    return (
      isOpenSpecDiscoveryBlockedCode(record['code']) &&
      typeof record['message'] === 'string' &&
      !('rootPresent' in record)
    );
  }
  return false;
}

export function isProjectDiscoveryDto(
  value: unknown,
): value is ProjectDiscoveryDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record['projectId'] === 'string' &&
    typeof record['inspectedAt'] === 'string' &&
    isGitDiscoveryDto(record['git']) &&
    isOpenSpecDiscoveryDto(record['openspec'])
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
