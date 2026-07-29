import type {
  DeepseekProbeStage,
  DeepseekResolvedModelId,
} from '@specpilot/shared-contracts';

const ALIAS_TO_RESOLVED: Record<string, DeepseekResolvedModelId> = {
  'deepseek-flash': 'deepseek-v4-flash',
  'deepseek-v4-flash': 'deepseek-v4-flash',
  'deepseek-pro': 'deepseek-v4-pro',
  'deepseek-v4-pro': 'deepseek-v4-pro',
};

export function resolveDeepseekModelAlias(
  alias: string,
): DeepseekResolvedModelId | null {
  if (alias === 'deepseek-chat' || alias === 'deepseek-reasoner') {
    return null;
  }
  return ALIAS_TO_RESOLVED[alias] ?? null;
}

export function modelFromProbeStage(
  review: Record<string, unknown>,
  stage: DeepseekProbeStage,
): { alias: string; resolvedModelId: DeepseekResolvedModelId } | null {
  if (review['provider'] !== 'deepseek') {
    return null;
  }
  const models = review['models'];
  if (models === null || typeof models !== 'object' || Array.isArray(models)) {
    return null;
  }
  const alias = (models as Record<string, unknown>)[stage];
  if (typeof alias !== 'string' || alias.length === 0) {
    return null;
  }
  const resolvedModelId = resolveDeepseekModelAlias(alias);
  if (!resolvedModelId) {
    return null;
  }
  return { alias, resolvedModelId };
}

export function isResolvedModelCompatible(
  responseModel: string,
  resolvedModelId: DeepseekResolvedModelId,
): boolean {
  if (responseModel === resolvedModelId) {
    return true;
  }
  // Accept exact alias forms that map to the same resolved id.
  const mapped = resolveDeepseekModelAlias(responseModel);
  return mapped === resolvedModelId;
}
