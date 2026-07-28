/** Minimal valid schemaVersion:1 portable contract for fixtures/tests. */
export function validProjectYaml(overrides?: {
  projectId?: string;
  projectName?: string;
  exclude?: string[];
}): string {
  const projectId = overrides?.projectId ?? 'demo-repo';
  const projectName = overrides?.projectName ?? 'Demo';
  const exclude = overrides?.exclude ?? [];
  return [
    'schemaVersion: 1',
    'project:',
    `  id: ${projectId}`,
    `  name: ${projectName}`,
    'repository:',
    '  mainBranch: main',
    'openspec:',
    '  path: openspec',
    'delivery:',
    '  methodology: wave-slice',
    '  wave:',
    '    activeStatePath: docs/context/current-state.md',
    '  mapping:',
    '    changeIdPattern: "chg-{slice-id}"',
    'context:',
    '  include:',
    '    - AGENTS.md',
    '  exclude:',
    ...exclude.map((p) => `    - ${JSON.stringify(p)}`),
    'review:',
    '  provider: deepseek',
    '  models:',
    '    discovery: deepseek-flash',
    '    planning: deepseek-pro',
    '    applied: deepseek-pro',
    '    verify: deepseek-pro',
    '  monthlyBudgetUsd: 10',
    'executor:',
    '  tool: cursor',
    'validationAssistants:',
    '  clineDeepSeek:',
    '    enabled: false',
    '    mode: read-only',
    '',
  ].join('\n');
}
