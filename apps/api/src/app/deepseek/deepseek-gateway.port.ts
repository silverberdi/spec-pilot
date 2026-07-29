import type {
  DeepseekGatewayProbeParsedDto,
  DeepseekResolvedModelId,
  ProjectErrorCode,
} from '@specpilot/shared-contracts';

export type DeepseekStructuredRequest = {
  resolvedModelId: DeepseekResolvedModelId;
  apiKey: string;
};

export type DeepseekStructuredSuccess = {
  ok: true;
  parsed: DeepseekGatewayProbeParsedDto;
  attemptCount: number;
  providerHttpStatus: 200;
  providerRequestId?: string;
  latencyMs: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export type DeepseekStructuredFailure = {
  ok: false;
  code: ProjectErrorCode;
  attemptCount: number;
  latencyMs: number;
};

export type DeepseekStructuredResult =
  | DeepseekStructuredSuccess
  | DeepseekStructuredFailure;

export interface DeepseekGatewayPort {
  completeStructured(
    input: DeepseekStructuredRequest,
  ): Promise<DeepseekStructuredResult>;
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
