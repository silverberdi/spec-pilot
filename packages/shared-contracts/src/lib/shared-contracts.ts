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

export const DISCOVERY_HEALTH_STATUSES = [
  'never_inspected',
  'ok',
  'blocked',
  'invalid',
] as const;

export type DiscoveryHealthStatus = (typeof DISCOVERY_HEALTH_STATUSES)[number];

export const DISCOVERY_HEALTH_SUBSYSTEM_STATUSES = [
  'ok',
  'blocked',
  'unknown',
] as const;

export type DiscoveryHealthSubsystemStatus =
  (typeof DISCOVERY_HEALTH_SUBSYSTEM_STATUSES)[number];

export type ProjectDiscoveryHealthDto = {
  status: DiscoveryHealthStatus;
  inspectedAt: string | null;
  gitStatus: DiscoveryHealthSubsystemStatus;
  openspecStatus: DiscoveryHealthSubsystemStatus;
  summaryMessage: string | null;
};

export interface ProjectDto {
  id: string;
  slug: string;
  displayName: string;
  repositoryPath: string;
  status: ProjectStatus;
  registeredAt: string;
  lastInspectedAt: string | null;
  configurationVersionId: string | null;
  discoveryHealth: ProjectDiscoveryHealthDto;
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
  'invalid_review_stage',
  'context_path_escape',
  'context_entry_unreadable',
  'context_resolution_limit_exceeded',
  'context_resolution_timeout',
  'context_resolve_failed',
  'unsafe_context_bundle',
  'secret_scan_limit_exceeded',
  'secret_scan_timeout',
  'secret_scan_entry_unreadable',
  'secret_scan_failed',
  'context_bundle_failed',
  'context_bundle_not_found',
  'invalid_context_bundle_query',
  'disclosure_preview_required',
  'disclosure_preview_expired',
  'disclosure_preview_binding_mismatch',
  'disclosure_manifest_mismatch',
  'disclosure_preview_policy_mismatch',
  'disclosure_preview_integrity_mismatch',
  'disclosure_preview_entry_unreadable',
  'disclosure_preview_limit_exceeded',
  'disclosure_preview_timeout',
  'invalid_disclosure_approval',
  'invalid_disclosure_approval_query',
  'disclosure_preview_failed',
  'disclosure_approval_failed',
  'deepseek_not_configured',
  'deepseek_auth_failed',
  'deepseek_insufficient_balance',
  'deepseek_rate_limited',
  'deepseek_provider_unavailable',
  'deepseek_transport_failed',
  'deepseek_timeout',
  'deepseek_request_rejected',
  'deepseek_model_unresolved',
  'deepseek_empty_response',
  'deepseek_truncated_response',
  'deepseek_response_invalid',
  'deepseek_schema_invalid',
  'deepseek_model_mismatch',
  'invalid_deepseek_probe_request',
  'deepseek_gateway_failed',
  'invalid_review_run_request',
  'review_run_not_found',
  'review_run_in_progress',
  'review_context_bundle_required',
  'review_context_bundle_stage_mismatch',
  'review_disclosure_approval_required',
  'review_disclosure_policy_mismatch',
  'review_context_integrity_mismatch',
  'review_context_limit_exceeded',
  'review_model_unresolved',
  'review_run_invalid_transition',
  'review_run_interrupted',
  'review_schema_invalid',
  'review_verdict_invalid',
  'review_run_failed',
  'internal_error',
] as const;

export const REVIEW_STAGES = [
  'new',
  'planning',
  'applied',
  'verify',
] as const;

export type ReviewStage = (typeof REVIEW_STAGES)[number];

export type ContextSourceResolveRequest = {
  stage: ReviewStage;
};

export const CONTEXT_SOURCE_RESOLVE_BLOCKED_CODES = [
  'invalid_review_stage',
  'configuration_not_found',
  'invalid_context_patterns',
  'context_path_escape',
  'context_entry_unreadable',
  'context_resolution_limit_exceeded',
  'context_resolution_timeout',
  'repository_not_found',
  'repository_not_directory',
  'repository_not_readable',
] as const;

export type ContextSourceResolveBlockedCode =
  (typeof CONTEXT_SOURCE_RESOLVE_BLOCKED_CODES)[number];

export type ContextSourceResolveOkDto = {
  status: 'ok';
  projectId: string;
  stage: ReviewStage;
  configurationVersionId: string;
  sourceHash: string;
  resolvedAt: string;
  include: string[];
  exclude: string[];
  pathCount: number;
  paths: string[];
};

export type ContextSourceResolveBlockedDto = {
  status: 'blocked';
  projectId: string;
  stage: ReviewStage | null;
  code: ContextSourceResolveBlockedCode;
  message: string;
};

export type ContextSourceResolveDto =
  | ContextSourceResolveOkDto
  | ContextSourceResolveBlockedDto;

export const CONTEXT_SOURCE_MAX_VISITED_ENTRIES = 100000;
export const CONTEXT_SOURCE_MAX_MATCHED_FILES = 20000;
export const CONTEXT_SOURCE_MAX_PATH_BYTES = 4194304;
export const CONTEXT_SOURCE_RESOLVE_TIMEOUT_MS = 15000;

export type SecretScanRequest = {
  stage: ReviewStage;
};

export const SECRET_DETECTOR_IDS = [
  'aws_access_key',
  'generic_api_key_assignment',
  'private_key_block',
  'github_pat',
  'slack_token',
  'high_entropy_token',
] as const;

export type SecretDetectorId = (typeof SECRET_DETECTOR_IDS)[number];

export type SecretFindingDto = {
  path: string;
  detectorId: SecretDetectorId;
};

export type UnscannablePathDto = {
  path: string;
  reason: 'unscannable_content';
};

export type SecretScanOkDto = {
  status: 'ok';
  projectId: string;
  stage: ReviewStage;
  configurationVersionId: string;
  sourceHash: string;
  scannedAt: string;
  candidatePathCount: number;
  eligiblePathCount: number;
  eligiblePaths: string[];
  findings: SecretFindingDto[];
  unscannable: UnscannablePathDto[];
};

export const SECRET_SCAN_SPECIFIC_BLOCKED_CODES = [
  'unsafe_context_bundle',
  'secret_scan_limit_exceeded',
  'secret_scan_timeout',
  'secret_scan_entry_unreadable',
] as const;

export type SecretScanSpecificBlockedCode =
  (typeof SECRET_SCAN_SPECIFIC_BLOCKED_CODES)[number];

export type SecretScanBlockedCode =
  | SecretScanSpecificBlockedCode
  | ContextSourceResolveBlockedCode;

export type SecretScanBlockedDto = {
  status: 'blocked';
  projectId: string;
  stage: ReviewStage | null;
  code: SecretScanBlockedCode;
  message: string;
  candidatePathCount?: number;
  findingCount?: number;
  unscannableCount?: number;
};

export type SecretScanDto = SecretScanOkDto | SecretScanBlockedDto;

export const SECRET_SCAN_MAX_FILE_BYTES = 1048576;
export const SECRET_SCAN_MAX_TOTAL_BYTES = 52428800;
export const SECRET_SCAN_TIMEOUT_MS = 30000;
export const SECRET_SCAN_ENTROPY_MIN_LENGTH = 32;
export const SECRET_SCAN_ENTROPY_THRESHOLD = 4.5;
export const SECRET_SCAN_ENTROPY_MAX_POSITIVES_PER_FILE = 20;

export const MANDATORY_CONTEXT_EXCLUDES = [
  '**/.env',
  '**/.env.*',
  '**/*.pem',
  '**/*.key',
  '**/secrets/**',
] as const;

export const PICOMATCH_RESOLVE_OPTIONS = {
  dot: true,
  nocase: false,
  nonegate: true,
} as const;

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

export function isProjectDiscoveryHealthDto(
  value: unknown,
): value is ProjectDiscoveryHealthDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const status = record['status'];
  const gitStatus = record['gitStatus'];
  const openspecStatus = record['openspecStatus'];
  return (
    typeof status === 'string' &&
    (DISCOVERY_HEALTH_STATUSES as readonly string[]).includes(status) &&
    (record['inspectedAt'] === null ||
      typeof record['inspectedAt'] === 'string') &&
    typeof gitStatus === 'string' &&
    (DISCOVERY_HEALTH_SUBSYSTEM_STATUSES as readonly string[]).includes(
      gitStatus,
    ) &&
    typeof openspecStatus === 'string' &&
    (DISCOVERY_HEALTH_SUBSYSTEM_STATUSES as readonly string[]).includes(
      openspecStatus,
    ) &&
    (record['summaryMessage'] === null ||
      typeof record['summaryMessage'] === 'string')
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
      typeof record['configurationVersionId'] === 'string') &&
    isProjectDiscoveryHealthDto(record['discoveryHealth'])
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

export function isReviewStage(value: unknown): value is ReviewStage {
  return (
    typeof value === 'string' &&
    (REVIEW_STAGES as readonly string[]).includes(value)
  );
}

export function isContextSourceResolveBlockedCode(
  value: unknown,
): value is ContextSourceResolveBlockedCode {
  return (
    typeof value === 'string' &&
    (CONTEXT_SOURCE_RESOLVE_BLOCKED_CODES as readonly string[]).includes(value)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isContextSourceResolveOkDto(
  value: unknown,
): value is ContextSourceResolveOkDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['status'] !== 'ok') {
    return false;
  }
  if ('code' in record) {
    return false;
  }
  return (
    typeof record['projectId'] === 'string' &&
    isReviewStage(record['stage']) &&
    typeof record['configurationVersionId'] === 'string' &&
    typeof record['sourceHash'] === 'string' &&
    typeof record['resolvedAt'] === 'string' &&
    isStringArray(record['include']) &&
    isStringArray(record['exclude']) &&
    typeof record['pathCount'] === 'number' &&
    Number.isFinite(record['pathCount']) &&
    isStringArray(record['paths']) &&
    record['pathCount'] === (record['paths'] as string[]).length
  );
}

export function isContextSourceResolveBlockedDto(
  value: unknown,
): value is ContextSourceResolveBlockedDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['status'] !== 'blocked') {
    return false;
  }
  if ('paths' in record || 'pathCount' in record) {
    return false;
  }
  const stage = record['stage'];
  const stageOk = stage === null || isReviewStage(stage);
  return (
    typeof record['projectId'] === 'string' &&
    stageOk &&
    isContextSourceResolveBlockedCode(record['code']) &&
    typeof record['message'] === 'string'
  );
}

export function isContextSourceResolveDto(
  value: unknown,
): value is ContextSourceResolveDto {
  return (
    isContextSourceResolveOkDto(value) ||
    isContextSourceResolveBlockedDto(value)
  );
}

export function parseContextSourceResolveRequest(
  value: unknown,
):
  | { ok: true; request: ContextSourceResolveRequest }
  | { ok: false; code: 'invalid_review_stage' } {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, code: 'invalid_review_stage' };
  }
  const record = value as Record<string, unknown>;
  if (!isReviewStage(record['stage'])) {
    return { ok: false, code: 'invalid_review_stage' };
  }
  return { ok: true, request: { stage: record['stage'] } };
}

export function isSecretDetectorId(value: unknown): value is SecretDetectorId {
  return (
    typeof value === 'string' &&
    (SECRET_DETECTOR_IDS as readonly string[]).includes(value)
  );
}

export function isSecretScanBlockedCode(
  value: unknown,
): value is SecretScanBlockedCode {
  return (
    typeof value === 'string' &&
    ((SECRET_SCAN_SPECIFIC_BLOCKED_CODES as readonly string[]).includes(value) ||
      (CONTEXT_SOURCE_RESOLVE_BLOCKED_CODES as readonly string[]).includes(value))
  );
}

const FORBIDDEN_FINDING_FIELDS = [
  'matchedValue',
  'snippet',
  'offset',
  'offsets',
  'line',
  'lineNumber',
  'lineNumbers',
  'context',
  'surroundingContext',
] as const;

export function isSecretFindingDto(value: unknown): value is SecretFindingDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  for (const field of FORBIDDEN_FINDING_FIELDS) {
    if (field in record) {
      return false;
    }
  }
  return (
    typeof record['path'] === 'string' && isSecretDetectorId(record['detectorId'])
  );
}

export function isUnscannablePathDto(
  value: unknown,
): value is UnscannablePathDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record['path'] === 'string' &&
    record['reason'] === 'unscannable_content'
  );
}

export function isSecretScanOkDto(value: unknown): value is SecretScanOkDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['status'] !== 'ok') {
    return false;
  }
  if ('code' in record) {
    return false;
  }
  const findings = record['findings'];
  const unscannable = record['unscannable'];
  if (!Array.isArray(findings) || !findings.every(isSecretFindingDto)) {
    return false;
  }
  if (!Array.isArray(unscannable) || !unscannable.every(isUnscannablePathDto)) {
    return false;
  }
  return (
    typeof record['projectId'] === 'string' &&
    isReviewStage(record['stage']) &&
    typeof record['configurationVersionId'] === 'string' &&
    typeof record['sourceHash'] === 'string' &&
    typeof record['scannedAt'] === 'string' &&
    typeof record['candidatePathCount'] === 'number' &&
    Number.isFinite(record['candidatePathCount']) &&
    typeof record['eligiblePathCount'] === 'number' &&
    Number.isFinite(record['eligiblePathCount']) &&
    isStringArray(record['eligiblePaths']) &&
    record['eligiblePathCount'] ===
      (record['eligiblePaths'] as string[]).length
  );
}

export function isSecretScanBlockedDto(
  value: unknown,
): value is SecretScanBlockedDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['status'] !== 'blocked') {
    return false;
  }
  if (
    'eligiblePaths' in record ||
    'findings' in record ||
    'unscannable' in record ||
    'eligiblePathCount' in record
  ) {
    return false;
  }
  const stage = record['stage'];
  const stageOk = stage === null || isReviewStage(stage);
  if (
    !(
      typeof record['projectId'] === 'string' &&
      stageOk &&
      isSecretScanBlockedCode(record['code']) &&
      typeof record['message'] === 'string'
    )
  ) {
    return false;
  }
  const code = record['code'] as SecretScanBlockedCode;
  const hasCandidate = 'candidatePathCount' in record;
  const hasFinding = 'findingCount' in record;
  const hasUnscannable = 'unscannableCount' in record;
  if (code === 'unsafe_context_bundle') {
    return (
      hasCandidate &&
      hasFinding &&
      hasUnscannable &&
      typeof record['candidatePathCount'] === 'number' &&
      Number.isFinite(record['candidatePathCount']) &&
      typeof record['findingCount'] === 'number' &&
      Number.isFinite(record['findingCount']) &&
      typeof record['unscannableCount'] === 'number' &&
      Number.isFinite(record['unscannableCount'])
    );
  }
  return !hasCandidate && !hasFinding && !hasUnscannable;
}

export function isSecretScanDto(value: unknown): value is SecretScanDto {
  return isSecretScanOkDto(value) || isSecretScanBlockedDto(value);
}

export function parseSecretScanRequest(
  value: unknown,
):
  | { ok: true; request: SecretScanRequest }
  | { ok: false; code: 'invalid_review_stage' } {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, code: 'invalid_review_stage' };
  }
  const record = value as Record<string, unknown>;
  if (!isReviewStage(record['stage'])) {
    return { ok: false, code: 'invalid_review_stage' };
  }
  return { ok: true, request: { stage: record['stage'] } };
}

export const CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION = 1 as const;
export const CONTEXT_BUNDLE_SELECTION_POLICY_ID =
  'full-file-lines-v1' as const;
export const CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID =
  'unicode-codepoints-div-4-v1' as const;

export type ContextBundleRequest = {
  stage: ReviewStage;
};

export type ContextBundleLineRangeDto = {
  startLine: number;
  endLine: number;
};

export type ContextBundleEntryDto = {
  path: string;
  contentHash: string;
  lineRanges: ContextBundleLineRangeDto[];
  tokenEstimate: number;
};

export type ContextBundleExclusionDto = {
  path: string;
  reason: 'secret_finding' | 'unscannable_content';
};

export type ContextBundleOkDto = {
  status: 'ok';
  id: string;
  projectId: string;
  stage: ReviewStage;
  configurationVersionId: string;
  sourceHash: string;
  createdAt: string;
  manifestSchemaVersion: typeof CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION;
  selectionPolicyId: typeof CONTEXT_BUNDLE_SELECTION_POLICY_ID;
  tokenEstimatorId: typeof CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID;
  manifestHash: string;
  entryCount: number;
  totalTokenEstimate: number;
  candidatePathCount: number;
  eligiblePathCount: number;
  excludedPathCount: number;
  findingCount: number;
  unscannableCount: number;
  entries: ContextBundleEntryDto[];
  exclusions: ContextBundleExclusionDto[];
};

export type ContextBundleBlockedCode = SecretScanBlockedCode;

export type ContextBundleBlockedDto = {
  status: 'blocked';
  projectId: string;
  stage: ReviewStage | null;
  code: ContextBundleBlockedCode;
  message: string;
  candidatePathCount?: number;
  findingCount?: number;
  unscannableCount?: number;
};

export type ContextBundleDto = ContextBundleOkDto | ContextBundleBlockedDto;

export type ContextBundleLatestListDto = {
  status: 'ok';
  items: ContextBundleOkDto[];
};

const REMOVED_CONTEXT_BUNDLE_BLOCKED_CODES = [
  'context_bundle_limit_exceeded',
  'context_bundle_timeout',
  'context_bundle_entry_unreadable',
  'context_bundle_failed',
  'invalid_context_bundle_query',
] as const;

function isContextBundleLineRangeDto(
  value: unknown,
): value is ContextBundleLineRangeDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record['startLine'] === 'number' &&
    Number.isFinite(record['startLine']) &&
    record['startLine'] >= 1 &&
    typeof record['endLine'] === 'number' &&
    Number.isFinite(record['endLine']) &&
    record['endLine'] >= record['startLine']
  );
}

function isContextBundleEntryDto(
  value: unknown,
): value is ContextBundleEntryDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const lineRanges = record['lineRanges'];
  if (!Array.isArray(lineRanges) || !lineRanges.every(isContextBundleLineRangeDto)) {
    return false;
  }
  return (
    typeof record['path'] === 'string' &&
    typeof record['contentHash'] === 'string' &&
    /^[a-f0-9]{64}$/.test(record['contentHash']) &&
    typeof record['tokenEstimate'] === 'number' &&
    Number.isFinite(record['tokenEstimate']) &&
    record['tokenEstimate'] >= 0 &&
    Number.isInteger(record['tokenEstimate'])
  );
}

function isContextBundleExclusionDto(
  value: unknown,
): value is ContextBundleExclusionDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record['path'] === 'string' &&
    (record['reason'] === 'secret_finding' ||
      record['reason'] === 'unscannable_content')
  );
}

export function isContextBundleBlockedCode(
  value: unknown,
): value is ContextBundleBlockedCode {
  if (
    typeof value === 'string' &&
    (REMOVED_CONTEXT_BUNDLE_BLOCKED_CODES as readonly string[]).includes(value)
  ) {
    return false;
  }
  return isSecretScanBlockedCode(value);
}

export function isContextBundleOkDto(
  value: unknown,
): value is ContextBundleOkDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['status'] !== 'ok') {
    return false;
  }
  if ('code' in record || 'contentTransmitted' in record) {
    return false;
  }
  const entries = record['entries'];
  const exclusions = record['exclusions'];
  if (!Array.isArray(entries) || !entries.every(isContextBundleEntryDto)) {
    return false;
  }
  if (
    !Array.isArray(exclusions) ||
    !exclusions.every(isContextBundleExclusionDto)
  ) {
    return false;
  }
  const entryCount = record['entryCount'];
  const eligiblePathCount = record['eligiblePathCount'];
  const excludedPathCount = record['excludedPathCount'];
  return (
    typeof record['id'] === 'string' &&
    typeof record['projectId'] === 'string' &&
    isReviewStage(record['stage']) &&
    typeof record['configurationVersionId'] === 'string' &&
    typeof record['sourceHash'] === 'string' &&
    typeof record['createdAt'] === 'string' &&
    record['manifestSchemaVersion'] === CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION &&
    record['selectionPolicyId'] === CONTEXT_BUNDLE_SELECTION_POLICY_ID &&
    record['tokenEstimatorId'] === CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID &&
    typeof record['manifestHash'] === 'string' &&
    /^[a-f0-9]{64}$/.test(record['manifestHash']) &&
    typeof entryCount === 'number' &&
    Number.isFinite(entryCount) &&
    entryCount === (entries as ContextBundleEntryDto[]).length &&
    typeof record['totalTokenEstimate'] === 'number' &&
    Number.isFinite(record['totalTokenEstimate']) &&
    typeof record['candidatePathCount'] === 'number' &&
    Number.isFinite(record['candidatePathCount']) &&
    typeof eligiblePathCount === 'number' &&
    Number.isFinite(eligiblePathCount) &&
    eligiblePathCount === entryCount &&
    typeof excludedPathCount === 'number' &&
    Number.isFinite(excludedPathCount) &&
    excludedPathCount === (exclusions as ContextBundleExclusionDto[]).length &&
    typeof record['findingCount'] === 'number' &&
    Number.isFinite(record['findingCount']) &&
    typeof record['unscannableCount'] === 'number' &&
    Number.isFinite(record['unscannableCount'])
  );
}

export function isContextBundleBlockedDto(
  value: unknown,
): value is ContextBundleBlockedDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['status'] !== 'blocked') {
    return false;
  }
  if (
    'entries' in record ||
    'exclusions' in record ||
    'manifestHash' in record ||
    'contentTransmitted' in record
  ) {
    return false;
  }
  const stage = record['stage'];
  const stageOk = stage === null || isReviewStage(stage);
  if (
    !(
      typeof record['projectId'] === 'string' &&
      stageOk &&
      isContextBundleBlockedCode(record['code']) &&
      typeof record['message'] === 'string'
    )
  ) {
    return false;
  }
  const code = record['code'] as ContextBundleBlockedCode;
  const hasCandidate = 'candidatePathCount' in record;
  const hasFinding = 'findingCount' in record;
  const hasUnscannable = 'unscannableCount' in record;
  if (code === 'unsafe_context_bundle') {
    return (
      hasCandidate &&
      hasFinding &&
      hasUnscannable &&
      typeof record['candidatePathCount'] === 'number' &&
      Number.isFinite(record['candidatePathCount']) &&
      typeof record['findingCount'] === 'number' &&
      Number.isFinite(record['findingCount']) &&
      typeof record['unscannableCount'] === 'number' &&
      Number.isFinite(record['unscannableCount'])
    );
  }
  return !hasCandidate && !hasFinding && !hasUnscannable;
}

export function isContextBundleDto(value: unknown): value is ContextBundleDto {
  return isContextBundleOkDto(value) || isContextBundleBlockedDto(value);
}

export function isContextBundleLatestListDto(
  value: unknown,
): value is ContextBundleLatestListDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['status'] !== 'ok') {
    return false;
  }
  const items = record['items'];
  return Array.isArray(items) && items.every(isContextBundleOkDto);
}

export function parseContextBundleRequest(
  value: unknown,
):
  | { ok: true; request: ContextBundleRequest }
  | { ok: false; code: 'invalid_review_stage' } {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, code: 'invalid_review_stage' };
  }
  const record = value as Record<string, unknown>;
  if (!isReviewStage(record['stage'])) {
    return { ok: false, code: 'invalid_review_stage' };
  }
  return { ok: true, request: { stage: record['stage'] } };
}

export function parseContextBundleLatestQuery(
  value: unknown,
):
  | { ok: true; stage: ReviewStage; limit: 1 }
  | { ok: false; code: 'invalid_context_bundle_query' } {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, code: 'invalid_context_bundle_query' };
  }
  const record = value as Record<string, unknown>;
  if (!isReviewStage(record['stage'])) {
    return { ok: false, code: 'invalid_context_bundle_query' };
  }
  if (record['limit'] !== '1' && record['limit'] !== 1) {
    return { ok: false, code: 'invalid_context_bundle_query' };
  }
  return { ok: true, stage: record['stage'], limit: 1 };
}

/**
 * w02-s04: disclosure preview + approval contracts. Binding policy ids per
 * design D0; changing either constant invalidates prior coverage (D3).
 */
export const PREVIEW_POLICY_ID = 'bounded-selected-text-v1' as const;
export const APPROVAL_POLICY_ID = 'explicit-disclosure-approval-v1' as const;

/** Binding preview/approval bounds (design D8); no silent truncation. */
export const DISCLOSURE_PREVIEW_MAX_FILE_BYTES = 1048576;
export const DISCLOSURE_PREVIEW_MAX_TOTAL_BYTES = 52428800;
export const DISCLOSURE_PREVIEW_TIMEOUT_MS = 30000;
export const DISCLOSURE_PREVIEW_MAX_TOTAL_CODE_POINTS = 200000;
export const DISCLOSURE_PREVIEW_MAX_ENTRY_CODE_POINTS = 50000;

/** Binding preview-session TTL (design D1): exactly fifteen minutes. */
export const DISCLOSURE_PREVIEW_SESSION_TTL_MS = 15 * 60 * 1000;

export type ContextDisclosurePreviewItemDto = {
  path: string;
  contentHash: string;
  lineRanges: ContextBundleLineRangeDto[];
  tokenEstimate: number;
  excerpt: string;
};

export type ContextDisclosurePreviewOkDto = {
  status: 'ok';
  previewSessionId: string;
  previewPolicyId: typeof PREVIEW_POLICY_ID;
  approvalPolicyId: typeof APPROVAL_POLICY_ID;
  previewIntegrityHash: string;
  createdAt: string;
  expiresAt: string;
  bundleId: string;
  projectId: string;
  stage: ReviewStage;
  manifestHash: string;
  selectionPolicyId: typeof CONTEXT_BUNDLE_SELECTION_POLICY_ID;
  tokenEstimatorId: typeof CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID;
  manifestSchemaVersion: typeof CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION;
  itemCount: number;
  previewedCodePointCount: number;
  totalTokenEstimate: number;
  approvalRequired: boolean;
  items: ContextDisclosurePreviewItemDto[];
};

export type ContextDisclosureApprovalRequest = {
  previewSessionId: string;
  manifestHash: string;
  decision: 'approved';
};

export type ContextDisclosureApprovalOkDto = {
  status: 'ok';
  id: string;
  projectId: string;
  contextBundleId: string;
  previewSessionId: string;
  stage: ReviewStage;
  configurationVersionId: string;
  sourceHash: string;
  manifestSchemaVersion: typeof CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION;
  selectionPolicyId: typeof CONTEXT_BUNDLE_SELECTION_POLICY_ID;
  tokenEstimatorId: typeof CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID;
  manifestHash: string;
  previewPolicyId: typeof PREVIEW_POLICY_ID;
  approvalPolicyId: typeof APPROVAL_POLICY_ID;
  previewIntegrityHash: string;
  decision: 'approved';
  contentTransmitted: false;
  createdAt: string;
  approvalRequired: false;
};

export type ContextDisclosureStatusOkDto = {
  status: 'ok';
  projectId: string;
  contextBundleId: string;
  stage: ReviewStage;
  manifestHash: string;
  previewPolicyId: typeof PREVIEW_POLICY_ID;
  approvalPolicyId: typeof APPROVAL_POLICY_ID;
  approvalRequired: boolean;
  coveringApprovalId: string | null;
  contentTransmitted: false;
};

export type ContextDisclosureApprovalLatestListDto = {
  status: 'ok';
  items: ContextDisclosureApprovalOkDto[];
};

function isContextDisclosurePreviewItemDto(
  value: unknown,
): value is ContextDisclosurePreviewItemDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const lineRanges = record['lineRanges'];
  if (!Array.isArray(lineRanges) || !lineRanges.every(isContextBundleLineRangeDto)) {
    return false;
  }
  return (
    typeof record['path'] === 'string' &&
    typeof record['contentHash'] === 'string' &&
    /^[a-f0-9]{64}$/.test(record['contentHash']) &&
    typeof record['tokenEstimate'] === 'number' &&
    Number.isFinite(record['tokenEstimate']) &&
    typeof record['excerpt'] === 'string'
  );
}

export function isContextDisclosurePreviewOkDto(
  value: unknown,
): value is ContextDisclosurePreviewOkDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['status'] !== 'ok') {
    return false;
  }
  if ('contentTransmitted' in record) {
    return false;
  }
  const items = record['items'];
  if (!Array.isArray(items) || !items.every(isContextDisclosurePreviewItemDto)) {
    return false;
  }
  return (
    typeof record['previewSessionId'] === 'string' &&
    record['previewPolicyId'] === PREVIEW_POLICY_ID &&
    record['approvalPolicyId'] === APPROVAL_POLICY_ID &&
    typeof record['previewIntegrityHash'] === 'string' &&
    /^[a-f0-9]{64}$/.test(record['previewIntegrityHash']) &&
    typeof record['createdAt'] === 'string' &&
    typeof record['expiresAt'] === 'string' &&
    typeof record['bundleId'] === 'string' &&
    typeof record['projectId'] === 'string' &&
    isReviewStage(record['stage']) &&
    typeof record['manifestHash'] === 'string' &&
    record['selectionPolicyId'] === CONTEXT_BUNDLE_SELECTION_POLICY_ID &&
    record['tokenEstimatorId'] === CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID &&
    record['manifestSchemaVersion'] === CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION &&
    typeof record['itemCount'] === 'number' &&
    Number.isFinite(record['itemCount']) &&
    record['itemCount'] === items.length &&
    typeof record['previewedCodePointCount'] === 'number' &&
    Number.isFinite(record['previewedCodePointCount']) &&
    typeof record['totalTokenEstimate'] === 'number' &&
    Number.isFinite(record['totalTokenEstimate']) &&
    typeof record['approvalRequired'] === 'boolean'
  );
}

export function isContextDisclosureApprovalOkDto(
  value: unknown,
): value is ContextDisclosureApprovalOkDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['status'] !== 'ok') {
    return false;
  }
  if (record['contentTransmitted'] !== false) {
    return false;
  }
  if (record['decision'] !== 'approved') {
    return false;
  }
  if (record['approvalRequired'] !== false) {
    return false;
  }
  return (
    typeof record['id'] === 'string' &&
    typeof record['projectId'] === 'string' &&
    typeof record['contextBundleId'] === 'string' &&
    typeof record['previewSessionId'] === 'string' &&
    isReviewStage(record['stage']) &&
    typeof record['configurationVersionId'] === 'string' &&
    typeof record['sourceHash'] === 'string' &&
    record['manifestSchemaVersion'] === CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION &&
    record['selectionPolicyId'] === CONTEXT_BUNDLE_SELECTION_POLICY_ID &&
    record['tokenEstimatorId'] === CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID &&
    typeof record['manifestHash'] === 'string' &&
    record['previewPolicyId'] === PREVIEW_POLICY_ID &&
    record['approvalPolicyId'] === APPROVAL_POLICY_ID &&
    typeof record['previewIntegrityHash'] === 'string' &&
    typeof record['createdAt'] === 'string'
  );
}

export function isContextDisclosureStatusOkDto(
  value: unknown,
): value is ContextDisclosureStatusOkDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['status'] !== 'ok') {
    return false;
  }
  if (record['contentTransmitted'] !== false) {
    return false;
  }
  const coveringApprovalId = record['coveringApprovalId'];
  return (
    typeof record['projectId'] === 'string' &&
    typeof record['contextBundleId'] === 'string' &&
    isReviewStage(record['stage']) &&
    typeof record['manifestHash'] === 'string' &&
    record['previewPolicyId'] === PREVIEW_POLICY_ID &&
    record['approvalPolicyId'] === APPROVAL_POLICY_ID &&
    typeof record['approvalRequired'] === 'boolean' &&
    (coveringApprovalId === null || typeof coveringApprovalId === 'string')
  );
}

export function isContextDisclosureApprovalLatestListDto(
  value: unknown,
): value is ContextDisclosureApprovalLatestListDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['status'] !== 'ok') {
    return false;
  }
  const items = record['items'];
  return Array.isArray(items) && items.every(isContextDisclosureApprovalOkDto);
}

/**
 * Approval request MUST be exactly `{ previewSessionId, manifestHash, decision: 'approved' }`.
 * A shape/decision problem other than a missing `previewSessionId` maps to
 * `invalid_disclosure_approval`; a missing/invalid `previewSessionId` maps to
 * `disclosure_preview_required` per design D9.
 */
export function parseDisclosureApprovalRequest(
  value: unknown,
):
  | { ok: true; request: ContextDisclosureApprovalRequest }
  | { ok: false; code: 'disclosure_preview_required' | 'invalid_disclosure_approval' } {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, code: 'disclosure_preview_required' };
  }
  const record = value as Record<string, unknown>;
  const previewSessionId = record['previewSessionId'];
  if (typeof previewSessionId !== 'string' || previewSessionId.trim().length === 0) {
    return { ok: false, code: 'disclosure_preview_required' };
  }
  const manifestHash = record['manifestHash'];
  const decision = record['decision'];
  if (
    typeof manifestHash !== 'string' ||
    manifestHash.trim().length === 0 ||
    decision !== 'approved'
  ) {
    return { ok: false, code: 'invalid_disclosure_approval' };
  }
  return {
    ok: true,
    request: { previewSessionId, manifestHash, decision: 'approved' },
  };
}

export function parseDisclosureApprovalLatestQuery(
  value: unknown,
):
  | { ok: true; stage: ReviewStage; limit: 1 }
  | { ok: false; code: 'invalid_disclosure_approval_query' } {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, code: 'invalid_disclosure_approval_query' };
  }
  const record = value as Record<string, unknown>;
  if (!isReviewStage(record['stage'])) {
    return { ok: false, code: 'invalid_disclosure_approval_query' };
  }
  if (record['limit'] !== '1' && record['limit'] !== 1) {
    return { ok: false, code: 'invalid_disclosure_approval_query' };
  }
  return { ok: true, stage: record['stage'], limit: 1 };
}

/**
 * w03-s01: DeepSeek gateway probe contracts. Distinct from ReviewStage (no `new`).
 */
export const DEEPSEEK_PROBE_STAGES = [
  'discovery',
  'planning',
  'applied',
  'verify',
] as const;

export type DeepseekProbeStage = (typeof DEEPSEEK_PROBE_STAGES)[number];

export const DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID = 'deepseek-gateway-probe-v1' as const;

export const DEEPSEEK_RESOLVED_MODEL_IDS = [
  'deepseek-v4-flash',
  'deepseek-v4-pro',
] as const;

export type DeepseekResolvedModelId = (typeof DEEPSEEK_RESOLVED_MODEL_IDS)[number];

export type DeepseekProbeRequest = {
  stage?: DeepseekProbeStage;
};

export type DeepseekGatewayProbeParsedDto = {
  ok: true;
  probe: typeof DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID;
  message: string;
};

export type DeepseekProbeUsageDto = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type DeepseekProbeOkDto = {
  status: 'ok';
  projectId: string;
  stage: DeepseekProbeStage;
  providerId: 'deepseek';
  modelAlias: string;
  resolvedModelId: DeepseekResolvedModelId;
  schemaId: typeof DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID;
  attemptCount: number;
  providerHttpStatus: 200;
  providerRequestId?: string;
  latencyMs: number;
  usage?: DeepseekProbeUsageDto;
  parsed: DeepseekGatewayProbeParsedDto;
};

export function isDeepseekProbeStage(value: unknown): value is DeepseekProbeStage {
  return (
    typeof value === 'string' &&
    (DEEPSEEK_PROBE_STAGES as readonly string[]).includes(value)
  );
}

export function isDeepseekGatewayProbeParsedDto(
  value: unknown,
): value is DeepseekGatewayProbeParsedDto {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 3) {
    return false;
  }
  if (record['ok'] !== true) {
    return false;
  }
  if (record['probe'] !== DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID) {
    return false;
  }
  if (typeof record['message'] !== 'string') {
    return false;
  }
  const message = record['message'];
  return message.length > 0 && message.length <= 200;
}

export function isDeepseekProbeOkDto(value: unknown): value is DeepseekProbeOkDto {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['status'] !== 'ok') {
    return false;
  }
  if (typeof record['projectId'] !== 'string' || record['projectId'].length === 0) {
    return false;
  }
  if (!isDeepseekProbeStage(record['stage'])) {
    return false;
  }
  if (record['providerId'] !== 'deepseek') {
    return false;
  }
  if (typeof record['modelAlias'] !== 'string' || record['modelAlias'].length === 0) {
    return false;
  }
  if (
    !(DEEPSEEK_RESOLVED_MODEL_IDS as readonly string[]).includes(
      record['resolvedModelId'] as string,
    )
  ) {
    return false;
  }
  if (record['schemaId'] !== DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID) {
    return false;
  }
  if (
    typeof record['attemptCount'] !== 'number' ||
    !Number.isInteger(record['attemptCount']) ||
    record['attemptCount'] < 1 ||
    record['attemptCount'] > 3
  ) {
    return false;
  }
  if (record['providerHttpStatus'] !== 200) {
    return false;
  }
  if (
    record['providerRequestId'] !== undefined &&
    typeof record['providerRequestId'] !== 'string'
  ) {
    return false;
  }
  if (typeof record['latencyMs'] !== 'number' || !Number.isFinite(record['latencyMs'])) {
    return false;
  }
  if (record['usage'] !== undefined) {
    if (
      record['usage'] === null ||
      typeof record['usage'] !== 'object' ||
      Array.isArray(record['usage'])
    ) {
      return false;
    }
    const usage = record['usage'] as Record<string, unknown>;
    for (const key of ['promptTokens', 'completionTokens', 'totalTokens'] as const) {
      if (usage[key] !== undefined && typeof usage[key] !== 'number') {
        return false;
      }
    }
  }
  return isDeepseekGatewayProbeParsedDto(record['parsed']);
}

export function parseDeepseekProbeRequest(
  value: unknown,
):
  | { ok: true; stage: DeepseekProbeStage }
  | { ok: false; code: 'invalid_deepseek_probe_request' } {
  if (value === null || value === undefined) {
    return { ok: true, stage: 'discovery' };
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, code: 'invalid_deepseek_probe_request' };
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((k) => k !== 'stage')) {
    return { ok: false, code: 'invalid_deepseek_probe_request' };
  }
  if (!('stage' in record) || record['stage'] === undefined) {
    return { ok: true, stage: 'discovery' };
  }
  if (!isDeepseekProbeStage(record['stage'])) {
    return { ok: false, code: 'invalid_deepseek_probe_request' };
  }
  return { ok: true, stage: record['stage'] };
}

/**
 * w03-s02: Review-run orchestration contracts.
 */
export const REVIEW_RUN_STATES = [
  'requested',
  'preparing_context',
  'budget_check',
  'running',
  'validating_response',
  'completed',
  'blocked',
  'failed',
  'cancelled',
] as const;

export type ReviewRunState = (typeof REVIEW_RUN_STATES)[number];

export const REVIEW_RUN_IN_FLIGHT_STATES = [
  'requested',
  'preparing_context',
  'budget_check',
  'running',
  'validating_response',
] as const;

export type ReviewRunInFlightState = (typeof REVIEW_RUN_IN_FLIGHT_STATES)[number];

export const REVIEW_RUN_ORCHESTRATION_SCHEMA_ID =
  'review-run-orchestration-v1' as const;
export const REVIEW_RUN_PROMPT_TEMPLATE_ID =
  'review-run-orchestration-v1' as const;

export const REVIEW_RUN_TRANSMISSION_OUTCOMES = [
  'completed',
  'provider_failed',
  'response_invalid',
] as const;

export type ReviewRunTransmissionOutcome =
  (typeof REVIEW_RUN_TRANSMISSION_OUTCOMES)[number];

export const REVIEW_RUN_VERDICTS_BY_STAGE = {
  new: ['ready_to_create', 'blocked', 'changes_required'],
  planning: ['apply_ready', 'changes_required', 'blocked'],
  applied: ['ready_for_verify', 'changes_required', 'blocked'],
  verify: ['ready_for_sync', 'changes_required', 'blocked'],
} as const satisfies Record<ReviewStage, readonly string[]>;

export type ReviewRunVerdictForStage<S extends ReviewStage> =
  (typeof REVIEW_RUN_VERDICTS_BY_STAGE)[S][number];

export const CHANGE_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CHANGE_ID_MAX_LENGTH = 120;

export type ReviewRunCreateRequest = {
  stage: ReviewStage;
  contextBundleId: string;
  changeId?: string;
};

export type ReviewRunTransitionDto = {
  id: string;
  fromState: ReviewRunState | null;
  toState: ReviewRunState;
  code: string | null;
  createdAt: string;
};

export type ReviewRunTransmissionSafeDto = {
  id: string;
  outcome: ReviewRunTransmissionOutcome;
  promptTemplateId: string;
  schemaId: string;
  requestedModelAlias: string;
  resolvedModelId: string | null;
  attemptCount: number | null;
  latencyMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  providerRequestId: string | null;
  terminalCode: string | null;
  createdAt: string;
};

export type ReviewRunOkDto = {
  status: 'ok';
  id: string;
  projectId: string;
  stage: ReviewStage;
  changeId: string | null;
  state: ReviewRunState;
  contextBundleId: string | null;
  manifestHash: string | null;
  disclosureApprovalId: string | null;
  previewSessionId: string | null;
  previewIntegrityHash: string | null;
  previewPolicyId: string | null;
  approvalPolicyId: string | null;
  budgetCheckStatus: string | null;
  promptTemplateId: string | null;
  modelAlias: string | null;
  resolvedModelId: string | null;
  schemaId: string | null;
  verdict: string | null;
  rationale: string | null;
  attemptCount: number | null;
  latencyMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  blockedCode: string | null;
  failedCode: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  blockedAt: string | null;
  failedAt: string | null;
  transitions: ReviewRunTransitionDto[];
  transmission?: ReviewRunTransmissionSafeDto | null;
  hasTransmission?: boolean;
  transmissionOutcome?: ReviewRunTransmissionOutcome | null;
  transitionCount?: number;
};

export type ReviewRunListItemDto = Omit<ReviewRunOkDto, 'transitions' | 'transmission'> & {
  transitionCount: number;
  hasTransmission: boolean;
  transmissionOutcome: ReviewRunTransmissionOutcome | null;
};

export type ReviewRunListDto = {
  status: 'ok';
  items: ReviewRunListItemDto[];
};

export type ReviewRunOrchestrationParsedDto = {
  ok: true;
  schema: typeof REVIEW_RUN_ORCHESTRATION_SCHEMA_ID;
  stage: ReviewStage;
  verdict: string;
  rationale: string;
};

export function isReviewRunState(value: unknown): value is ReviewRunState {
  return (
    typeof value === 'string' &&
    (REVIEW_RUN_STATES as readonly string[]).includes(value)
  );
}

export function isStageValidVerdict(
  stage: ReviewStage,
  verdict: string,
): boolean {
  return (REVIEW_RUN_VERDICTS_BY_STAGE[stage] as readonly string[]).includes(
    verdict,
  );
}

export function isReviewRunOrchestrationParsedDto(
  value: unknown,
): value is ReviewRunOrchestrationParsedDto {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['ok'] !== true) {
    return false;
  }
  if (record['schema'] !== REVIEW_RUN_ORCHESTRATION_SCHEMA_ID) {
    return false;
  }
  if (!isReviewStage(record['stage'])) {
    return false;
  }
  if (typeof record['verdict'] !== 'string' || record['verdict'].length === 0) {
    return false;
  }
  if (!isStageValidVerdict(record['stage'], record['verdict'])) {
    return false;
  }
  if (typeof record['rationale'] !== 'string') {
    return false;
  }
  const rationale = record['rationale'];
  return rationale.length > 0 && rationale.length <= 500;
}

export function parseReviewRunCreateRequest(
  value: unknown,
):
  | { ok: true; stage: ReviewStage; contextBundleId: string; changeId?: string }
  | { ok: false; code: 'invalid_review_run_request' } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, code: 'invalid_review_run_request' };
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  for (const key of keys) {
    if (key !== 'stage' && key !== 'contextBundleId' && key !== 'changeId') {
      return { ok: false, code: 'invalid_review_run_request' };
    }
  }
  if (!isReviewStage(record['stage'])) {
    return { ok: false, code: 'invalid_review_run_request' };
  }
  if (
    typeof record['contextBundleId'] !== 'string' ||
    record['contextBundleId'].trim().length === 0
  ) {
    return { ok: false, code: 'invalid_review_run_request' };
  }
  const stage = record['stage'];
  const contextBundleId = record['contextBundleId'].trim();
  const hasChangeId = 'changeId' in record && record['changeId'] !== undefined;

  if (stage === 'new') {
    if (hasChangeId) {
      return { ok: false, code: 'invalid_review_run_request' };
    }
    return { ok: true, stage, contextBundleId };
  }

  if (!hasChangeId || typeof record['changeId'] !== 'string') {
    return { ok: false, code: 'invalid_review_run_request' };
  }
  const changeId = record['changeId'];
  if (
    changeId.length === 0 ||
    changeId.length > CHANGE_ID_MAX_LENGTH ||
    !CHANGE_ID_REGEX.test(changeId)
  ) {
    return { ok: false, code: 'invalid_review_run_request' };
  }
  return { ok: true, stage, contextBundleId, changeId };
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

export function isReviewRunTransitionDto(
  value: unknown,
): value is ReviewRunTransitionDto {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (typeof record['id'] !== 'string' || record['id'].length === 0) {
    return false;
  }
  if (record['fromState'] !== null && !isReviewRunState(record['fromState'])) {
    return false;
  }
  if (!isReviewRunState(record['toState'])) {
    return false;
  }
  if (record['code'] !== null && typeof record['code'] !== 'string') {
    return false;
  }
  return isIsoDateString(record['createdAt']);
}

export function isReviewRunTransmissionSafeDto(
  value: unknown,
): value is ReviewRunTransmissionSafeDto {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if ('excerpt' in record || 'prompt' in record || 'rawResponse' in record) {
    return false;
  }
  if (typeof record['id'] !== 'string' || record['id'].length === 0) {
    return false;
  }
  if (
    !(REVIEW_RUN_TRANSMISSION_OUTCOMES as readonly string[]).includes(
      record['outcome'] as string,
    )
  ) {
    return false;
  }
  return isIsoDateString(record['createdAt']);
}

export function isReviewRunOkDto(value: unknown): value is ReviewRunOkDto {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if ('excerpt' in record || 'prompt' in record || 'rawResponse' in record) {
    return false;
  }
  if (record['status'] !== 'ok') {
    return false;
  }
  if (typeof record['id'] !== 'string' || record['id'].length === 0) {
    return false;
  }
  if (typeof record['projectId'] !== 'string' || record['projectId'].length === 0) {
    return false;
  }
  if (!isReviewStage(record['stage'])) {
    return false;
  }
  if (!isReviewRunState(record['state'])) {
    return false;
  }
  if (!Array.isArray(record['transitions'])) {
    return false;
  }
  return record['transitions'].every(isReviewRunTransitionDto);
}
