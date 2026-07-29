import { mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  SECRET_SCAN_MAX_FILE_BYTES,
  SECRET_SCAN_MAX_TOTAL_BYTES,
} from '@specpilot/shared-contracts';
import { readCandidateForSecretScan } from './secret-scan-reader';

describe('secret-scan-reader', () => {
  async function tempRoot(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'specpilot-secret-scan-'));
  }

  it('rejects unsafe relative paths before open', async () => {
    const root = await tempRoot();
    for (const relativePath of [
      '/abs',
      './leading',
      'a\\b',
      'a/../b',
      'a\0b',
    ]) {
      const result = await readCandidateForSecretScan({
        repositoryRoot: root,
        relativePath,
        totalBytesRead: 0,
        scanStartedAt: Date.now(),
      });
      expect(result).toEqual({ ok: false, code: 'context_path_escape' });
    }
  });

  it('reads empty file as clean text', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'empty.txt'), '');
    const result = await readCandidateForSecretScan({
      repositoryRoot: root,
      relativePath: 'empty.txt',
      totalBytesRead: 0,
      scanStartedAt: Date.now(),
    });
    expect(result).toEqual({
      ok: true,
      kind: 'text',
      text: '',
      bytes: Buffer.alloc(0),
      bytesRead: 0,
    });
  });

  it('marks oversize as unscannable without counting bytes read', async () => {
    const root = await tempRoot();
    const big = Buffer.alloc(SECRET_SCAN_MAX_FILE_BYTES + 1, 0x61);
    await writeFile(join(root, 'big.txt'), big);
    const result = await readCandidateForSecretScan({
      repositoryRoot: root,
      relativePath: 'big.txt',
      totalBytesRead: 0,
      scanStartedAt: Date.now(),
    });
    expect(result).toEqual({
      ok: true,
      kind: 'unscannable',
      bytesRead: 0,
    });
  });

  it('marks NUL bytes as unscannable', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'bin.dat'), Buffer.from([0x61, 0x00, 0x62]));
    const result = await readCandidateForSecretScan({
      repositoryRoot: root,
      relativePath: 'bin.dat',
      totalBytesRead: 0,
      scanStartedAt: Date.now(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.kind).toBe('unscannable');
      expect(result.bytesRead).toBe(3);
    }
  });

  it('marks invalid UTF-8 as unscannable', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'bad.txt'), Buffer.from([0xff, 0xfe, 0xfd]));
    const result = await readCandidateForSecretScan({
      repositoryRoot: root,
      relativePath: 'bad.txt',
      totalBytesRead: 0,
      scanStartedAt: Date.now(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.kind).toBe('unscannable');
    }
  });

  it('blocks when total byte budget would be exceeded before read', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'a.txt'), 'hello');
    const result = await readCandidateForSecretScan({
      repositoryRoot: root,
      relativePath: 'a.txt',
      totalBytesRead: SECRET_SCAN_MAX_TOTAL_BYTES,
      scanStartedAt: Date.now(),
    });
    expect(result).toEqual({
      ok: false,
      code: 'secret_scan_limit_exceeded',
    });
  });

  it('returns unreadable for symlink with O_NOFOLLOW', async () => {
    const root = await tempRoot();
    const target = join(root, 'target.txt');
    await writeFile(target, 'hello');
    await symlink(target, join(root, 'link.txt'));
    const result = await readCandidateForSecretScan({
      repositoryRoot: root,
      relativePath: 'link.txt',
      totalBytesRead: 0,
      scanStartedAt: Date.now(),
    });
    expect(result).toEqual({
      ok: false,
      code: 'secret_scan_entry_unreadable',
    });
  });

  it('returns timeout when deadline already passed', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'a.txt'), 'hello');
    const result = await readCandidateForSecretScan({
      repositoryRoot: root,
      relativePath: 'a.txt',
      totalBytesRead: 0,
      scanStartedAt: Date.now() - 60000,
    });
    expect(result).toEqual({ ok: false, code: 'secret_scan_timeout' });
  });

  it('returns unreadable for missing file', async () => {
    const root = await tempRoot();
    const result = await readCandidateForSecretScan({
      repositoryRoot: root,
      relativePath: 'missing.txt',
      totalBytesRead: 0,
      scanStartedAt: Date.now(),
    });
    expect(result).toEqual({
      ok: false,
      code: 'secret_scan_entry_unreadable',
    });
  });
});
