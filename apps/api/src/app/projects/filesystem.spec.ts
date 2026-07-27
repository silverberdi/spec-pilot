import { mkdtemp, mkdir, symlink, writeFile, chmod, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeFilesystemAdapter } from './node-filesystem.adapter';
import { deriveSlugFromBasename } from './slug';

describe('deriveSlugFromBasename', () => {
  it('derives kebab-case from typical basenames', () => {
    expect(deriveSlugFromBasename('my-repo')).toBe('my-repo');
    expect(deriveSlugFromBasename('My_Repo')).toBe('my-repo');
  });

  it('returns null for invalid derived slugs', () => {
    expect(deriveSlugFromBasename('---')).toBeNull();
    expect(deriveSlugFromBasename('@@@')).toBeNull();
  });
});

describe('NodeFilesystemAdapter preflight', () => {
  const adapter = new NodeFilesystemAdapter();

  async function makeEligibleRepo(name: string): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'sp-reg-'));
    const repo = join(root, name);
    await mkdir(join(repo, '.specpilot'), { recursive: true });
    await writeFile(join(repo, '.specpilot', 'project.yaml'), 'schemaVersion: 1\n');
    return repo;
  }

  it('rejects empty and relative paths', async () => {
    expect((await adapter.preflightRepository('')).ok).toBe(false);
    expect((await adapter.preflightRepository('  ')).ok).toBe(false);
    const relative = await adapter.preflightRepository('relative/path');
    expect(relative).toEqual({ ok: false, code: 'relative_repository_path' });
  });

  it('rejects missing path', async () => {
    const result = await adapter.preflightRepository(
      join(tmpdir(), 'sp-does-not-exist-' + Date.now()),
    );
    expect(result).toEqual({ ok: false, code: 'repository_not_found' });
  });

  it('rejects non-directory paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'sp-file-'));
    const filePath = join(root, 'not-a-dir');
    await writeFile(filePath, 'x');
    const result = await adapter.preflightRepository(filePath);
    expect(result).toEqual({ ok: false, code: 'repository_not_directory' });
  });

  it('rejects missing project.yaml', async () => {
    const root = await mkdtemp(join(tmpdir(), 'sp-noyaml-'));
    const repo = join(root, 'repo');
    await mkdir(repo);
    const result = await adapter.preflightRepository(repo);
    expect(result).toEqual({ ok: false, code: 'project_yaml_missing' });
  });

  it('rejects project.yaml that is not a regular file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'sp-yamldir-'));
    const repo = join(root, 'repo');
    await mkdir(join(repo, '.specpilot', 'project.yaml'), { recursive: true });
    const result = await adapter.preflightRepository(repo);
    expect(result).toEqual({
      ok: false,
      code: 'project_yaml_not_regular_file',
    });
  });

  it('accepts eligible repo and returns realpath canonical identity', async () => {
    const repo = await makeEligibleRepo('demo-repo');
    const expectedCanonical = await realpath(repo);
    const withSlash = repo + '/';
    const result = await adapter.preflightRepository(withSlash);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canonicalPath).toBe(expectedCanonical);
      expect(result.basename).toBe('demo-repo');
    }
  });

  it('resolves symlink path to the same canonical directory', async () => {
    const repo = await makeEligibleRepo('canonical-repo');
    const linkParent = await mkdtemp(join(tmpdir(), 'sp-link-'));
    const linkPath = join(linkParent, 'alias-repo');
    await symlink(repo, linkPath);
    const viaLink = await adapter.preflightRepository(linkPath);
    const viaReal = await adapter.preflightRepository(repo);
    expect(viaLink.ok && viaReal.ok).toBe(true);
    if (viaLink.ok && viaReal.ok) {
      expect(viaLink.canonicalPath).toBe(viaReal.canonicalPath);
    }
  });

  it('rejects unreadable directory when permissions deny read', async () => {
    if (process.platform === 'win32') {
      return;
    }
    const repo = await makeEligibleRepo('locked-repo');
    await chmod(repo, 0o000);
    try {
      const result = await adapter.preflightRepository(repo);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(['repository_not_readable', 'repository_not_found']).toContain(
          result.code,
        );
      }
    } finally {
      await chmod(repo, 0o755);
    }
  });
});
