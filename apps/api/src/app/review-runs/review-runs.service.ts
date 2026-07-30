import { constants, open } from 'node:fs/promises';
import { join } from 'node:path';
import {
  HttpException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ContextBundleEntryDto,
  DeepseekResolvedModelId,
  ProjectErrorCode,
  ReviewRunListItemDto,
  ReviewRunOkDto,
  ReviewRunState,
  ReviewRunTransmissionOutcome,
  ReviewStage,
} from '@specpilot/shared-contracts';
import {
  APPROVAL_POLICY_ID,
  DISCLOSURE_PREVIEW_MAX_ENTRY_CODE_POINTS,
  DISCLOSURE_PREVIEW_MAX_FILE_BYTES,
  DISCLOSURE_PREVIEW_MAX_TOTAL_BYTES,
  DISCLOSURE_PREVIEW_MAX_TOTAL_CODE_POINTS,
  DISCLOSURE_PREVIEW_TIMEOUT_MS,
  isReviewRunOrchestrationParsedDto,
  isReviewStage,
  isStageValidVerdict,
  parseReviewRunCreateRequest,
  PREVIEW_POLICY_ID,
  REVIEW_RUN_ORCHESTRATION_SCHEMA_ID,
  REVIEW_RUN_PROMPT_TEMPLATE_ID,
} from '@specpilot/shared-contracts';
import type {
  DeepseekGatewayPort,
  DeepseekOrchestrationContextItem,
  DeepseekStructuredExecutionResult,
} from '../deepseek/deepseek-gateway.port';
import { modelFromReviewStage } from '../deepseek/deepseek-model-catalog';
import {
  DEEPSEEK_API_KEY_ENV,
  DEEPSEEK_GATEWAY_PORT,
} from '../deepseek/deepseek.constants';
import { decodeCleanText, hashBytes } from '../projects/context-bundle-manifest';
import {
  codePointCount,
  computePreviewIntegrityHash,
  extractExcerpt,
} from '../projects/context-disclosure';
import {
  blocked422,
  conflict409,
  internal500,
  notFound404,
} from '../projects/project-errors';
import { PrismaService } from '../prisma.service';
import {
  IN_FLIGHT_STATES,
  PROVIDER_FAILED_CODES,
  RESPONSE_INVALID_CODES,
  REVIEW_RUN_LIST_DEFAULT_LIMIT,
  REVIEW_RUN_LIST_MAX_LIMIT,
  STALE_RUN_TTL_MS,
} from './review-runs.constants';
import { isAllowedTransition } from './review-runs-state';
import {
  toReviewRunListItemDto,
  toReviewRunOkDto,
  type ReviewRunRow,
} from './review-runs.mapper';

type BundleRow = {
  id: string;
  projectId: string;
  configurationVersionId: string;
  stage: string;
  sourceHash: string;
  manifestSchemaVersion: number;
  selectionPolicyId: string;
  tokenEstimatorId: string;
  manifestHash: string;
  entries: ContextBundleEntryDto[];
};

type ApprovalRow = {
  id: string;
  previewSessionId: string;
  previewIntegrityHash: string;
  previewPolicyId: string;
  approvalPolicyId: string;
  manifestHash: string;
};

type BuiltContextItem = DeepseekOrchestrationContextItem & {
  tokenEstimate: number;
};

type ReconstructResult =
  | { ok: true; items: BuiltContextItem[]; previewIntegrityHash: string }
  | { ok: false; code: 'review_context_integrity_mismatch' | 'review_context_limit_exceeded' };

const UNREADABLE_ERRNO_CODES: ReadonlyArray<string> = [
  'ELOOP',
  'ENOENT',
  'EACCES',
  'EPERM',
  'ENOTDIR',
  'EISDIR',
];

function isInvalidRelativePath(relativePath: string): boolean {
  if (relativePath.length === 0) {
    return true;
  }
  if (relativePath.includes('\0')) {
    return true;
  }
  if (relativePath.startsWith('/') || relativePath.startsWith('./')) {
    return true;
  }
  if (relativePath.includes('\\')) {
    return true;
  }
  const segments = relativePath.split('/');
  return segments.some((s) => s === '' || s === '.' || s === '..');
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class ReviewRunsService {
  private readonly logger = new Logger(ReviewRunsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(DEEPSEEK_GATEWAY_PORT)
    private readonly gateway: DeepseekGatewayPort,
  ) {}

  async createAndExecute(
    projectId: string,
    body: unknown,
  ): Promise<ReviewRunOkDto> {
    const parsed = parseReviewRunCreateRequest(body);
    if (!parsed.ok) {
      throw blocked422('invalid_review_run_request');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { activeConfiguration: true },
    });
    if (!project) {
      throw notFound404('project_not_found');
    }
    if (!project.activeConfiguration) {
      throw notFound404('configuration_not_found');
    }

    await this.recoverStaleInFlight(projectId);

    let runId: string;
    try {
      runId = await this.createRequestedRun({
        projectId,
        configurationVersionId: project.activeConfiguration.id,
        stage: parsed.stage,
        changeId: parsed.changeId ?? null,
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw conflict409('review_run_in_progress');
      }
      this.logger.log(
        JSON.stringify({
          event: 'review_run_create_failed',
          projectId,
          code: 'review_run_failed',
        }),
      );
      throw internal500('review_run_failed');
    }

    try {
      await this.executePipeline({
        runId,
        repositoryPath: project.repositoryPath,
        normalizedConfig: project.activeConfiguration.normalizedConfig,
        requestedContextBundleId: parsed.contextBundleId,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        // Prefer returning a terminal failed DTO when the row was persisted.
        const current = await this.prisma.reviewRun.findFirst({
          where: { id: runId, projectId },
        });
        if (
          current &&
          (current.state === 'failed' ||
            current.state === 'blocked' ||
            current.state === 'completed')
        ) {
          return this.getById(projectId, runId);
        }
        throw error;
      }
      this.logger.log(
        JSON.stringify({
          event: 'review_run_pipeline_failed',
          projectId,
          runId,
          code: 'review_run_failed',
        }),
      );
      await this.safeFail(runId, 'review_run_failed');
    }

    return this.getById(projectId, runId);
  }

  async getById(projectId: string, runId: string): Promise<ReviewRunOkDto> {
    const row = await this.prisma.reviewRun.findFirst({
      where: { id: runId, projectId },
      include: {
        transitions: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        transmission: true,
      },
    });
    if (!row) {
      throw notFound404('review_run_not_found');
    }
    return toReviewRunOkDto(row as ReviewRunRow);
  }

  async list(
    projectId: string,
    query: unknown,
  ): Promise<ReviewRunListItemDto[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw notFound404('project_not_found');
    }

    const parsed = this.parseListQuery(query);
    if (!parsed.ok) {
      throw blocked422('invalid_review_run_request');
    }

    const rows = await this.prisma.reviewRun.findMany({
      where: {
        projectId,
        ...(parsed.stage ? { stage: parsed.stage } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: parsed.limit,
      include: {
        transmission: true,
        _count: { select: { transitions: true } },
      },
    });

    return rows.map((row) => toReviewRunListItemDto(row as ReviewRunRow));
  }

  private parseListQuery(
    value: unknown,
  ):
    | { ok: true; stage?: ReviewStage; limit: number }
    | { ok: false } {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false };
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    for (const key of keys) {
      if (key !== 'stage' && key !== 'limit') {
        return { ok: false };
      }
    }

    let stage: ReviewStage | undefined;
    if (record['stage'] !== undefined) {
      if (!isReviewStage(record['stage'])) {
        return { ok: false };
      }
      stage = record['stage'];
    }

    let limit = REVIEW_RUN_LIST_DEFAULT_LIMIT;
    if (record['limit'] !== undefined) {
      const raw =
        typeof record['limit'] === 'string'
          ? Number.parseInt(record['limit'], 10)
          : record['limit'];
      if (
        typeof raw !== 'number' ||
        !Number.isInteger(raw) ||
        raw < 1 ||
        raw > REVIEW_RUN_LIST_MAX_LIMIT
      ) {
        return { ok: false };
      }
      limit = raw;
    }

    return stage ? { ok: true, stage, limit } : { ok: true, limit };
  }

  private async recoverStaleInFlight(projectId: string): Promise<void> {
    const existing = await this.prisma.reviewRun.findFirst({
      where: {
        projectId,
        state: { in: [...IN_FLIGHT_STATES] },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    if (!existing) {
      return;
    }

    const ageMs = Date.now() - existing.updatedAt.getTime();
    if (ageMs < STALE_RUN_TTL_MS) {
      throw conflict409('review_run_in_progress');
    }

    await this.transition(existing.id, existing.state as ReviewRunState, 'failed', {
      failedCode: 'review_run_interrupted',
      failedAt: new Date(),
      code: 'review_run_interrupted',
    });
  }

  private async createRequestedRun(input: {
    projectId: string;
    configurationVersionId: string;
    stage: ReviewStage;
    changeId: string | null;
  }): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.reviewRun.create({
        data: {
          projectId: input.projectId,
          configurationVersionId: input.configurationVersionId,
          stage: input.stage,
          changeId: input.changeId,
          state: 'requested',
        },
      });
      await tx.reviewRunTransition.create({
        data: {
          reviewRunId: created.id,
          fromState: null,
          toState: 'requested',
          code: null,
        },
      });
      return created.id;
    });
  }

  private async executePipeline(input: {
    runId: string;
    repositoryPath: string;
    normalizedConfig: unknown;
    requestedContextBundleId: string;
  }): Promise<void> {
    const { runId, repositoryPath, normalizedConfig, requestedContextBundleId } =
      input;
    let run = await this.requireRun(runId);

    await this.transition(runId, 'requested', 'preparing_context');
    run = await this.requireRun(runId);

    const prepared = await this.prepareContext(
      { ...run, requestedContextBundleId },
      repositoryPath,
    );
    if (!prepared.ok) {
      await this.block(runId, 'preparing_context', prepared.code, {
        contextBundleId: prepared.contextBundleId ?? null,
        manifestHash: prepared.manifestHash ?? null,
        disclosureApprovalId: prepared.disclosureApprovalId ?? null,
        previewSessionId: prepared.previewSessionId ?? null,
        previewIntegrityHash: prepared.previewIntegrityHash ?? null,
        previewPolicyId: prepared.previewPolicyId ?? null,
        approvalPolicyId: prepared.approvalPolicyId ?? null,
      });
      return;
    }

    await this.prisma.reviewRun.update({
      where: { id: runId },
      data: {
        contextBundleId: prepared.bundle.id,
        manifestHash: prepared.bundle.manifestHash,
        disclosureApprovalId: prepared.approval.id,
        previewSessionId: prepared.approval.previewSessionId,
        previewIntegrityHash: prepared.approval.previewIntegrityHash,
        previewPolicyId: prepared.approval.previewPolicyId,
        approvalPolicyId: prepared.approval.approvalPolicyId,
      },
    });

    await this.transition(runId, 'preparing_context', 'budget_check', {
      budgetCheckStatus: 'not_enforced',
    });

    const model = this.resolveModel(normalizedConfig, run.stage as ReviewStage);
    if (!model) {
      await this.block(runId, 'budget_check', 'review_model_unresolved', {
        budgetCheckStatus: 'not_enforced',
      });
      return;
    }

    await this.transition(runId, 'budget_check', 'running', {
      budgetCheckStatus: 'not_enforced',
      promptTemplateId: REVIEW_RUN_PROMPT_TEMPLATE_ID,
      schemaId: REVIEW_RUN_ORCHESTRATION_SCHEMA_ID,
      modelAlias: model.alias,
      resolvedModelId: model.resolvedModelId,
    });

    const apiKey = process.env[DEEPSEEK_API_KEY_ENV]?.trim() ?? '';
    let gatewayResult: DeepseekStructuredExecutionResult;
    try {
      gatewayResult = await this.gateway.completeStructured({
        resolvedModelId: model.resolvedModelId,
        requestedModelAlias: model.alias,
        apiKey,
        profile: 'review_run_orchestration',
        orchestration: {
          stage: run.stage as ReviewStage,
          changeId: run.changeId ?? undefined,
          promptTemplateId: REVIEW_RUN_PROMPT_TEMPLATE_ID,
          schemaId: REVIEW_RUN_ORCHESTRATION_SCHEMA_ID,
          contextItems: prepared.items,
        },
      });
    } catch {
      await this.failWithoutTransmission(runId, 'running', 'deepseek_gateway_failed', {
        modelAlias: model.alias,
        resolvedModelId: model.resolvedModelId,
        promptTemplateId: REVIEW_RUN_PROMPT_TEMPLATE_ID,
        schemaId: REVIEW_RUN_ORCHESTRATION_SCHEMA_ID,
        attemptCount: 0,
      });
      return;
    }

    this.logger.log(
      JSON.stringify({
        event: 'review_run_gateway',
        runId,
        projectId: run.projectId,
        attemptCount: gatewayResult.attemptCount,
        latencyMs: gatewayResult.latencyMs,
        status: gatewayResult.status,
        invocationBegan: gatewayResult.invocationBegan,
        code:
          gatewayResult.status === 'ok' ? 'ok' : gatewayResult.code,
      }),
    );

    await this.applyGatewayResult(runId, prepared, gatewayResult, model);
  }

  private resolveModel(
    normalizedConfig: unknown,
    stage: ReviewStage,
  ): { alias: string; resolvedModelId: DeepseekResolvedModelId } | null {
    if (
      normalizedConfig === null ||
      typeof normalizedConfig !== 'object' ||
      Array.isArray(normalizedConfig)
    ) {
      return null;
    }
    const review = (normalizedConfig as Record<string, unknown>)['review'];
    if (review === null || typeof review !== 'object' || Array.isArray(review)) {
      return null;
    }
    return modelFromReviewStage(review as Record<string, unknown>, stage);
  }

  private async prepareContext(
    run: {
      id: string;
      projectId: string;
      stage: string;
      requestedContextBundleId: string;
    },
    repositoryPath: string,
  ): Promise<
    | {
        ok: true;
        bundle: BundleRow;
        approval: ApprovalRow;
        items: BuiltContextItem[];
      }
    | {
        ok: false;
        code: ProjectErrorCode;
        contextBundleId?: string | null;
        manifestHash?: string;
        disclosureApprovalId?: string;
        previewSessionId?: string;
        previewIntegrityHash?: string;
        previewPolicyId?: string;
        approvalPolicyId?: string;
      }
  > {
    const bundleRow = await this.prisma.contextBundle.findFirst({
      where: {
        id: run.requestedContextBundleId,
        projectId: run.projectId,
      },
    });
    if (!bundleRow) {
      return { ok: false, code: 'review_context_bundle_required' };
    }

    const bundle: BundleRow = {
      id: bundleRow.id,
      projectId: bundleRow.projectId,
      configurationVersionId: bundleRow.configurationVersionId,
      stage: bundleRow.stage,
      sourceHash: bundleRow.sourceHash,
      manifestSchemaVersion: bundleRow.manifestSchemaVersion,
      selectionPolicyId: bundleRow.selectionPolicyId,
      tokenEstimatorId: bundleRow.tokenEstimatorId,
      manifestHash: bundleRow.manifestHash,
      entries: bundleRow.entries as unknown as ContextBundleEntryDto[],
    };

    if (bundle.stage !== run.stage) {
      return {
        ok: false,
        code: 'review_context_bundle_stage_mismatch',
        contextBundleId: bundle.id,
        manifestHash: bundle.manifestHash,
      };
    }

    const materialMatch = await this.prisma.contextDisclosureApproval.findFirst({
      where: {
        projectId: bundle.projectId,
        stage: bundle.stage,
        manifestHash: bundle.manifestHash,
        sourceHash: bundle.sourceHash,
        manifestSchemaVersion: bundle.manifestSchemaVersion,
        selectionPolicyId: bundle.selectionPolicyId,
        tokenEstimatorId: bundle.tokenEstimatorId,
        decision: 'approved',
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    if (!materialMatch) {
      return {
        ok: false,
        code: 'review_disclosure_approval_required',
        contextBundleId: bundle.id,
        manifestHash: bundle.manifestHash,
      };
    }

    if (
      materialMatch.previewPolicyId !== PREVIEW_POLICY_ID ||
      materialMatch.approvalPolicyId !== APPROVAL_POLICY_ID
    ) {
      return {
        ok: false,
        code: 'review_disclosure_policy_mismatch',
        contextBundleId: bundle.id,
        manifestHash: bundle.manifestHash,
        disclosureApprovalId: materialMatch.id,
        previewSessionId: materialMatch.previewSessionId,
        previewIntegrityHash: materialMatch.previewIntegrityHash,
        previewPolicyId: materialMatch.previewPolicyId,
        approvalPolicyId: materialMatch.approvalPolicyId,
      };
    }

    const approval: ApprovalRow = {
      id: materialMatch.id,
      previewSessionId: materialMatch.previewSessionId,
      previewIntegrityHash: materialMatch.previewIntegrityHash,
      previewPolicyId: materialMatch.previewPolicyId,
      approvalPolicyId: materialMatch.approvalPolicyId,
      manifestHash: materialMatch.manifestHash,
    };

    const reconstructed = await this.reconstructContext(
      repositoryPath,
      bundle,
    );
    if (!reconstructed.ok) {
      return {
        ok: false,
        code: reconstructed.code,
        contextBundleId: bundle.id,
        manifestHash: bundle.manifestHash,
        disclosureApprovalId: approval.id,
        previewSessionId: approval.previewSessionId,
        previewIntegrityHash: approval.previewIntegrityHash,
        previewPolicyId: approval.previewPolicyId,
        approvalPolicyId: approval.approvalPolicyId,
      };
    }

    if (reconstructed.previewIntegrityHash !== approval.previewIntegrityHash) {
      return {
        ok: false,
        code: 'review_context_integrity_mismatch',
        contextBundleId: bundle.id,
        manifestHash: bundle.manifestHash,
        disclosureApprovalId: approval.id,
        previewSessionId: approval.previewSessionId,
        previewIntegrityHash: approval.previewIntegrityHash,
        previewPolicyId: approval.previewPolicyId,
        approvalPolicyId: approval.approvalPolicyId,
      };
    }

    return { ok: true, bundle, approval, items: reconstructed.items };
  }

  private async reconstructContext(
    repositoryRoot: string,
    bundle: BundleRow,
  ): Promise<ReconstructResult> {
    const startedAt = Date.now();
    let totalBytesRead = 0;
    let totalCodePoints = 0;
    const items: BuiltContextItem[] = [];

    for (const entry of bundle.entries) {
      if (Date.now() - startedAt >= DISCLOSURE_PREVIEW_TIMEOUT_MS) {
        return { ok: false, code: 'review_context_limit_exceeded' };
      }
      if (isInvalidRelativePath(entry.path)) {
        return { ok: false, code: 'review_context_integrity_mismatch' };
      }

      const absolutePath = join(repositoryRoot, entry.path);
      let buffer: Buffer;
      try {
        buffer = await this.readEntryBytes(absolutePath, totalBytesRead);
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          (error.message === 'limit' || error.message === 'unreadable')
        ) {
          return {
            ok: false,
            code:
              error.message === 'limit'
                ? 'review_context_limit_exceeded'
                : 'review_context_integrity_mismatch',
          };
        }
        return { ok: false, code: 'review_context_integrity_mismatch' };
      }
      totalBytesRead += buffer.byteLength;

      if (Date.now() - startedAt >= DISCLOSURE_PREVIEW_TIMEOUT_MS) {
        return { ok: false, code: 'review_context_limit_exceeded' };
      }

      const contentHash = hashBytes(buffer);
      if (contentHash !== entry.contentHash) {
        return { ok: false, code: 'review_context_integrity_mismatch' };
      }

      let text: string;
      try {
        text = decodeCleanText(buffer);
      } catch {
        return { ok: false, code: 'review_context_integrity_mismatch' };
      }

      const extracted = extractExcerpt(
        text,
        entry.lineRanges,
        buffer.byteLength,
      );
      if (!extracted.ok) {
        return { ok: false, code: 'review_context_integrity_mismatch' };
      }

      const excerptCodePoints = codePointCount(extracted.excerpt);
      if (excerptCodePoints > DISCLOSURE_PREVIEW_MAX_ENTRY_CODE_POINTS) {
        return { ok: false, code: 'review_context_limit_exceeded' };
      }
      totalCodePoints += excerptCodePoints;
      if (totalCodePoints > DISCLOSURE_PREVIEW_MAX_TOTAL_CODE_POINTS) {
        return { ok: false, code: 'review_context_limit_exceeded' };
      }

      items.push({
        path: entry.path,
        contentHash: entry.contentHash,
        lineRanges: entry.lineRanges,
        excerpt: extracted.excerpt,
        tokenEstimate: entry.tokenEstimate,
      });
    }

    const previewIntegrityHash = computePreviewIntegrityHash({
      projectId: bundle.projectId,
      contextBundleId: bundle.id,
      manifestHash: bundle.manifestHash,
      items: items.map((item) => ({
        path: item.path,
        contentHash: item.contentHash,
        lineRanges: [...item.lineRanges],
        excerpt: item.excerpt,
      })),
    });

    return { ok: true, items, previewIntegrityHash };
  }

  private async readEntryBytes(
    absolutePath: string,
    totalBytesReadSoFar: number,
  ): Promise<Buffer> {
    let handle: Awaited<ReturnType<typeof open>> | undefined;
    try {
      handle = await open(
        absolutePath,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      const stats = await handle.stat();
      if (!stats.isFile()) {
        throw new Error('unreadable');
      }
      const fileSize = stats.size;
      if (fileSize > DISCLOSURE_PREVIEW_MAX_FILE_BYTES) {
        throw new Error('unreadable');
      }
      if (totalBytesReadSoFar + fileSize > DISCLOSURE_PREVIEW_MAX_TOTAL_BYTES) {
        throw new Error('limit');
      }
      if (fileSize === 0) {
        return Buffer.alloc(0);
      }
      const buffer = Buffer.alloc(fileSize);
      const { bytesRead } = await handle.read(buffer, 0, fileSize, 0);
      if (bytesRead !== fileSize) {
        throw new Error('unreadable');
      }
      return buffer;
    } catch (error: unknown) {
      if (error instanceof Error && (error.message === 'limit' || error.message === 'unreadable')) {
        throw error;
      }
      const errno =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: unknown }).code)
          : '';
      if (UNREADABLE_ERRNO_CODES.includes(errno)) {
        throw new Error('unreadable');
      }
      throw new Error('unreadable');
    } finally {
      if (handle) {
        await handle.close().catch(() => undefined);
      }
    }
  }

  private async applyGatewayResult(
    runId: string,
    prepared: {
      bundle: BundleRow;
      approval: ApprovalRow;
      items: BuiltContextItem[];
    },
    result: DeepseekStructuredExecutionResult,
    model: { alias: string; resolvedModelId: DeepseekResolvedModelId },
  ): Promise<void> {
    if (result.status === 'failed' && !result.invocationBegan) {
      await this.failWithoutTransmission(runId, 'running', result.code, {
        modelAlias: model.alias,
        resolvedModelId: model.resolvedModelId,
        promptTemplateId: REVIEW_RUN_PROMPT_TEMPLATE_ID,
        schemaId: REVIEW_RUN_ORCHESTRATION_SCHEMA_ID,
        attemptCount: result.attemptCount,
        latencyMs: result.latencyMs,
      });
      return;
    }

    await this.transition(runId, 'running', 'validating_response', {
      attemptCount: result.attemptCount,
      latencyMs: result.latencyMs,
      promptTokens: result.usage?.promptTokens ?? null,
      completionTokens: result.usage?.completionTokens ?? null,
      totalTokens: result.usage?.totalTokens ?? null,
      modelAlias: result.requestedModelAlias ?? model.alias,
      resolvedModelId: result.resolvedModelId ?? model.resolvedModelId,
      promptTemplateId: REVIEW_RUN_PROMPT_TEMPLATE_ID,
      schemaId: REVIEW_RUN_ORCHESTRATION_SCHEMA_ID,
    });

    if (result.status === 'failed') {
      const outcome = this.transmissionOutcomeForCode(result.code);
      await this.persistTerminalWithTransmission({
        runId,
        fromState: 'validating_response',
        toState: 'failed',
        failedCode: result.code,
        transmission: {
          prepared,
          outcome,
          terminalCode: result.code,
          result,
          model,
        },
      });
      return;
    }

    const parsed = result.parsed;
    const run = await this.requireRun(runId);
    const stage = run.stage as ReviewStage;

    if (!isReviewRunOrchestrationParsedDto(parsed)) {
      const terminalCode: ProjectErrorCode =
        parsed !== null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        typeof (parsed as Record<string, unknown>)['verdict'] === 'string' &&
        !isStageValidVerdict(
          stage,
          (parsed as Record<string, unknown>)['verdict'] as string,
        )
          ? 'review_verdict_invalid'
          : 'review_schema_invalid';
      await this.persistTerminalWithTransmission({
        runId,
        fromState: 'validating_response',
        toState: 'failed',
        failedCode: terminalCode,
        transmission: {
          prepared,
          outcome: 'response_invalid',
          terminalCode,
          result,
          model,
        },
      });
      return;
    }

    if (parsed.stage !== stage) {
      await this.persistTerminalWithTransmission({
        runId,
        fromState: 'validating_response',
        toState: 'failed',
        failedCode: 'review_schema_invalid',
        transmission: {
          prepared,
          outcome: 'response_invalid',
          terminalCode: 'review_schema_invalid',
          result,
          model,
        },
      });
      return;
    }

    await this.persistTerminalWithTransmission({
      runId,
      fromState: 'validating_response',
      toState: 'completed',
      verdict: parsed.verdict,
      rationale: parsed.rationale,
      transmission: {
        prepared,
        outcome: 'completed',
        terminalCode: null,
        result,
        model,
      },
    });
  }

  private transmissionOutcomeForCode(
    code: string,
  ): ReviewRunTransmissionOutcome {
    if (RESPONSE_INVALID_CODES.has(code)) {
      return 'response_invalid';
    }
    if (PROVIDER_FAILED_CODES.has(code)) {
      return 'provider_failed';
    }
    return 'provider_failed';
  }

  private async persistTerminalWithTransmission(input: {
    runId: string;
    fromState: ReviewRunState;
    toState: 'completed' | 'failed';
    failedCode?: ProjectErrorCode;
    verdict?: string;
    rationale?: string;
    transmission: {
      prepared: {
        bundle: BundleRow;
        approval: ApprovalRow;
      };
      outcome: ReviewRunTransmissionOutcome;
      terminalCode: string | null;
      result: DeepseekStructuredExecutionResult;
      model: { alias: string; resolvedModelId: DeepseekResolvedModelId };
    };
  }): Promise<void> {
    if (!isAllowedTransition(input.fromState, input.toState)) {
      await this.safeFail(input.runId, 'review_run_invalid_transition');
      return;
    }

    const { prepared, outcome, terminalCode, result, model } =
      input.transmission;
    const now = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.contextDisclosureTransmission.create({
          data: {
            projectId: prepared.bundle.projectId,
            reviewRunId: input.runId,
            contextBundleId: prepared.bundle.id,
            disclosureApprovalId: prepared.approval.id,
            previewSessionId: prepared.approval.previewSessionId,
            manifestHash: prepared.bundle.manifestHash,
            previewIntegrityHash: prepared.approval.previewIntegrityHash,
            previewPolicyId: prepared.approval.previewPolicyId,
            approvalPolicyId: prepared.approval.approvalPolicyId,
            promptTemplateId: REVIEW_RUN_PROMPT_TEMPLATE_ID,
            schemaId: REVIEW_RUN_ORCHESTRATION_SCHEMA_ID,
            requestedModelAlias:
              result.requestedModelAlias ?? model.alias,
            resolvedModelId:
              result.resolvedModelId ?? model.resolvedModelId,
            outcome,
            attemptCount: result.attemptCount,
            latencyMs: result.latencyMs,
            promptTokens: result.usage?.promptTokens ?? null,
            completionTokens: result.usage?.completionTokens ?? null,
            totalTokens: result.usage?.totalTokens ?? null,
            providerRequestId: result.providerRequestId ?? null,
            terminalCode,
          },
        });

        await tx.reviewRun.update({
          where: { id: input.runId },
          data: {
            state: input.toState,
            verdict: input.verdict ?? null,
            rationale: input.rationale ?? null,
            failedCode: input.failedCode ?? null,
            attemptCount: result.attemptCount,
            latencyMs: result.latencyMs,
            promptTokens: result.usage?.promptTokens ?? null,
            completionTokens: result.usage?.completionTokens ?? null,
            totalTokens: result.usage?.totalTokens ?? null,
            completedAt: input.toState === 'completed' ? now : null,
            failedAt: input.toState === 'failed' ? now : null,
          },
        });

        await tx.reviewRunTransition.create({
          data: {
            reviewRunId: input.runId,
            fromState: input.fromState,
            toState: input.toState,
            code: input.failedCode ?? null,
          },
        });
      });
    } catch (error: unknown) {
      this.logger.log(
        JSON.stringify({
          event: 'review_run_post_provider_persist_failed',
          runId: input.runId,
          code: 'review_run_failed',
        }),
      );
      // Do not re-invoke DeepSeek. Best-effort local fail if still in-flight.
      await this.safeFail(input.runId, 'review_run_failed');
      const current = await this.prisma.reviewRun.findUnique({
        where: { id: input.runId },
      });
      if (current?.state === 'failed') {
        return;
      }
      throw internal500('review_run_failed');
    }
  }

  private async failWithoutTransmission(
    runId: string,
    fromState: ReviewRunState,
    code: ProjectErrorCode,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    await this.transition(runId, fromState, 'failed', {
      ...extra,
      failedCode: code,
      failedAt: new Date(),
      code,
    });
  }

  private async block(
    runId: string,
    fromState: ReviewRunState,
    code: ProjectErrorCode,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    await this.transition(runId, fromState, 'blocked', {
      ...extra,
      blockedCode: code,
      blockedAt: new Date(),
      code,
    });
  }

  private async safeFail(
    runId: string,
    code: ProjectErrorCode,
  ): Promise<void> {
    try {
      const run = await this.prisma.reviewRun.findUnique({
        where: { id: runId },
      });
      if (!run) {
        return;
      }
      const state = run.state as ReviewRunState;
      if (!isAllowedTransition(state, 'failed')) {
        return;
      }
      await this.transition(runId, state, 'failed', {
        failedCode: code,
        failedAt: new Date(),
        code,
      });
    } catch {
      // swallow — outer handler maps to HTTP
    }
  }

  private async transition(
    runId: string,
    fromState: ReviewRunState | string,
    toState: ReviewRunState,
    fields: Record<string, unknown> = {},
  ): Promise<void> {
    const from = fromState as ReviewRunState;
    if (!isAllowedTransition(from, toState)) {
      await this.safeFail(runId, 'review_run_invalid_transition');
      throw internal500('review_run_failed');
    }

    const {
      code: transitionCode,
      ...runFields
    } = fields;

    await this.prisma.$transaction(async (tx) => {
      await tx.reviewRun.update({
        where: { id: runId },
        data: {
          state: toState,
          ...runFields,
        },
      });
      await tx.reviewRunTransition.create({
        data: {
          reviewRunId: runId,
          fromState: from,
          toState,
          code:
            typeof transitionCode === 'string' || transitionCode === null
              ? (transitionCode as string | null)
              : null,
        },
      });
    });
  }

  private async requireRun(runId: string) {
    const run = await this.prisma.reviewRun.findUnique({
      where: { id: runId },
    });
    if (!run) {
      throw internal500('review_run_failed');
    }
    return run;
  }
}
