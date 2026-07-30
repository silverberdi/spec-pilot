import { isAllowedTransition, isTerminalState } from './review-runs-state';

describe('review-runs state machine', () => {
  it('allows the success sequence', () => {
    expect(isAllowedTransition(null, 'requested')).toBe(true);
    expect(isAllowedTransition('requested', 'preparing_context')).toBe(true);
    expect(isAllowedTransition('preparing_context', 'budget_check')).toBe(true);
    expect(isAllowedTransition('budget_check', 'running')).toBe(true);
    expect(isAllowedTransition('running', 'validating_response')).toBe(true);
    expect(isAllowedTransition('validating_response', 'completed')).toBe(true);
  });

  it('allows blocked only from early states', () => {
    expect(isAllowedTransition('requested', 'blocked')).toBe(true);
    expect(isAllowedTransition('preparing_context', 'blocked')).toBe(true);
    expect(isAllowedTransition('budget_check', 'blocked')).toBe(true);
    expect(isAllowedTransition('running', 'blocked')).toBe(false);
    expect(isAllowedTransition('validating_response', 'blocked')).toBe(false);
  });

  it('forbids transitions out of terminal states', () => {
    for (const state of ['completed', 'blocked', 'failed', 'cancelled'] as const) {
      expect(isTerminalState(state)).toBe(true);
      expect(isAllowedTransition(state, 'running')).toBe(false);
      expect(isAllowedTransition(state, 'failed')).toBe(false);
    }
  });
});
