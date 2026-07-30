import type { ReviewRunState } from '@specpilot/shared-contracts';

const TERMINAL: ReadonlySet<ReviewRunState> = new Set([
  'completed',
  'blocked',
  'failed',
  'cancelled',
]);

const BLOCKED_FROM: ReadonlySet<ReviewRunState> = new Set([
  'requested',
  'preparing_context',
  'budget_check',
]);

const FAILED_FROM: ReadonlySet<ReviewRunState> = new Set([
  'requested',
  'preparing_context',
  'budget_check',
  'running',
  'validating_response',
]);

const SUCCESS_EDGES: ReadonlyArray<readonly [ReviewRunState, ReviewRunState]> = [
  ['requested', 'preparing_context'],
  ['preparing_context', 'budget_check'],
  ['budget_check', 'running'],
  ['running', 'validating_response'],
  ['validating_response', 'completed'],
];

export function isTerminalState(state: ReviewRunState): boolean {
  return TERMINAL.has(state);
}

export function isAllowedTransition(
  from: ReviewRunState | null,
  to: ReviewRunState,
): boolean {
  if (from === null) {
    return to === 'requested';
  }
  if (isTerminalState(from)) {
    return false;
  }
  if (to === 'blocked') {
    return BLOCKED_FROM.has(from);
  }
  if (to === 'failed') {
    return FAILED_FROM.has(from);
  }
  return SUCCESS_EDGES.some(([a, b]) => a === from && b === to);
}
