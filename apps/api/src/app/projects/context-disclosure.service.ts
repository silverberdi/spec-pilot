import { constants, open } from 'node:fs/promises';
import { join } from 'node:path';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import type {
  ContextBundleEntryDto,
  ContextDisclosureApprovalLatestListDto,
  ContextDisclosureApprovalOkDto,
  ContextDisclosurePreviewItemDto,
  ContextDisclosurePreviewOkDto,
  ContextDisclosureStatusOkDto,
  ReviewStage,
} from '@specpilot/shared-contracts';
import {
  APPROVAL_POLICY_ID,
  CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION,
  CONTEXT_BUNDLE_SELECTION_POLICY_ID,
  CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID,
  DISCLOSURE_PREVIEW_MAX_ENTRY_CODE_POINTS,
  DISCLOSURE_PREVIEW_MAX_FILE_BYTES,
  DISCLOSURE_PREVIEW_MAX_TOTAL_BYTES,
  DISCLOSURE_PREVIEW_MAX_TOTAL_CODE_POINTS,
  DISCLOSURE_PREVIEW_SESSION_TTL_MS,
  DISCLOSURE_PREVIEW_TIMEOUT_MS,
  parseDisclosureApprovalLatestQuery,
  PREVIEW_POLICY_ID,
} from '@specpilot/shared-contracts';
import { decodeCleanText, hashBytes } from './context-bundle-manifest';
import {
  codePointCount,
  computePreviewIntegrityHash,
  type CoverageFingerprint,
  extractExcerpt,
  isApprovalCovering,
} from './context-disclosure';
import { blocked422, internal500, notFound404 } from './project-errors';
import { PrismaService } from '../prisma.service';

type ProjectRow = { id: string; repositoryPath: string };

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

type BuiltPreviewItem = {
  path: string;
  contentHash: string;
  lineRanges: Array<{ startLine: number; endLine: number }>;
  tokenEstimate: number;
  excerpt: string;
};

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
  return segments.some((segment) => segment === '..');
}

function isErrnoLike(error: unknown, codes: ReadonlyArray<string>): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    codes.includes((error as { code: string }).code)
  );
}

/**
 * Preview + disclosure-approval flows (design D6/D7). Reuses the
 * open(O_RDONLY|O_NOFOLLOW)/stat/read pattern from secret-scan-reader and the
 * hashBytes/decodeCleanText helpers from context-bundle-manifest. Never
 * persists excerpts/bodies; discards ephemeral bytes after response
 * construction.
 */
@Injectable()
export class ContextDisclosureService {
  private readonly logger = new Logger(ContextDisclosureService.name);

  constructor(private readonly prisma: PrismaService) {}

  async preview(
    projectId: string,
    bundleId: string,
    _body?: unknown,
  ): Promise<ContextDisclosurePreviewOkDto> {
    const project = await this.loadProject(projectId);
    const bundle = await this.loadBundle(projectId, bundleId);

    const built = await this.buildPreviewItems(project.repositoryPath, bundle);

    const previewIntegrityHash = computePreviewIntegrityHash({
      projectId,
      contextBundleId: bundle.id,
      manifestHash: bundle.manifestHash,
      items: built,
    });

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + DISCLOSURE_PREVIEW_SESSION_TTL_MS);
    const previewedCodePointCount = built.reduce(
      (sum, item) => sum + codePointCount(item.excerpt),
      0,
    );
    const totalTokenEstimate = built.reduce(
      (sum, item) => sum + item.tokenEstimate,
      0,
    );

    let sessionId: string;
    try {
      const row = await this.prisma.contextDisclosurePreviewSession.create({
        data: {
          projectId,
          contextBundleId: bundle.id,
          stage: bundle.stage,
          configurationVersionId: bundle.configurationVersionId,
          sourceHash: bundle.sourceHash,
          manifestSchemaVersion: bundle.manifestSchemaVersion,
          selectionPolicyId: bundle.selectionPolicyId,
          tokenEstimatorId: bundle.tokenEstimatorId,
          manifestHash: bundle.manifestHash,
          previewPolicyId: PREVIEW_POLICY_ID,
          previewIntegrityHash,
          itemCount: built.length,
          previewedCodePointCount,
          createdAt,
          expiresAt,
        },
      });
      sessionId = row.id;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Disclosure preview session insert failed for ${projectId}/${bundleId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw internal500('disclosure_preview_failed');
    }

    const approvalRequired = await this.isApprovalRequired(bundle);

    const items: ContextDisclosurePreviewItemDto[] = built.map((item) => ({
      path: item.path,
      contentHash: item.contentHash,
      lineRanges: item.lineRanges,
      tokenEstimate: item.tokenEstimate,
      excerpt: item.excerpt,
    }));

    return {
      status: 'ok',
      previewSessionId: sessionId,
      previewPolicyId: PREVIEW_POLICY_ID,
      approvalPolicyId: APPROVAL_POLICY_ID,
      previewIntegrityHash,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      bundleId: bundle.id,
      projectId,
      stage: bundle.stage as ReviewStage,
      manifestHash: bundle.manifestHash,
      selectionPolicyId: CONTEXT_BUNDLE_SELECTION_POLICY_ID,
      tokenEstimatorId: CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID,
      manifestSchemaVersion: CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION,
      itemCount: built.length,
      previewedCodePointCount,
      totalTokenEstimate,
      approvalRequired,
      items,
    };
  }

  async approve(
    projectId: string,
    bundleId: string,
    body: unknown,
  ): Promise<ContextDisclosureApprovalOkDto> {
    const project = await this.loadProject(projectId);
    const bundle = await this.loadBundle(projectId, bundleId);

    const record =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {};

    const previewSessionId = record['previewSessionId'];
    if (typeof previewSessionId !== 'string' || previewSessionId.trim().length === 0) {
      throw blocked422('disclosure_preview_required');
    }

    const session = await this.prisma.contextDisclosurePreviewSession.findFirst({
      where: { id: previewSessionId, projectId, contextBundleId: bundle.id },
    });
    if (!session) {
      throw blocked422('disclosure_preview_required');
    }

    if (Date.now() >= session.expiresAt.getTime()) {
      throw blocked422('disclosure_preview_expired');
    }

    const decision = record['decision'];
    if (decision !== 'approved') {
      throw blocked422('invalid_disclosure_approval');
    }

    const manifestHash = record['manifestHash'];
    if (typeof manifestHash !== 'string' || manifestHash !== bundle.manifestHash) {
      throw blocked422('disclosure_manifest_mismatch');
    }

    const identityMatches =
      session.manifestHash === bundle.manifestHash &&
      session.manifestHash === manifestHash &&
      session.sourceHash === bundle.sourceHash &&
      session.configurationVersionId === bundle.configurationVersionId &&
      session.manifestSchemaVersion === bundle.manifestSchemaVersion &&
      session.selectionPolicyId === bundle.selectionPolicyId &&
      session.tokenEstimatorId === bundle.tokenEstimatorId &&
      session.stage === bundle.stage;
    if (!identityMatches) {
      throw blocked422('disclosure_preview_binding_mismatch');
    }

    if (session.previewPolicyId !== PREVIEW_POLICY_ID) {
      throw blocked422('disclosure_preview_policy_mismatch');
    }

    // Mandatory full integrity re-check (design D7 step 9): rebuild canonical
    // excerpts from live bytes and recompute the integrity hash. Any
    // read/hash/range failure here fails closed with no approval row.
    const rebuilt = await this.buildPreviewItems(project.repositoryPath, bundle);
    const recomputedHash = computePreviewIntegrityHash({
      projectId,
      contextBundleId: bundle.id,
      manifestHash: bundle.manifestHash,
      items: rebuilt,
    });
    if (recomputedHash !== session.previewIntegrityHash) {
      throw blocked422('disclosure_preview_integrity_mismatch');
    }

    let row;
    try {
      row = await this.prisma.contextDisclosureApproval.create({
        data: {
          projectId,
          contextBundleId: bundle.id,
          previewSessionId: session.id,
          stage: bundle.stage,
          configurationVersionId: bundle.configurationVersionId,
          sourceHash: bundle.sourceHash,
          manifestSchemaVersion: bundle.manifestSchemaVersion,
          selectionPolicyId: bundle.selectionPolicyId,
          tokenEstimatorId: bundle.tokenEstimatorId,
          manifestHash: bundle.manifestHash,
          previewPolicyId: session.previewPolicyId,
          approvalPolicyId: APPROVAL_POLICY_ID,
          previewIntegrityHash: recomputedHash,
          decision: 'approved',
          contentTransmitted: false,
        },
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Disclosure approval insert failed for ${projectId}/${bundleId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw internal500('disclosure_approval_failed');
    }

    return {
      status: 'ok',
      id: row.id,
      projectId,
      contextBundleId: bundle.id,
      previewSessionId: session.id,
      stage: bundle.stage as ReviewStage,
      configurationVersionId: bundle.configurationVersionId,
      sourceHash: bundle.sourceHash,
      manifestSchemaVersion: CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION,
      selectionPolicyId: CONTEXT_BUNDLE_SELECTION_POLICY_ID,
      tokenEstimatorId: CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID,
      manifestHash: bundle.manifestHash,
      previewPolicyId: PREVIEW_POLICY_ID,
      approvalPolicyId: APPROVAL_POLICY_ID,
      previewIntegrityHash: recomputedHash,
      decision: 'approved',
      contentTransmitted: false,
      createdAt: row.createdAt.toISOString(),
      approvalRequired: false,
    };
  }

  async status(
    projectId: string,
    bundleId: string,
  ): Promise<ContextDisclosureStatusOkDto> {
    await this.loadProject(projectId);
    const bundle = await this.loadBundle(projectId, bundleId);

    const coveringApprovalId = await this.findCoveringApprovalId(bundle);

    return {
      status: 'ok',
      projectId,
      contextBundleId: bundle.id,
      stage: bundle.stage as ReviewStage,
      manifestHash: bundle.manifestHash,
      previewPolicyId: PREVIEW_POLICY_ID,
      approvalPolicyId: APPROVAL_POLICY_ID,
      approvalRequired: coveringApprovalId === null,
      coveringApprovalId,
      contentTransmitted: false,
    };
  }

  async latest(
    projectId: string,
    query: Record<string, unknown>,
  ): Promise<ContextDisclosureApprovalLatestListDto> {
    const parsed = parseDisclosureApprovalLatestQuery(query);
    if (!parsed.ok) {
      throw blocked422('invalid_disclosure_approval_query');
    }

    await this.loadProject(projectId);

    const rows = await this.prisma.contextDisclosureApproval.findMany({
      where: { projectId, stage: parsed.stage },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 1,
    });

    return {
      status: 'ok',
      items: rows.map((row) => this.toApprovalOkDto(row)),
    };
  }

  private toApprovalOkDto(row: {
    id: string;
    projectId: string;
    contextBundleId: string;
    previewSessionId: string;
    stage: string;
    configurationVersionId: string;
    sourceHash: string;
    manifestSchemaVersion: number;
    selectionPolicyId: string;
    tokenEstimatorId: string;
    manifestHash: string;
    previewPolicyId: string;
    approvalPolicyId: string;
    previewIntegrityHash: string;
    decision: string;
    contentTransmitted: boolean;
    createdAt: Date;
  }): ContextDisclosureApprovalOkDto {
    return {
      status: 'ok',
      id: row.id,
      projectId: row.projectId,
      contextBundleId: row.contextBundleId,
      previewSessionId: row.previewSessionId,
      stage: row.stage as ReviewStage,
      configurationVersionId: row.configurationVersionId,
      sourceHash: row.sourceHash,
      manifestSchemaVersion: CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION,
      selectionPolicyId: CONTEXT_BUNDLE_SELECTION_POLICY_ID,
      tokenEstimatorId: CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID,
      manifestHash: row.manifestHash,
      previewPolicyId: PREVIEW_POLICY_ID,
      approvalPolicyId: APPROVAL_POLICY_ID,
      previewIntegrityHash: row.previewIntegrityHash,
      decision: 'approved',
      contentTransmitted: false,
      createdAt: row.createdAt.toISOString(),
      approvalRequired: false,
    };
  }

  private async findCoveringApprovalId(bundle: BundleRow): Promise<string | null> {
    const rows = await this.prisma.contextDisclosureApproval.findMany({
      where: { projectId: bundle.projectId, stage: bundle.stage, decision: 'approved' },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    const candidate: CoverageFingerprint = {
      projectId: bundle.projectId,
      stage: bundle.stage,
      manifestHash: bundle.manifestHash,
      sourceHash: bundle.sourceHash,
      manifestSchemaVersion: bundle.manifestSchemaVersion,
      selectionPolicyId: bundle.selectionPolicyId,
      tokenEstimatorId: bundle.tokenEstimatorId,
      previewPolicyId: PREVIEW_POLICY_ID,
      approvalPolicyId: APPROVAL_POLICY_ID,
    };

    for (const row of rows) {
      const fingerprint: CoverageFingerprint & { decision: string } = {
        projectId: row.projectId,
        stage: row.stage,
        manifestHash: row.manifestHash,
        sourceHash: row.sourceHash,
        manifestSchemaVersion: row.manifestSchemaVersion,
        selectionPolicyId: row.selectionPolicyId,
        tokenEstimatorId: row.tokenEstimatorId,
        previewPolicyId: row.previewPolicyId,
        approvalPolicyId: row.approvalPolicyId,
        decision: row.decision,
      };
      if (isApprovalCovering(fingerprint, candidate)) {
        return row.id;
      }
    }
    return null;
  }

  private async isApprovalRequired(bundle: BundleRow): Promise<boolean> {
    const coveringApprovalId = await this.findCoveringApprovalId(bundle);
    return coveringApprovalId === null;
  }

  private async loadProject(projectId: string): Promise<ProjectRow> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, repositoryPath: true },
    });
    if (!project) {
      throw notFound404('project_not_found');
    }
    return project;
  }

  private async loadBundle(projectId: string, bundleId: string): Promise<BundleRow> {
    const row = await this.prisma.contextBundle.findFirst({
      where: { id: bundleId, projectId },
    });
    if (!row) {
      throw notFound404('context_bundle_not_found');
    }
    return {
      id: row.id,
      projectId: row.projectId,
      configurationVersionId: row.configurationVersionId,
      stage: row.stage,
      sourceHash: row.sourceHash,
      manifestSchemaVersion: row.manifestSchemaVersion,
      selectionPolicyId: row.selectionPolicyId,
      tokenEstimatorId: row.tokenEstimatorId,
      manifestHash: row.manifestHash,
      entries: row.entries as unknown as ContextBundleEntryDto[],
    };
  }

  /**
   * Open(O_NOFOLLOW)/stat/read + contentHash verification + canonical
   * extraction for every bundle entry, in bundle order, under D8 bounds.
   * Used by both preview (first pass) and approve (mandatory re-check).
   * Bytes/excerpts are discarded once the caller finishes building its
   * response; nothing here is persisted.
   */
  private async buildPreviewItems(
    repositoryRoot: string,
    bundle: BundleRow,
  ): Promise<BuiltPreviewItem[]> {
    const startedAt = Date.now();
    let totalBytesRead = 0;
    let totalCodePoints = 0;
    const items: BuiltPreviewItem[] = [];

    for (const entry of bundle.entries) {
      if (Date.now() - startedAt >= DISCLOSURE_PREVIEW_TIMEOUT_MS) {
        throw blocked422('disclosure_preview_timeout');
      }

      if (isInvalidRelativePath(entry.path)) {
        throw blocked422('context_path_escape');
      }

      const absolutePath = join(repositoryRoot, entry.path);
      const buffer = await this.readEntryBytes(
        absolutePath,
        totalBytesRead,
      );
      totalBytesRead += buffer.byteLength;

      if (Date.now() - startedAt >= DISCLOSURE_PREVIEW_TIMEOUT_MS) {
        throw blocked422('disclosure_preview_timeout');
      }

      const contentHash = hashBytes(buffer);
      if (contentHash !== entry.contentHash) {
        throw blocked422('disclosure_preview_integrity_mismatch');
      }

      let text: string;
      try {
        text = decodeCleanText(buffer);
      } catch {
        throw blocked422('disclosure_preview_integrity_mismatch');
      }

      const extracted = extractExcerpt(text, entry.lineRanges, buffer.byteLength);
      if (!extracted.ok) {
        throw blocked422('disclosure_preview_integrity_mismatch');
      }

      const excerptCodePoints = codePointCount(extracted.excerpt);
      if (excerptCodePoints > DISCLOSURE_PREVIEW_MAX_ENTRY_CODE_POINTS) {
        throw blocked422('disclosure_preview_limit_exceeded');
      }
      totalCodePoints += excerptCodePoints;
      if (totalCodePoints > DISCLOSURE_PREVIEW_MAX_TOTAL_CODE_POINTS) {
        throw blocked422('disclosure_preview_limit_exceeded');
      }

      items.push({
        path: entry.path,
        contentHash: entry.contentHash,
        lineRanges: entry.lineRanges,
        tokenEstimate: entry.tokenEstimate,
        excerpt: extracted.excerpt,
      });
    }

    return items;
  }

  private async readEntryBytes(
    absolutePath: string,
    totalBytesReadSoFar: number,
  ): Promise<Buffer> {
    let handle: Awaited<ReturnType<typeof open>> | undefined;
    try {
      handle = await open(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW);
      const stats = await handle.stat();
      if (!stats.isFile()) {
        throw blocked422('disclosure_preview_entry_unreadable');
      }

      const fileSize = stats.size;
      if (fileSize > DISCLOSURE_PREVIEW_MAX_FILE_BYTES) {
        throw blocked422('disclosure_preview_entry_unreadable');
      }
      if (totalBytesReadSoFar + fileSize > DISCLOSURE_PREVIEW_MAX_TOTAL_BYTES) {
        throw blocked422('disclosure_preview_limit_exceeded');
      }

      if (fileSize === 0) {
        return Buffer.alloc(0);
      }

      const buffer = Buffer.alloc(fileSize);
      const { bytesRead } = await handle.read(buffer, 0, fileSize, 0);
      if (bytesRead !== fileSize) {
        throw blocked422('disclosure_preview_entry_unreadable');
      }
      return buffer;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (isErrnoLike(error, UNREADABLE_ERRNO_CODES)) {
        throw blocked422('disclosure_preview_entry_unreadable');
      }
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof (error as { code: unknown }).code === 'string'
      ) {
        throw blocked422('disclosure_preview_entry_unreadable');
      }
      throw error;
    } finally {
      if (handle !== undefined) {
        await handle.close().catch(() => undefined);
      }
    }
  }
}
