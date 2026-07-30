import type {
  DeepseekGatewayProbeParsedDto,
  DeepseekResolvedModelId,
  ProjectErrorCode,
  ReviewStage,
  ReviewRunOrchestrationParsedDto,
} from '@specpilot/shared-contracts';

export type DeepseekGatewayProfile = 'probe' | 'review_run_orchestration';

export type DeepseekOrchestrationContextItem = {
  path: string;
  contentHash: string;
  lineRanges: ReadonlyArray<{ startLine: number; endLine: number }>;
  excerpt: string;
};

export type DeepseekStructuredRequest = {
  resolvedModelId: DeepseekResolvedModelId;
  requestedModelAlias: string;
  apiKey: string;
  profile: DeepseekGatewayProfile;
  orchestration?: {
    stage: ReviewStage;
    changeId?: string;
    promptTemplateId: 'review-run-orchestration-v1';
    schemaId: 'review-run-orchestration-v1';
    contextItems: ReadonlyArray<DeepseekOrchestrationContextItem>;
  };
};

export type DeepseekStructuredExecutionResult =
  | {
      status: 'ok';
      invocationBegan: true;
      requestedModelAlias: string;
      resolvedModelId: DeepseekResolvedModelId;
      attemptCount: number;
      latencyMs: number;
      providerHttpStatus: number;
      providerRequestId?: string;
      usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      };
      parsed: DeepseekGatewayProbeParsedDto | ReviewRunOrchestrationParsedDto | unknown;
    }
  | {
      status: 'failed';
      invocationBegan: boolean;
      code: ProjectErrorCode;
      requestedModelAlias?: string;
      resolvedModelId?: DeepseekResolvedModelId;
      attemptCount: number;
      latencyMs: number;
      providerHttpStatus?: number;
      providerRequestId?: string;
      usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      };
    };

/** @deprecated Prefer DeepseekStructuredExecutionResult; kept for transitional test imports. */
export type DeepseekStructuredResult = DeepseekStructuredExecutionResult;

export interface DeepseekGatewayPort {
  completeStructured(
    input: DeepseekStructuredRequest,
  ): Promise<DeepseekStructuredExecutionResult>;
}

export type DeepseekClock = {
  now(): number;
};

export type DeepseekSleeper = {
  sleep(ms: number): Promise<void>;
};

export const defaultClock: DeepseekClock = {
  now: () => Date.now(),
};

export const defaultSleeper: DeepseekSleeper = {
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
