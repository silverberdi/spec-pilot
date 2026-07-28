import { createHash } from 'node:crypto';
import { PROJECT_YAML_MAX_BYTES } from '@specpilot/shared-contracts';

export const MANDATORY_SECRET_EXCLUDES = [
  '**/.env',
  '**/.env.*',
  '**/*.pem',
  '**/*.key',
  '**/secrets/**',
] as const;

export type ConfigurationFailureCode =
  | 'project_yaml_missing'
  | 'project_yaml_not_regular_file'
  | 'project_yaml_too_large'
  | 'project_yaml_parse_error'
  | 'unsupported_schema_version'
  | 'invalid_machine_id'
  | 'invalid_repository_contract'
  | 'invalid_executor'
  | 'invalid_validation_assistant'
  | 'invalid_budget_declaration'
  | 'invalid_context_patterns';

export type ValidatedConfiguration = {
  schemaVersion: number;
  sourceHash: string;
  normalizedConfig: Record<string, unknown>;
};

export type ValidateConfigurationResult =
  | { ok: true; value: ValidatedConfiguration }
  | { ok: false; code: ConfigurationFailureCode };

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const REQUIRED_TOP_LEVEL = [
  'schemaVersion',
  'project',
  'repository',
  'openspec',
  'delivery',
  'context',
  'review',
  'executor',
  'validationAssistants',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function looksAbsolutePath(value: string): boolean {
  return (
    value.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.startsWith('\\\\')
  );
}

function normalizeStringArray(
  value: unknown,
): { ok: true; values: string[] } | { ok: false } {
  if (!Array.isArray(value)) {
    return { ok: false };
  }
  const values: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      return { ok: false };
    }
    const trimmed = item.trim();
    if (trimmed.length === 0) {
      return { ok: false };
    }
    values.push(trimmed);
  }
  return { ok: true, values };
}

export function hashProjectYamlBytes(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Validate exact-byte YAML payload after size check and parse.
 * `sourceHash` is always computed from the exact input bytes (no normalization).
 */
export function validateProjectYamlBytes(
  bytes: Buffer,
  parsed: unknown,
): ValidateConfigurationResult {
  if (bytes.byteLength > PROJECT_YAML_MAX_BYTES) {
    return { ok: false, code: 'project_yaml_too_large' };
  }

  const sourceHash = hashProjectYamlBytes(bytes);

  if (!isPlainObject(parsed)) {
    return { ok: false, code: 'project_yaml_parse_error' };
  }

  for (const key of REQUIRED_TOP_LEVEL) {
    if (!(key in parsed)) {
      return { ok: false, code: 'project_yaml_parse_error' };
    }
  }

  if (parsed['schemaVersion'] !== 1) {
    return { ok: false, code: 'unsupported_schema_version' };
  }

  const project = parsed['project'];
  if (!isPlainObject(project) || typeof project['id'] !== 'string') {
    return { ok: false, code: 'invalid_machine_id' };
  }
  if (!KEBAB_CASE.test(project['id'])) {
    return { ok: false, code: 'invalid_machine_id' };
  }
  if (typeof project['name'] !== 'string' || project['name'].trim().length === 0) {
    return { ok: false, code: 'project_yaml_parse_error' };
  }

  const repository = parsed['repository'];
  if (!isPlainObject(repository)) {
    return { ok: false, code: 'invalid_repository_contract' };
  }
  for (const [key, value] of Object.entries(repository)) {
    if (typeof value === 'string' && looksAbsolutePath(value)) {
      return { ok: false, code: 'invalid_repository_contract' };
    }
    if (key.toLowerCase().includes('path') && typeof value === 'string') {
      return { ok: false, code: 'invalid_repository_contract' };
    }
  }
  if (typeof repository['mainBranch'] !== 'string') {
    return { ok: false, code: 'invalid_repository_contract' };
  }

  const openspec = parsed['openspec'];
  if (!isPlainObject(openspec) || typeof openspec['path'] !== 'string') {
    return { ok: false, code: 'project_yaml_parse_error' };
  }

  const delivery = parsed['delivery'];
  if (!isPlainObject(delivery)) {
    return { ok: false, code: 'project_yaml_parse_error' };
  }

  const context = parsed['context'];
  if (!isPlainObject(context)) {
    return { ok: false, code: 'invalid_context_patterns' };
  }
  const includeResult = normalizeStringArray(context['include'] ?? []);
  const excludeResult = normalizeStringArray(context['exclude'] ?? []);
  if (!includeResult.ok || !excludeResult.ok) {
    return { ok: false, code: 'invalid_context_patterns' };
  }

  const mergedExclude = [...excludeResult.values];
  for (const pattern of MANDATORY_SECRET_EXCLUDES) {
    if (!mergedExclude.includes(pattern)) {
      mergedExclude.push(pattern);
    }
  }

  const executor = parsed['executor'];
  if (!isPlainObject(executor) || executor['tool'] !== 'cursor') {
    return { ok: false, code: 'invalid_executor' };
  }

  const assistants = parsed['validationAssistants'];
  if (!isPlainObject(assistants)) {
    return { ok: false, code: 'invalid_validation_assistant' };
  }
  const cline = assistants['clineDeepSeek'];
  if (cline !== undefined) {
    if (!isPlainObject(cline)) {
      return { ok: false, code: 'invalid_validation_assistant' };
    }
    if (cline['enabled'] === true && cline['mode'] !== 'read-only') {
      return { ok: false, code: 'invalid_validation_assistant' };
    }
  }

  const review = parsed['review'];
  if (!isPlainObject(review)) {
    return { ok: false, code: 'project_yaml_parse_error' };
  }
  if ('monthlyBudgetUsd' in review) {
    const budget = review['monthlyBudgetUsd'];
    if (typeof budget !== 'number' || !Number.isFinite(budget) || budget < 0) {
      return { ok: false, code: 'invalid_budget_declaration' };
    }
  }

  const normalizedConfig: Record<string, unknown> = {
    schemaVersion: 1,
    project: {
      id: project['id'],
      name: project['name'],
    },
    repository: { ...repository },
    openspec: { ...openspec },
    delivery: { ...delivery },
    context: {
      include: includeResult.values,
      exclude: mergedExclude,
    },
    review: { ...review },
    executor: { tool: 'cursor' },
    validationAssistants: { ...assistants },
  };

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      sourceHash,
      normalizedConfig,
    },
  };
}
