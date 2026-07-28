import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  buildEffectiveExcludes,
  validateContextPatterns,
  walkContextSources,
} from './context-source-walker';

describe('context-source-walker', () => {
  async function makeTree(
    files: Record<string, string>,
  ): Promise<string> {
    const root = mkdtempSync(join(tmpdir(), 'ctx-src-'));
    for (const [rel, content] of Object.entries(files)) {
      const absolute = join(root, rel);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, content, 'utf8');
    }
    return root;
  }

  it('includes matching files and sorts deterministically', async () => {
    const root = await makeTree({
      'docs/a.md': 'a',
      'docs/b.md': 'b',
      'AGENTS.md': 'agents',
      'skip.txt': 'x',
    });
    const result = await walkContextSources({
      repositoryRoot: root,
      include: ['docs/**', 'AGENTS.md'],
      exclude: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paths).toEqual(['AGENTS.md', 'docs/a.md', 'docs/b.md']);
    }
  });

  it('lets exclude win over include', async () => {
    const root = await makeTree({
      'docs/keep.md': 'k',
      'docs/secret.env': 's',
    });
    const result = await walkContextSources({
      repositoryRoot: root,
      include: ['docs/**'],
      exclude: ['**/*.env'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paths).toEqual(['docs/keep.md']);
    }
  });

  it('matches dotfiles when included', async () => {
    const root = await makeTree({
      '.hidden.md': 'h',
      'visible.md': 'v',
    });
    const result = await walkContextSources({
      repositoryRoot: root,
      include: ['**/*.md'],
      exclude: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paths).toEqual(['.hidden.md', 'visible.md']);
    }
  });

  it('is case-sensitive', async () => {
    const root = await makeTree({
      'Docs/a.md': 'a',
    });
    const result = await walkContextSources({
      repositoryRoot: root,
      include: ['docs/**'],
      exclude: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paths).toEqual([]);
    }
  });

  it('does not treat leading ! as negation', async () => {
    const root = await makeTree({
      '!special.md': 's',
      'normal.md': 'n',
    });
    const result = await walkContextSources({
      repositoryRoot: root,
      include: ['!special.md', 'normal.md'],
      exclude: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paths).toEqual(['!special.md', 'normal.md']);
    }
  });

  it('rejects invalid patterns', () => {
    expect(validateContextPatterns([''], []).ok).toBe(false);
    expect(validateContextPatterns(['ok'], ['/abs']).ok).toBe(false);
    expect(validateContextPatterns(['ok'], ['a\\b']).ok).toBe(false);
    expect(validateContextPatterns(['ok'], ['a/../b']).ok).toBe(false);
    expect(validateContextPatterns(['ok\0'], []).ok).toBe(false);
  });

  it('unions mandatory excludes defensively', () => {
    expect(buildEffectiveExcludes(['custom/**'])).toEqual([
      'custom/**',
      '**/.env',
      '**/.env.*',
      '**/*.pem',
      '**/*.key',
      '**/secrets/**',
    ]);
    expect(buildEffectiveExcludes(['**/.env', '**/*.pem'])).toEqual([
      '**/.env',
      '**/*.pem',
      '**/.env.*',
      '**/*.key',
      '**/secrets/**',
    ]);
  });

  it('omits .git but still counts it toward visited entries', async () => {
    const root = await makeTree({
      'AGENTS.md': 'a',
    });
    await mkdir(join(root, '.git'), { recursive: true });
    const result = await walkContextSources({
      repositoryRoot: root,
      include: ['**/*'],
      exclude: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paths).toEqual(['AGENTS.md']);
      expect(result.visitedEntries).toBeGreaterThanOrEqual(2);
    }
  });

  it('omits in-tree symlinks without following', async () => {
    const root = await makeTree({
      'docs/real.md': 'r',
    });
    await symlink('docs/real.md', join(root, 'alias.md'));
    const result = await walkContextSources({
      repositoryRoot: root,
      include: ['**/*'],
      exclude: [],
    });
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        paths: ['docs/real.md'],
      }),
    );
  });

  it('blocks out-of-tree symlinks without partial results', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'ctx-out-'));
    await writeFile(join(outside, 'leak.md'), 'leak', 'utf8');
    const root = await makeTree({ 'AGENTS.md': 'a' });
    await symlink(join(outside, 'leak.md'), join(root, 'escape.md'));
    const result = await walkContextSources({
      repositoryRoot: root,
      include: ['**/*'],
      exclude: [],
    });
    expect(result).toEqual({ ok: false, code: 'context_path_escape' });
  });

  it('walks nested regular directories without Git commands', async () => {
    const root = await makeTree({
      'vendor/nested/README.md': 'n',
    });
    await mkdir(join(root, 'vendor/nested/.git'), { recursive: true });
    const result = await walkContextSources({
      repositoryRoot: root,
      include: ['vendor/**'],
      exclude: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paths).toEqual(['vendor/nested/README.md']);
    }
  });

  it('enforces match limit without truncation', async () => {
    const root = await makeTree({
      'a.md': 'a',
      'b.md': 'b',
      'c.md': 'c',
    });
    const result = await walkContextSources({
      repositoryRoot: root,
      include: ['**/*'],
      exclude: [],
      maxMatchedFiles: 2,
    });
    expect(result).toEqual({
      ok: false,
      code: 'context_resolution_limit_exceeded',
    });
  });

  it('enforces UTF-8 path byte limit without truncation', async () => {
    const root = await makeTree({
      'abcdefghij.md': 'x',
    });
    const result = await walkContextSources({
      repositoryRoot: root,
      include: ['**/*'],
      exclude: [],
      maxPathBytes: 5,
    });
    expect(result).toEqual({
      ok: false,
      code: 'context_resolution_limit_exceeded',
    });
  });

  it('enforces timeout without truncation', async () => {
    const root = await makeTree({
      'a.md': 'a',
    });
    let t = 0;
    const result = await walkContextSources({
      repositoryRoot: root,
      include: ['**/*'],
      exclude: [],
      timeoutMs: 1,
      now: () => {
        t += 10;
        return t;
      },
    });
    expect(result).toEqual({ ok: false, code: 'context_resolution_timeout' });
  });

  it('prunes directories that cannot match any include pattern', async () => {
    const root = await makeTree({
      'AGENTS.md': 'a',
      'node_modules/pkg/index.js': 'slow',
      'docs/a.md': 'd',
    });
    const result = await walkContextSources({
      repositoryRoot: root,
      include: ['AGENTS.md', 'docs/**'],
      exclude: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paths).toEqual(['AGENTS.md', 'docs/a.md']);
      expect(result.visitedEntries).toBeLessThan(10);
    }
  });
});
