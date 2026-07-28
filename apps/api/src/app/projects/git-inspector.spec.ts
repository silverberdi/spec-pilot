import { GitInspector, type ExecFileFn } from './git-inspector';

describe('GitInspector', () => {
  function mockExec(
    responses: Array<{
      stdout?: string;
      error?: Error & { killed?: boolean; code?: string | number };
    }>,
  ): ExecFileFn {
    let i = 0;
    return async () => {
      const next = responses[i++] ?? { stdout: '' };
      if (next.error) {
        throw next.error;
      }
      return { stdout: next.stdout ?? '', stderr: '' };
    };
  }

  it('maps non-work-tree to not_a_git_repository', async () => {
    const inspector = new GitInspector(
      mockExec([{ stdout: 'false\n' }]),
    );
    const result = await inspector.inspect('/tmp/repo');
    expect(result).toEqual({
      status: 'blocked',
      code: 'not_a_git_repository',
      message: expect.any(String),
    });
  });

  it('maps required-command timeout to git_inspection_timeout', async () => {
    const timeout = Object.assign(new Error('timeout'), {
      killed: true,
      code: 'ETIMEDOUT',
    });
    const inspector = new GitInspector(mockExec([{ error: timeout }]));
    const result = await inspector.inspect('/tmp/repo');
    expect(result.status).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.code).toBe('git_inspection_timeout');
    }
  });

  it('returns ok with dirty porcelain and validated headSha', async () => {
    const sha = 'abcdef0123456789abcdef0123456789abcdef01';
    const inspector = new GitInspector(
      mockExec([
        { stdout: 'true\n' },
        { stdout: 'main\n' },
        { stdout: `${sha}\n` },
        { stdout: ' M README.md\n' },
        { error: Object.assign(new Error('no upstream'), { code: 128 }) },
      ]),
    );
    const result = await inspector.inspect('/tmp/repo');
    expect(result).toEqual({
      status: 'ok',
      isRepo: true,
      headSha: sha,
      branch: 'main',
      dirty: true,
      upstream: null,
    });
  });

  it('treats abbrev-ref HEAD as detached (branch null)', async () => {
    const sha = 'abcdef0123456789abcdef0123456789abcdef01';
    const inspector = new GitInspector(
      mockExec([
        { stdout: 'true\n' },
        { stdout: 'HEAD\n' },
        { stdout: `${sha}\n` },
        { stdout: '' },
        { error: Object.assign(new Error('no upstream'), { code: 128 }) },
      ]),
    );
    const result = await inspector.inspect('/tmp/repo');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.branch).toBeNull();
      expect(result.dirty).toBe(false);
    }
  });

  it('rejects invalid head sha', async () => {
    const inspector = new GitInspector(
      mockExec([
        { stdout: 'true\n' },
        { stdout: 'main\n' },
        { stdout: 'not-a-sha\n' },
      ]),
    );
    const result = await inspector.inspect('/tmp/repo');
    expect(result.status).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.code).toBe('git_inspect_failed');
    }
  });
});
