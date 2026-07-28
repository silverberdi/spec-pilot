import {
  createHealthResponse,
  createReadyResponse,
  DISPLAY_NAME_MAX_LENGTH,
  isContextSourceResolveBlockedCode,
  isContextSourceResolveBlockedDto,
  isContextSourceResolveDto,
  isContextSourceResolveOkDto,
  isHealthResponse,
  isProjectDiscoveryDto,
  isProjectDto,
  isProjectErrorResponse,
  isReadyResponse,
  isRegisterProjectResponse,
  parseContextSourceResolveRequest,
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

const version = {
  id: '22222222-2222-2222-2222-222222222222',
  projectId: '11111111-1111-1111-1111-111111111111',
  schemaVersion: 1,
  sourceHash: 'a'.repeat(64),
  normalizedConfig: { schemaVersion: 1 },
  validatedAt: '2026-07-27T00:00:00.000Z',
  createdAt: '2026-07-27T00:00:00.000Z',
};

const neverInspectedHealth = {
  status: 'never_inspected' as const,
  inspectedAt: null,
  gitStatus: 'unknown' as const,
  openspecStatus: 'unknown' as const,
  summaryMessage: null,
};

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
        configurationVersionId: null,
        discoveryHealth: neverInspectedHealth,
      }),
    ).toBe(true);
  });

  it('rejects ProjectDto missing discoveryHealth', () => {
    expect(
      isProjectDto({
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: null,
      }),
    ).toBe(false);
  });

  it('rejects unknown discoveryHealth status', () => {
    expect(
      isProjectDto({
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: null,
        discoveryHealth: {
          ...neverInspectedHealth,
          status: 'healthy',
        },
      }),
    ).toBe(false);
  });

  it('accepts attached RegisterProjectResponse', () => {
    expect(
      isRegisterProjectResponse({
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: version.id,
        discoveryHealth: neverInspectedHealth,
        configuration: { status: 'attached', version },
      }),
    ).toBe(true);
  });

  it('accepts blocked RegisterProjectResponse', () => {
    expect(
      isRegisterProjectResponse({
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: null,
        discoveryHealth: neverInspectedHealth,
        configuration: {
          status: 'blocked',
          error: { code: 'project_yaml_parse_error', message: 'parse failed' },
        },
      }),
    ).toBe(true);
  });

  it('rejects ambiguous configuration unions', () => {
    expect(
      isRegisterProjectResponse({
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: version.id,
        discoveryHealth: neverInspectedHealth,
        configuration: { status: 'attached' },
      }),
    ).toBe(false);

    expect(
      isRegisterProjectResponse({
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: null,
        discoveryHealth: neverInspectedHealth,
        configuration: {
          status: 'blocked',
          error: { code: 'x', message: 'y' },
          version,
        },
      }),
    ).toBe(false);
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

describe('shared-contracts discovery', () => {
  const okDiscovery = {
    projectId: '11111111-1111-1111-1111-111111111111',
    inspectedAt: '2026-07-28T00:00:00.000Z',
    git: {
      status: 'ok' as const,
      isRepo: true as const,
      headSha: 'a'.repeat(40),
      branch: 'main',
      dirty: false,
      upstream: null,
    },
    openspec: {
      status: 'ok' as const,
      rootPresent: true as const,
      activeChanges: [
        {
          name: 'chg-demo',
          hasProposal: true,
          hasDesign: false,
          hasTasks: false,
          hasSpecs: true,
        },
      ],
      archivedChangeCount: 0,
      cliAvailable: false,
    },
  };

  it('accepts a well-formed ProjectDiscoveryDto', () => {
    expect(isProjectDiscoveryDto(okDiscovery)).toBe(true);
  });

  it('accepts blocked git and openspec unions with closed codes', () => {
    expect(
      isProjectDiscoveryDto({
        ...okDiscovery,
        git: {
          status: 'blocked',
          code: 'not_a_git_repository',
          message: 'no git',
        },
        openspec: {
          status: 'blocked',
          code: 'openspec_root_missing',
          message: 'missing',
        },
      }),
    ).toBe(true);
  });

  it('rejects unknown blocked codes and ambiguous shapes', () => {
    expect(
      isProjectDiscoveryDto({
        ...okDiscovery,
        git: { status: 'blocked', code: 'weird', message: 'x' },
      }),
    ).toBe(false);
    expect(
      isProjectDiscoveryDto({
        ...okDiscovery,
        git: {
          status: 'ok',
          isRepo: true,
          headSha: 'a'.repeat(40),
          branch: 'main',
          dirty: false,
          upstream: null,
          code: 'not_a_git_repository',
        },
      }),
    ).toBe(false);
    expect(
      isProjectDiscoveryDto({
        ...okDiscovery,
        openspec: { status: 'blocked', message: 'missing code' },
      }),
    ).toBe(false);
  });
});

describe('shared-contracts context-source resolution', () => {
  const okResolve = {
    status: 'ok' as const,
    projectId: '11111111-1111-1111-1111-111111111111',
    stage: 'planning' as const,
    configurationVersionId: '22222222-2222-2222-2222-222222222222',
    sourceHash: 'a'.repeat(64),
    resolvedAt: '2026-07-28T00:00:00.000Z',
    include: ['AGENTS.md'],
    exclude: ['**/.env'],
    pathCount: 1,
    paths: ['AGENTS.md'],
  };

  it('accepts a well-formed ContextSourceResolveOkDto', () => {
    expect(isContextSourceResolveOkDto(okResolve)).toBe(true);
  });

  it('rejects unknown review stages', () => {
    expect(
      isContextSourceResolveOkDto({ ...okResolve, stage: 'deploy' }),
    ).toBe(false);
    expect(parseContextSourceResolveRequest({ stage: 'deploy' }).ok).toBe(
      false,
    );
  });

  it('rejects unknown blocked codes including context_resolve_failed', () => {
    expect(
      isContextSourceResolveBlockedDto({
        status: 'blocked',
        projectId: okResolve.projectId,
        stage: 'planning',
        code: 'context_resolve_failed',
        message: 'nope',
      }),
    ).toBe(false);
    expect(
      isContextSourceResolveBlockedCode('context_resolve_failed'),
    ).toBe(false);
  });

  it('accepts closed blocked codes', () => {
    expect(
      isContextSourceResolveBlockedDto({
        status: 'blocked',
        projectId: okResolve.projectId,
        stage: null,
        code: 'invalid_review_stage',
        message: 'bad stage',
      }),
    ).toBe(true);
  });

  it('rejects ambiguous resolve shapes', () => {
    expect(
      isContextSourceResolveOkDto({
        ...okResolve,
        pathCount: 2,
      }),
    ).toBe(false);
    expect(
      isContextSourceResolveDto({
        status: 'blocked',
        projectId: okResolve.projectId,
        stage: 'planning',
        code: 'configuration_not_found',
        message: 'missing',
        paths: [],
      }),
    ).toBe(false);
  });
});
