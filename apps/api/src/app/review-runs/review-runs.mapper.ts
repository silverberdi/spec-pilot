import type {
  ReviewRunListItemDto,
  ReviewRunOkDto,
  ReviewRunState,
  ReviewRunTransitionDto,
  ReviewRunTransmissionOutcome,
  ReviewRunTransmissionSafeDto,
  ReviewStage,
} from '@specpilot/shared-contracts';
import { isReviewRunState, isReviewStage } from '@specpilot/shared-contracts';

type TransitionRow = {
  id: string;
  fromState: string | null;
  toState: string;
  code: string | null;
  createdAt: Date;
};

type TransmissionRow = {
  id: string;
  outcome: string;
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
  createdAt: Date;
};

export type ReviewRunRow = {
  id: string;
  projectId: string;
  stage: string;
  changeId: string | null;
  state: string;
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
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  blockedAt: Date | null;
  failedAt: Date | null;
  transitions?: TransitionRow[];
  transmission?: TransmissionRow | null;
  _count?: { transitions: number };
};

function toIso(value: Date | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString();
}

function mapTransition(row: TransitionRow): ReviewRunTransitionDto {
  return {
    id: row.id,
    fromState: row.fromState as ReviewRunState | null,
    toState: row.toState as ReviewRunState,
    code: row.code,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapTransmission(
  row: TransmissionRow,
): ReviewRunTransmissionSafeDto {
  return {
    id: row.id,
    outcome: row.outcome as ReviewRunTransmissionOutcome,
    promptTemplateId: row.promptTemplateId,
    schemaId: row.schemaId,
    requestedModelAlias: row.requestedModelAlias,
    resolvedModelId: row.resolvedModelId,
    attemptCount: row.attemptCount,
    latencyMs: row.latencyMs,
    promptTokens: row.promptTokens,
    completionTokens: row.completionTokens,
    totalTokens: row.totalTokens,
    providerRequestId: row.providerRequestId,
    terminalCode: row.terminalCode,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toReviewRunOkDto(row: ReviewRunRow): ReviewRunOkDto {
  if (!isReviewStage(row.stage) || !isReviewRunState(row.state)) {
    throw new Error('invalid_review_run_row');
  }
  const transitions = (row.transitions ?? [])
    .slice()
    .sort((a, b) => {
      const t = a.createdAt.getTime() - b.createdAt.getTime();
      return t !== 0 ? t : a.id.localeCompare(b.id);
    })
    .map(mapTransition);

  const dto: ReviewRunOkDto = {
    status: 'ok',
    id: row.id,
    projectId: row.projectId,
    stage: row.stage,
    changeId: row.changeId,
    state: row.state,
    contextBundleId: row.contextBundleId,
    manifestHash: row.manifestHash,
    disclosureApprovalId: row.disclosureApprovalId,
    previewSessionId: row.previewSessionId,
    previewIntegrityHash: row.previewIntegrityHash,
    previewPolicyId: row.previewPolicyId,
    approvalPolicyId: row.approvalPolicyId,
    budgetCheckStatus: row.budgetCheckStatus,
    promptTemplateId: row.promptTemplateId,
    modelAlias: row.modelAlias,
    resolvedModelId: row.resolvedModelId,
    schemaId: row.schemaId,
    verdict: row.verdict,
    rationale: row.rationale,
    attemptCount: row.attemptCount,
    latencyMs: row.latencyMs,
    promptTokens: row.promptTokens,
    completionTokens: row.completionTokens,
    totalTokens: row.totalTokens,
    blockedCode: row.blockedCode,
    failedCode: row.failedCode,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: toIso(row.completedAt),
    blockedAt: toIso(row.blockedAt),
    failedAt: toIso(row.failedAt),
    transitions,
  };

  if (row.transmission) {
    dto.transmission = mapTransmission(row.transmission);
    dto.hasTransmission = true;
    dto.transmissionOutcome = row.transmission
      .outcome as ReviewRunTransmissionOutcome;
  } else {
    dto.transmission = null;
    dto.hasTransmission = false;
    dto.transmissionOutcome = null;
  }
  dto.transitionCount = transitions.length;
  return dto;
}

export function toReviewRunListItemDto(row: ReviewRunRow): ReviewRunListItemDto {
  const full = toReviewRunOkDto(row);
  const { transitions: _t, transmission: _tr, ...rest } = full;
  return {
    ...rest,
    transitionCount: row._count?.transitions ?? full.transitionCount ?? 0,
    hasTransmission: Boolean(row.transmission),
    transmissionOutcome: row.transmission
      ? (row.transmission.outcome as ReviewRunTransmissionOutcome)
      : null,
  };
}

export type ReviewStageAlias = ReviewStage;
