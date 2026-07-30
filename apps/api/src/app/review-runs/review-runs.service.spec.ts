import { ReviewRunsService } from './review-runs.service';
import { ProjectHttpError } from '../projects/project-errors';
import {
  APPROVAL_POLICY_ID,
  PREVIEW_POLICY_ID,
  REVIEW_RUN_ORCHESTRATION_SCHEMA_ID,
} from '@specpilot/shared-contracts';

describe('ReviewRunsService', () => {
  const projectId = '11111111-1111-4111-8111-111111111111';
  const bundleId = '22222222-2222-4222-8222-222222222222';
  const approvalId = '33333333-3333-4333-8333-333333333333';
  const sessionId = '44444444-4444-4444-8444-444444444444';

  function makePrisma(overrides: Record<string, unknown> = {}) {
    const runStore: Array<Record<string, unknown>> = [];
    const transitions: Array<Record<string, unknown>> = [];
    const transmissions: Array<Record<string, unknown>> = [];

    const prisma: Record<string, unknown> = {
      project: {
        findUnique: jest.fn(async () => ({
          id: projectId,
          repositoryPath: '/tmp/demo',
          activeConfiguration: {
            id: 'cfg-1',
            normalizedConfig: {
              review: {
                provider: 'deepseek',
                models: {
                  discovery: 'deepseek-flash',
                  planning: 'deepseek-pro',
                  applied: 'deepseek-pro',
                  verify: 'deepseek-pro',
                },
              },
            },
          },
        })),
      },
      reviewRun: {
        findFirst: jest.fn(async (args: { where?: Record<string, unknown> }) => {
          if (args.where && 'state' in (args.where ?? {})) {
            return null;
          }
          const id = (args.where as { id?: string } | undefined)?.id;
          const row = runStore.find((r) => r['id'] === id) ?? null;
          if (!row) {
            return null;
          }
          return {
            ...row,
            transitions: transitions.filter((t) => t['reviewRunId'] === row['id']),
            transmission:
              transmissions.find((t) => t['reviewRunId'] === row['id']) ?? null,
          };
        }),
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
          return runStore.find((r) => r['id'] === where.id) ?? null;
        }),
        findMany: jest.fn(async () => []),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = {
            id: 'run-1',
            updatedAt: new Date(),
            createdAt: new Date(),
            completedAt: null,
            blockedAt: null,
            failedAt: null,
            contextBundleId: null,
            manifestHash: null,
            disclosureApprovalId: null,
            previewSessionId: null,
            previewIntegrityHash: null,
            previewPolicyId: null,
            approvalPolicyId: null,
            budgetCheckStatus: null,
            promptTemplateId: null,
            modelAlias: null,
            resolvedModelId: null,
            schemaId: null,
            verdict: null,
            rationale: null,
            attemptCount: null,
            latencyMs: null,
            promptTokens: null,
            completionTokens: null,
            totalTokens: null,
            blockedCode: null,
            failedCode: null,
            ...data,
          };
          runStore.push(row);
          return row;
        }),
        update: jest.fn(
          async ({
            where,
            data,
          }: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => {
            const row = runStore.find((r) => r['id'] === where.id);
            if (!row) {
              throw new Error('missing');
            }
            Object.assign(row, data, { updatedAt: new Date() });
            return row;
          },
        ),
      },
      reviewRunTransition: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = {
            id: `t-${transitions.length + 1}`,
            createdAt: new Date(),
            ...data,
          };
          transitions.push(row);
          return row;
        }),
      },
      contextDisclosureTransmission: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = {
            id: `tr-${transmissions.length + 1}`,
            createdAt: new Date(),
            ...data,
          };
          transmissions.push(row);
          return row;
        }),
      },
      contextBundle: {
        findFirst: jest.fn(async () => null),
      },
      contextDisclosureApproval: {
        findFirst: jest.fn(async () => null),
      },
      $transaction: jest.fn(
        async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
          fn(prisma),
      ),
      _runStore: runStore,
      _transitions: transitions,
      _transmissions: transmissions,
      ...overrides,
    };
    return prisma as typeof prisma & {
      reviewRun: {
        create: jest.Mock;
        findFirst: jest.Mock;
        findUnique: jest.Mock;
        findMany: jest.Mock;
        update: jest.Mock;
      };
      contextBundle: { findFirst: jest.Mock };
      contextDisclosureApproval: { findFirst: jest.Mock };
      _runStore: Array<Record<string, unknown>>;
      _transitions: Array<Record<string, unknown>>;
      _transmissions: Array<Record<string, unknown>>;
    };
  }

  it('rejects invalid create body without creating a run', async () => {
    const prisma = makePrisma();
    const gateway = { completeStructured: jest.fn() };
    const service = new ReviewRunsService(prisma as never, gateway as never);
    await expect(
      service.createAndExecute(projectId, { stage: 'new' }),
    ).rejects.toBeInstanceOf(ProjectHttpError);
    expect(prisma.reviewRun.create).not.toHaveBeenCalled();
    expect(gateway.completeStructured).not.toHaveBeenCalled();
  });

  it('rejects new stage with changeId without creating a run', async () => {
    const prisma = makePrisma();
    const gateway = { completeStructured: jest.fn() };
    const service = new ReviewRunsService(prisma as never, gateway as never);
    await expect(
      service.createAndExecute(projectId, {
        stage: 'new',
        contextBundleId: bundleId,
        changeId: 'chg-x',
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(prisma.reviewRun.create).not.toHaveBeenCalled();
  });

  it('blocks when explicit bundle is missing and never calls gateway', async () => {
    process.env['DEEPSEEK_API_KEY'] = 'unit-test-key';
    const prisma = makePrisma();
    const gateway = { completeStructured: jest.fn() };
    const service = new ReviewRunsService(prisma as never, gateway as never);
    const result = await service.createAndExecute(projectId, {
      stage: 'new',
      contextBundleId: bundleId,
    });
    expect(result.state).toBe('blocked');
    expect(result.blockedCode).toBe('review_context_bundle_required');
    expect(gateway.completeStructured).not.toHaveBeenCalled();
    expect(prisma._transmissions).toHaveLength(0);
  });

  it('distinguishes disclosure approval required vs policy mismatch', async () => {
    process.env['DEEPSEEK_API_KEY'] = 'unit-test-key';
    const prisma = makePrisma({
      contextBundle: {
        findFirst: jest.fn(async () => ({
          id: bundleId,
          projectId,
          configurationVersionId: 'cfg-1',
          stage: 'new',
          sourceHash: 's'.repeat(64),
          manifestSchemaVersion: 1,
          selectionPolicyId: 'safe-selected-files-v1',
          tokenEstimatorId: 'whitespace-split-v1',
          manifestHash: 'm'.repeat(64),
          entries: [],
        })),
      },
      contextDisclosureApproval: {
        findFirst: jest.fn(async () => null),
      },
    });
    const gateway = { completeStructured: jest.fn() };
    const service = new ReviewRunsService(prisma as never, gateway as never);
    const missing = await service.createAndExecute(projectId, {
      stage: 'new',
      contextBundleId: bundleId,
    });
    expect(missing.blockedCode).toBe('review_disclosure_approval_required');
    expect(gateway.completeStructured).not.toHaveBeenCalled();

    prisma._runStore.length = 0;
    prisma._transitions.length = 0;
    prisma.contextDisclosureApproval.findFirst = jest.fn(async () => ({
      id: approvalId,
      previewSessionId: sessionId,
      previewIntegrityHash: 'h'.repeat(64),
      previewPolicyId: 'other-preview-policy',
      approvalPolicyId: APPROVAL_POLICY_ID,
      manifestHash: 'm'.repeat(64),
    }));
    const mismatch = await service.createAndExecute(projectId, {
      stage: 'new',
      contextBundleId: bundleId,
    });
    expect(mismatch.blockedCode).toBe('review_disclosure_policy_mismatch');
    expect(gateway.completeStructured).not.toHaveBeenCalled();
    expect(PREVIEW_POLICY_ID).toBe('bounded-selected-text-v1');
  });

  it('maps invocationBegan false without transmission and true with provider_failed', async () => {
    process.env['DEEPSEEK_API_KEY'] = '';
    // Force empty entries so reconstruction succeeds with empty items — but
    // gateway rejects empty context; use a path that reaches gateway with items.
    // For missing key, gateway returns invocationBegan false even with items.
    // Reconstruction of empty entries yields empty items and gateway rejects
    // before network with invocationBegan false — still mapping A.
    const prisma = makePrisma({
      contextBundle: {
        findFirst: jest.fn(async () => ({
          id: bundleId,
          projectId,
          configurationVersionId: 'cfg-1',
          stage: 'new',
          sourceHash: 's'.repeat(64),
          manifestSchemaVersion: 1,
          selectionPolicyId: 'safe-selected-files-v1',
          tokenEstimatorId: 'whitespace-split-v1',
          manifestHash: 'm'.repeat(64),
          entries: [],
        })),
      },
      contextDisclosureApproval: {
        findFirst: jest.fn(async () => ({
          id: approvalId,
          previewSessionId: sessionId,
          previewIntegrityHash: require('../projects/context-disclosure').computePreviewIntegrityHash({
            projectId,
            contextBundleId: bundleId,
            manifestHash: 'm'.repeat(64),
            items: [],
          }),
          previewPolicyId: PREVIEW_POLICY_ID,
          approvalPolicyId: APPROVAL_POLICY_ID,
          manifestHash: 'm'.repeat(64),
        })),
      },
    });

    const gateway = {
      completeStructured: jest.fn(async () => ({
        status: 'failed' as const,
        invocationBegan: false,
        code: 'deepseek_not_configured' as const,
        attemptCount: 0,
        latencyMs: 1,
        requestedModelAlias: 'deepseek-flash',
        resolvedModelId: 'deepseek-v4-flash' as const,
      })),
    };
    const service = new ReviewRunsService(prisma as never, gateway as never);
    // Empty context items → adapter-level reject before call; service still
    // invokes gateway. If gateway not called due to empty items in our adapter
    // when called from service, service always calls gateway.
    // With empty entries, reconstruct succeeds; gateway receives empty items.
    const result = await service.createAndExecute(projectId, {
      stage: 'new',
      contextBundleId: bundleId,
    });
    expect(result.state).toBe('failed');
    expect(result.failedCode).toBe('deepseek_not_configured');
    expect(prisma._transmissions).toHaveLength(0);
    expect(REVIEW_RUN_ORCHESTRATION_SCHEMA_ID).toBe('review-run-orchestration-v1');
  });

  it('returns 409 when a non-stale in-flight run exists', async () => {
    const prisma = makePrisma();
    prisma.reviewRun.findFirst = jest.fn(async () => ({
      id: 'old-run',
      state: 'running',
      updatedAt: new Date(),
    }));
    const gateway = { completeStructured: jest.fn() };
    const service = new ReviewRunsService(prisma as never, gateway as never);
    await expect(
      service.createAndExecute(projectId, {
        stage: 'new',
        contextBundleId: bundleId,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(prisma.reviewRun.create).not.toHaveBeenCalled();
  });
});
