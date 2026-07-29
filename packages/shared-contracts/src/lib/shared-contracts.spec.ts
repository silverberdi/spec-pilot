import {
  APPROVAL_POLICY_ID,
  createHealthResponse,
  createReadyResponse,
  DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID,
  DISPLAY_NAME_MAX_LENGTH,
  isContextDisclosureApprovalLatestListDto,
  isContextDisclosureApprovalOkDto,
  isContextDisclosurePreviewOkDto,
  isContextDisclosureStatusOkDto,
  isContextSourceResolveBlockedCode,
  isContextSourceResolveBlockedDto,
  isContextSourceResolveDto,
  isContextSourceResolveOkDto,
  isContextBundleBlockedCode,
  isContextBundleBlockedDto,
  isContextBundleLatestListDto,
  isContextBundleOkDto,
  isDeepseekProbeOkDto,
  isHealthResponse,
  isProjectDiscoveryDto,
  isProjectDto,
  isProjectErrorResponse,
  isReadyResponse,
  isRegisterProjectResponse,
  isSecretScanBlockedCode,
  isSecretScanBlockedDto,
  isSecretScanOkDto,
  parseContextSourceResolveRequest,
  parseContextBundleLatestQuery,
  parseContextBundleRequest,
  parseDeepseekProbeRequest,
  parseDisclosureApprovalLatestQuery,
  parseDisclosureApprovalRequest,
  parseSecretScanRequest,
  PREVIEW_POLICY_ID,
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

describe('shared-contracts secret-scan', () => {
  const okScan = {
    status: 'ok' as const,
    projectId: '11111111-1111-1111-1111-111111111111',
    stage: 'planning' as const,
    configurationVersionId: '22222222-2222-2222-2222-222222222222',
    sourceHash: 'a'.repeat(64),
    scannedAt: '2026-07-28T00:00:00.000Z',
    candidatePathCount: 1,
    eligiblePathCount: 1,
    eligiblePaths: ['AGENTS.md'],
    findings: [] as Array<{ path: string; detectorId: string }>,
    unscannable: [] as Array<{ path: string; reason: string }>,
  };

  it('accepts a well-formed SecretScanOkDto', () => {
    expect(isSecretScanOkDto(okScan)).toBe(true);
  });

  it('requires unsafe counts and rejects them on other blocked codes', () => {
    expect(
      isSecretScanBlockedDto({
        status: 'blocked',
        projectId: okScan.projectId,
        stage: 'planning',
        code: 'unsafe_context_bundle',
        message: 'unsafe',
        candidatePathCount: 2,
        findingCount: 1,
        unscannableCount: 1,
      }),
    ).toBe(true);
    expect(
      isSecretScanBlockedDto({
        status: 'blocked',
        projectId: okScan.projectId,
        stage: 'planning',
        code: 'unsafe_context_bundle',
        message: 'unsafe',
      }),
    ).toBe(false);
    expect(
      isSecretScanBlockedDto({
        status: 'blocked',
        projectId: okScan.projectId,
        stage: 'planning',
        code: 'secret_scan_timeout',
        message: 'timeout',
        candidatePathCount: 1,
      }),
    ).toBe(false);
  });

  it('rejects findings with snippet fields and secret_scan_failed in 422 union', () => {
    expect(
      isSecretScanOkDto({
        ...okScan,
        findings: [
          {
            path: 'a.ts',
            detectorId: 'github_pat',
            snippet: 'ghp_xxx',
          },
        ],
      }),
    ).toBe(false);
    expect(isSecretScanBlockedCode('secret_scan_failed')).toBe(false);
    expect(
      isSecretScanBlockedDto({
        status: 'blocked',
        projectId: okScan.projectId,
        stage: 'planning',
        code: 'secret_scan_failed',
        message: 'nope',
      }),
    ).toBe(false);
  });

  it('rejects unknown stages on secret-scan request', () => {
    expect(parseSecretScanRequest({ stage: 'deploy' }).ok).toBe(false);
    expect(parseSecretScanRequest({ stage: 'planning' }).ok).toBe(true);
  });
});

describe('shared-contracts context-bundle', () => {
  const okBundle = {
    status: 'ok' as const,
    id: '33333333-3333-3333-3333-333333333333',
    projectId: '11111111-1111-1111-1111-111111111111',
    stage: 'planning' as const,
    configurationVersionId: '22222222-2222-2222-2222-222222222222',
    sourceHash: 'a'.repeat(64),
    createdAt: '2026-07-28T00:00:00.000Z',
    manifestSchemaVersion: 1 as const,
    selectionPolicyId: 'full-file-lines-v1' as const,
    tokenEstimatorId: 'unicode-codepoints-div-4-v1' as const,
    manifestHash: 'b'.repeat(64),
    entryCount: 1,
    totalTokenEstimate: 1,
    candidatePathCount: 1,
    eligiblePathCount: 1,
    excludedPathCount: 0,
    findingCount: 0,
    unscannableCount: 0,
    entries: [
      {
        path: 'AGENTS.md',
        contentHash: 'c'.repeat(64),
        lineRanges: [{ startLine: 1, endLine: 1 }],
        tokenEstimate: 1,
      },
    ],
    exclusions: [] as Array<{ path: string; reason: string }>,
  };

  it('accepts a well-formed ContextBundleOkDto without contentTransmitted', () => {
    expect(isContextBundleOkDto(okBundle)).toBe(true);
  });

  it('rejects contentTransmitted on ok and blocked payloads', () => {
    expect(
      isContextBundleOkDto({ ...okBundle, contentTransmitted: false }),
    ).toBe(false);
    expect(
      isContextBundleBlockedDto({
        status: 'blocked',
        projectId: okBundle.projectId,
        stage: 'planning',
        code: 'unsafe_context_bundle',
        message: 'unsafe',
        candidatePathCount: 1,
        findingCount: 0,
        unscannableCount: 1,
        contentTransmitted: true,
      }),
    ).toBe(false);
  });

  it('rejects removed bundle-only blocked codes', () => {
    for (const code of [
      'context_bundle_limit_exceeded',
      'context_bundle_timeout',
      'context_bundle_entry_unreadable',
    ]) {
      expect(isContextBundleBlockedCode(code)).toBe(false);
      expect(
        isContextBundleBlockedDto({
          status: 'blocked',
          projectId: okBundle.projectId,
          stage: 'planning',
          code,
          message: 'nope',
        }),
      ).toBe(false);
    }
  });

  it('accepts SecretScanBlockedCode members as ContextBundleBlockedCode', () => {
    expect(isContextBundleBlockedCode('unsafe_context_bundle')).toBe(true);
    expect(
      isContextBundleBlockedDto({
        status: 'blocked',
        projectId: okBundle.projectId,
        stage: 'planning',
        code: 'secret_scan_timeout',
        message: 'timeout',
      }),
    ).toBe(true);
  });

  it('requires unsafe counts on blocked unsafe_context_bundle', () => {
    expect(
      isContextBundleBlockedDto({
        status: 'blocked',
        projectId: okBundle.projectId,
        stage: 'planning',
        code: 'unsafe_context_bundle',
        message: 'unsafe',
        candidatePathCount: 1,
        findingCount: 0,
        unscannableCount: 1,
      }),
    ).toBe(true);
    expect(
      isContextBundleBlockedDto({
        status: 'blocked',
        projectId: okBundle.projectId,
        stage: 'planning',
        code: 'unsafe_context_bundle',
        message: 'unsafe',
      }),
    ).toBe(false);
  });

  it('parses create request and latest query', () => {
    expect(parseContextBundleRequest({ stage: 'planning' }).ok).toBe(true);
    expect(parseContextBundleRequest({ stage: 'deploy' }).ok).toBe(false);
    expect(
      parseContextBundleLatestQuery({ stage: 'planning', limit: '1' }).ok,
    ).toBe(true);
    expect(
      parseContextBundleLatestQuery({ stage: 'planning', limit: '2' }).ok,
    ).toBe(false);
    expect(parseContextBundleLatestQuery({ limit: '1' }).ok).toBe(false);
  });

  it('accepts latest list wrapper', () => {
    expect(
      isContextBundleLatestListDto({
        status: 'ok',
        items: [okBundle],
      }),
    ).toBe(true);
  });
});

describe('shared-contracts context disclosure preview/approval', () => {
  const okPreview = {
    status: 'ok' as const,
    previewSessionId: '44444444-4444-4444-4444-444444444444',
    previewPolicyId: PREVIEW_POLICY_ID,
    approvalPolicyId: APPROVAL_POLICY_ID,
    previewIntegrityHash: 'd'.repeat(64),
    createdAt: '2026-07-29T00:00:00.000Z',
    expiresAt: '2026-07-29T00:15:00.000Z',
    bundleId: '33333333-3333-3333-3333-333333333333',
    projectId: '11111111-1111-1111-1111-111111111111',
    stage: 'planning' as const,
    manifestHash: 'b'.repeat(64),
    selectionPolicyId: 'full-file-lines-v1' as const,
    tokenEstimatorId: 'unicode-codepoints-div-4-v1' as const,
    manifestSchemaVersion: 1 as const,
    itemCount: 1,
    previewedCodePointCount: 5,
    totalTokenEstimate: 1,
    approvalRequired: true,
    items: [
      {
        path: 'AGENTS.md',
        contentHash: 'c'.repeat(64),
        lineRanges: [{ startLine: 1, endLine: 1 }],
        tokenEstimate: 1,
        excerpt: 'hello',
      },
    ],
  };

  const okApproval = {
    status: 'ok' as const,
    id: '55555555-5555-5555-5555-555555555555',
    projectId: okPreview.projectId,
    contextBundleId: okPreview.bundleId,
    previewSessionId: okPreview.previewSessionId,
    stage: 'planning' as const,
    configurationVersionId: '22222222-2222-2222-2222-222222222222',
    sourceHash: 'a'.repeat(64),
    manifestSchemaVersion: 1 as const,
    selectionPolicyId: 'full-file-lines-v1' as const,
    tokenEstimatorId: 'unicode-codepoints-div-4-v1' as const,
    manifestHash: okPreview.manifestHash,
    previewPolicyId: PREVIEW_POLICY_ID,
    approvalPolicyId: APPROVAL_POLICY_ID,
    previewIntegrityHash: okPreview.previewIntegrityHash,
    decision: 'approved' as const,
    contentTransmitted: false as const,
    createdAt: '2026-07-29T00:01:00.000Z',
    approvalRequired: false as const,
  };

  it('accepts a well-formed preview ok DTO', () => {
    expect(isContextDisclosurePreviewOkDto(okPreview)).toBe(true);
  });

  it('rejects contentTransmitted anywhere on the preview ok DTO', () => {
    expect(
      isContextDisclosurePreviewOkDto({ ...okPreview, contentTransmitted: false }),
    ).toBe(false);
  });

  it('rejects a preview ok DTO with a mismatched policy id', () => {
    expect(
      isContextDisclosurePreviewOkDto({
        ...okPreview,
        previewPolicyId: 'other-policy',
      }),
    ).toBe(false);
  });

  it('accepts a well-formed approval ok DTO requiring contentTransmitted === false', () => {
    expect(isContextDisclosureApprovalOkDto(okApproval)).toBe(true);
  });

  it('rejects an approval ok DTO with contentTransmitted true or missing', () => {
    expect(
      isContextDisclosureApprovalOkDto({ ...okApproval, contentTransmitted: true }),
    ).toBe(false);
    const { contentTransmitted: _omit, ...withoutFlag } = okApproval;
    expect(isContextDisclosureApprovalOkDto(withoutFlag)).toBe(false);
  });

  it('rejects an approval ok DTO with approvalRequired true or decision not approved', () => {
    expect(
      isContextDisclosureApprovalOkDto({ ...okApproval, approvalRequired: true }),
    ).toBe(false);
    expect(
      isContextDisclosureApprovalOkDto({ ...okApproval, decision: 'rejected' }),
    ).toBe(false);
  });

  it('accepts a well-formed disclosure status ok DTO', () => {
    expect(
      isContextDisclosureStatusOkDto({
        status: 'ok',
        projectId: okPreview.projectId,
        contextBundleId: okPreview.bundleId,
        stage: 'planning',
        manifestHash: okPreview.manifestHash,
        previewPolicyId: PREVIEW_POLICY_ID,
        approvalPolicyId: APPROVAL_POLICY_ID,
        approvalRequired: false,
        coveringApprovalId: okApproval.id,
        contentTransmitted: false,
      }),
    ).toBe(true);
  });

  it('rejects a disclosure status DTO implying transmission', () => {
    expect(
      isContextDisclosureStatusOkDto({
        status: 'ok',
        projectId: okPreview.projectId,
        contextBundleId: okPreview.bundleId,
        stage: 'planning',
        manifestHash: okPreview.manifestHash,
        previewPolicyId: PREVIEW_POLICY_ID,
        approvalPolicyId: APPROVAL_POLICY_ID,
        approvalRequired: false,
        coveringApprovalId: null,
        contentTransmitted: true,
      }),
    ).toBe(false);
  });

  it('accepts the latest approval list wrapper', () => {
    expect(
      isContextDisclosureApprovalLatestListDto({
        status: 'ok',
        items: [okApproval],
      }),
    ).toBe(true);
    expect(
      isContextDisclosureApprovalLatestListDto({ status: 'ok', items: [] }),
    ).toBe(true);
  });

  it('rejects a latest approval list containing an invalid item', () => {
    expect(
      isContextDisclosureApprovalLatestListDto({
        status: 'ok',
        items: [{ ...okApproval, contentTransmitted: true }],
      }),
    ).toBe(false);
  });

  it('parses a well-formed approval request exactly', () => {
    const parsed = parseDisclosureApprovalRequest({
      previewSessionId: okPreview.previewSessionId,
      manifestHash: okPreview.manifestHash,
      decision: 'approved',
    });
    expect(parsed.ok).toBe(true);
  });

  it('rejects an approval request missing previewSessionId as disclosure_preview_required', () => {
    const parsed = parseDisclosureApprovalRequest({
      manifestHash: okPreview.manifestHash,
      decision: 'approved',
    });
    expect(parsed).toEqual({ ok: false, code: 'disclosure_preview_required' });
  });

  it('rejects an approval request with a bad decision as invalid_disclosure_approval', () => {
    const parsed = parseDisclosureApprovalRequest({
      previewSessionId: okPreview.previewSessionId,
      manifestHash: okPreview.manifestHash,
      decision: 'rejected',
    });
    expect(parsed).toEqual({ ok: false, code: 'invalid_disclosure_approval' });
  });

  it('parses the latest approval query and rejects invalid shapes', () => {
    expect(
      parseDisclosureApprovalLatestQuery({ stage: 'planning', limit: '1' }).ok,
    ).toBe(true);
    expect(
      parseDisclosureApprovalLatestQuery({ stage: 'planning', limit: '2' }).ok,
    ).toBe(false);
    expect(parseDisclosureApprovalLatestQuery({ limit: '1' }).ok).toBe(false);
  });
});

describe('deepseek probe contracts', () => {
  const okProbe = {
    status: 'ok' as const,
    projectId: '11111111-1111-4111-8111-111111111111',
    stage: 'discovery' as const,
    providerId: 'deepseek' as const,
    modelAlias: 'deepseek-flash',
    resolvedModelId: 'deepseek-v4-flash' as const,
    schemaId: DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID,
    attemptCount: 1,
    providerHttpStatus: 200 as const,
    latencyMs: 12,
    parsed: {
      ok: true as const,
      probe: DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID,
      message: 'probe-ok',
    },
  };

  it('accepts a valid DeepSeek probe ok DTO', () => {
    expect(isDeepseekProbeOkDto(okProbe)).toBe(true);
  });

  it('rejects probe ok missing attemptCount', () => {
    const { attemptCount: _a, ...rest } = okProbe;
    expect(isDeepseekProbeOkDto(rest)).toBe(false);
  });

  it('rejects probe ok with invalid parsed schema', () => {
    expect(
      isDeepseekProbeOkDto({
        ...okProbe,
        parsed: { ok: true, probe: 'other', message: 'x' },
      }),
    ).toBe(false);
  });

  it('defaults omitted stage to discovery and rejects new/extra fields', () => {
    expect(parseDeepseekProbeRequest({})).toEqual({
      ok: true,
      stage: 'discovery',
    });
    expect(parseDeepseekProbeRequest(undefined)).toEqual({
      ok: true,
      stage: 'discovery',
    });
    expect(parseDeepseekProbeRequest({ stage: 'planning' })).toEqual({
      ok: true,
      stage: 'planning',
    });
    expect(parseDeepseekProbeRequest({ stage: 'new' })).toEqual({
      ok: false,
      code: 'invalid_deepseek_probe_request',
    });
    expect(parseDeepseekProbeRequest({ stage: 'discovery', extra: 1 })).toEqual(
      {
        ok: false,
        code: 'invalid_deepseek_probe_request',
      },
    );
  });

  it('does not treat DeepSeek codes as context-bundle blocked members', () => {
    expect(isContextBundleBlockedCode('deepseek_not_configured')).toBe(false);
    expect(isSecretScanBlockedCode('deepseek_schema_invalid')).toBe(false);
  });
});
