import { PROVIDER_FAILED_CODES, RESPONSE_INVALID_CODES } from './review-runs.constants';
import { toReviewRunOkDto, type ReviewRunRow } from './review-runs.mapper';

describe('review-runs mapper and transmission code sets', () => {
  it('maps a completed run without excerpt fields', () => {
    const row: ReviewRunRow = {
      id: 'run-1',
      projectId: 'p1',
      stage: 'planning',
      changeId: 'chg-w03-s02-review-run-orchestration',
      state: 'completed',
      contextBundleId: 'b1',
      manifestHash: 'm1',
      disclosureApprovalId: 'a1',
      previewSessionId: 's1',
      previewIntegrityHash: 'h1',
      previewPolicyId: 'bounded-selected-text-v1',
      approvalPolicyId: 'explicit-disclosure-approval-v1',
      budgetCheckStatus: 'not_enforced',
      promptTemplateId: 'review-run-orchestration-v1',
      modelAlias: 'deepseek-flash',
      resolvedModelId: 'deepseek-v4-flash',
      schemaId: 'review-run-orchestration-v1',
      verdict: 'apply_ready',
      rationale: 'ok',
      attemptCount: 1,
      latencyMs: 10,
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      blockedCode: null,
      failedCode: null,
      createdAt: new Date('2026-07-29T00:00:00.000Z'),
      updatedAt: new Date('2026-07-29T00:00:01.000Z'),
      completedAt: new Date('2026-07-29T00:00:01.000Z'),
      blockedAt: null,
      failedAt: null,
      transitions: [
        {
          id: 't1',
          fromState: null,
          toState: 'requested',
          code: null,
          createdAt: new Date('2026-07-29T00:00:00.000Z'),
        },
      ],
      transmission: {
        id: 'tr1',
        outcome: 'completed',
        promptTemplateId: 'review-run-orchestration-v1',
        schemaId: 'review-run-orchestration-v1',
        requestedModelAlias: 'deepseek-flash',
        resolvedModelId: 'deepseek-v4-flash',
        attemptCount: 1,
        latencyMs: 10,
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
        providerRequestId: null,
        terminalCode: null,
        createdAt: new Date('2026-07-29T00:00:01.000Z'),
      },
    };

    const dto = toReviewRunOkDto(row);
    expect(dto.status).toBe('ok');
    expect(dto.state).toBe('completed');
    expect(dto.hasTransmission).toBe(true);
    expect(dto.transmission?.outcome).toBe('completed');
    expect(JSON.stringify(dto)).not.toMatch(/excerpt|promptText|reasoning/i);
  });

  it('classifies provider vs response_invalid codes', () => {
    expect(PROVIDER_FAILED_CODES.has('deepseek_timeout')).toBe(true);
    expect(RESPONSE_INVALID_CODES.has('deepseek_schema_invalid')).toBe(true);
    expect(RESPONSE_INVALID_CODES.has('review_verdict_invalid')).toBe(true);
  });
});
