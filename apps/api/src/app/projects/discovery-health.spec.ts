import {
  INVALID_DISCOVERY_HEALTH_MESSAGE,
  deriveDiscoveryHealth,
} from './discovery-health';

const projectId = '11111111-1111-1111-1111-111111111111';
const inspectedAt = new Date('2026-07-28T12:00:00.000Z');

function okSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    projectId,
    inspectedAt: inspectedAt.toISOString(),
    git: {
      status: 'ok',
      isRepo: true,
      headSha: 'a'.repeat(40),
      branch: 'main',
      dirty: false,
      upstream: null,
    },
    openspec: {
      status: 'ok',
      rootPresent: true,
      activeChanges: [],
      archivedChangeCount: 0,
      cliAvailable: false,
    },
    ...overrides,
  };
}

describe('deriveDiscoveryHealth', () => {
  it('maps both-null to never_inspected', () => {
    expect(deriveDiscoveryHealth(projectId, null, null)).toEqual({
      status: 'never_inspected',
      inspectedAt: null,
      gitStatus: 'unknown',
      openspecStatus: 'unknown',
      summaryMessage: null,
    });
  });

  it('maps exactly-one-null to invalid', () => {
    expect(deriveDiscoveryHealth(projectId, inspectedAt, null)).toEqual({
      status: 'invalid',
      inspectedAt: inspectedAt.toISOString(),
      gitStatus: 'unknown',
      openspecStatus: 'unknown',
      summaryMessage: INVALID_DISCOVERY_HEALTH_MESSAGE,
    });
    expect(deriveDiscoveryHealth(projectId, null, okSnapshot())).toEqual({
      status: 'invalid',
      inspectedAt: null,
      gitStatus: 'unknown',
      openspecStatus: 'unknown',
      summaryMessage: INVALID_DISCOVERY_HEALTH_MESSAGE,
    });
  });

  it('maps type-guard failure to invalid', () => {
    expect(
      deriveDiscoveryHealth(projectId, inspectedAt, { not: 'valid' }),
    ).toMatchObject({ status: 'invalid' });
  });

  it('maps projectId mismatch to invalid', () => {
    expect(
      deriveDiscoveryHealth(
        projectId,
        inspectedAt,
        okSnapshot({ projectId: '22222222-2222-2222-2222-222222222222' }),
      ),
    ).toMatchObject({ status: 'invalid' });
  });

  it('maps inspectedAt instant mismatch to invalid', () => {
    expect(
      deriveDiscoveryHealth(
        projectId,
        inspectedAt,
        okSnapshot({ inspectedAt: '2026-07-28T12:00:01.000Z' }),
      ),
    ).toMatchObject({ status: 'invalid' });
  });

  it('accepts same instant with different ISO formatting', () => {
    expect(
      deriveDiscoveryHealth(
        projectId,
        inspectedAt,
        okSnapshot({ inspectedAt: '2026-07-28T12:00:00.000+00:00' }),
      ),
    ).toMatchObject({ status: 'ok' });
  });

  it('maps both-ok to ok with null summary', () => {
    expect(
      deriveDiscoveryHealth(projectId, inspectedAt, okSnapshot()),
    ).toEqual({
      status: 'ok',
      inspectedAt: inspectedAt.toISOString(),
      gitStatus: 'ok',
      openspecStatus: 'ok',
      summaryMessage: null,
    });
  });

  it('maps git-only blocked with closed Spanish message', () => {
    const snapshot = okSnapshot({
      git: {
        status: 'blocked',
        code: 'not_a_git_repository',
        message: 'RAW SHOULD NOT APPEAR',
      },
    });
    expect(deriveDiscoveryHealth(projectId, inspectedAt, snapshot)).toEqual({
      status: 'blocked',
      inspectedAt: inspectedAt.toISOString(),
      gitStatus: 'blocked',
      openspecStatus: 'ok',
      summaryMessage: 'No es un repositorio Git.',
    });
  });

  it('maps openspec-only blocked with closed Spanish message', () => {
    const snapshot = okSnapshot({
      openspec: {
        status: 'blocked',
        code: 'openspec_root_missing',
        message: 'RAW SHOULD NOT APPEAR',
      },
    });
    expect(deriveDiscoveryHealth(projectId, inspectedAt, snapshot)).toEqual({
      status: 'blocked',
      inspectedAt: inspectedAt.toISOString(),
      gitStatus: 'ok',
      openspecStatus: 'blocked',
      summaryMessage: 'No se encontró la estructura de OpenSpec.',
    });
  });

  it('joins both blocked messages with one space', () => {
    const snapshot = okSnapshot({
      git: {
        status: 'blocked',
        code: 'not_a_git_repository',
        message: 'raw-git',
      },
      openspec: {
        status: 'blocked',
        code: 'openspec_root_missing',
        message: 'raw-openspec',
      },
    });
    expect(
      deriveDiscoveryHealth(projectId, inspectedAt, snapshot).summaryMessage,
    ).toBe(
      'No es un repositorio Git. No se encontró la estructura de OpenSpec.',
    );
  });
});
