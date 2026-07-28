import {
  isProjectDiscoveryDto,
  type GitDiscoveryBlockedCode,
  type OpenSpecDiscoveryBlockedCode,
  type ProjectDiscoveryDto,
  type ProjectDiscoveryHealthDto,
} from '@specpilot/shared-contracts';

export const INVALID_DISCOVERY_HEALTH_MESSAGE =
  'No fue posible interpretar el último resultado de descubrimiento.';

const GIT_SUMMARY_MESSAGES: Record<GitDiscoveryBlockedCode, string> = {
  not_a_git_repository: 'No es un repositorio Git.',
  git_inspect_failed: 'No fue posible inspeccionar el estado de Git.',
  git_inspection_timeout: 'La inspección de Git excedió el tiempo permitido.',
};

const OPENSPEC_SUMMARY_MESSAGES: Record<OpenSpecDiscoveryBlockedCode, string> =
  {
    openspec_root_missing: 'No se encontró la estructura de OpenSpec.',
    openspec_inspect_failed:
      'No fue posible inspeccionar la estructura de OpenSpec.',
    openspec_path_escape:
      'La estructura de OpenSpec contiene una ruta no permitida.',
    openspec_inspection_limit_exceeded:
      'La estructura de OpenSpec supera los límites de inspección.',
  };

function invalidHealth(
  inspectedAt: string | null,
): ProjectDiscoveryHealthDto {
  return {
    status: 'invalid',
    inspectedAt,
    gitStatus: 'unknown',
    openspecStatus: 'unknown',
    summaryMessage: INVALID_DISCOVERY_HEALTH_MESSAGE,
  };
}

function sameInstant(a: Date | string, b: string): boolean {
  const left = a instanceof Date ? a.getTime() : Date.parse(a);
  const right = Date.parse(b);
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
}

function mapBlockedSummary(snapshot: ProjectDiscoveryDto): string {
  const parts: string[] = [];
  if (snapshot.git.status === 'blocked') {
    parts.push(GIT_SUMMARY_MESSAGES[snapshot.git.code]);
  }
  if (snapshot.openspec.status === 'blocked') {
    parts.push(OPENSPEC_SUMMARY_MESSAGES[snapshot.openspec.code]);
  }
  return parts.join(' ');
}

/**
 * Fail-closed discovery health projection from persisted Project fields.
 * Must not open the target repository or invoke Git/OpenSpec.
 */
export function deriveDiscoveryHealth(
  projectId: string,
  lastInspectedAt: Date | null,
  lastDiscovery: unknown,
): ProjectDiscoveryHealthDto {
  const inspectedIso =
    lastInspectedAt === null ? null : lastInspectedAt.toISOString();

  if (lastInspectedAt === null && lastDiscovery == null) {
    return {
      status: 'never_inspected',
      inspectedAt: null,
      gitStatus: 'unknown',
      openspecStatus: 'unknown',
      summaryMessage: null,
    };
  }

  if (lastInspectedAt === null || lastDiscovery == null) {
    return invalidHealth(inspectedIso);
  }

  if (!isProjectDiscoveryDto(lastDiscovery)) {
    return invalidHealth(inspectedIso);
  }

  if (lastDiscovery.projectId !== projectId) {
    return invalidHealth(inspectedIso);
  }

  if (!sameInstant(lastInspectedAt, lastDiscovery.inspectedAt)) {
    return invalidHealth(inspectedIso);
  }

  const gitStatus =
    lastDiscovery.git.status === 'ok' ? ('ok' as const) : ('blocked' as const);
  const openspecStatus =
    lastDiscovery.openspec.status === 'ok'
      ? ('ok' as const)
      : ('blocked' as const);

  if (gitStatus === 'ok' && openspecStatus === 'ok') {
    return {
      status: 'ok',
      inspectedAt: inspectedIso,
      gitStatus: 'ok',
      openspecStatus: 'ok',
      summaryMessage: null,
    };
  }

  return {
    status: 'blocked',
    inspectedAt: inspectedIso,
    gitStatus,
    openspecStatus,
    summaryMessage: mapBlockedSummary(lastDiscovery),
  };
}
