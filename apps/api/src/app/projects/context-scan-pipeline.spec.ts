import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  SECRET_SCAN_MAX_FILE_BYTES,
} from '@specpilot/shared-contracts';
import * as secretScanReader from './secret-scan-reader';
import { runContextScanPipeline } from './context-scan-pipeline';
import { hashBytes } from './context-bundle-manifest';

describe('context-scan-pipeline', () => {
  async function tempRoot(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'specpilot-context-scan-'));
  }

  const resolveOk = {
    status: 'ok' as const,
    projectId: '11111111-1111-1111-1111-111111111111',
    stage: 'planning' as const,
    configurationVersionId: '22222222-2222-2222-2222-222222222222',
    sourceHash: 'a'.repeat(64),
    resolvedAt: '2026-07-28T00:00:00.000Z',
    include: ['AGENTS.md'],
    exclude: ['**/.env'],
    pathCount: 1,
    paths: ['AGENTS.md'],
  };

  it('opens each clean candidate once and reuses the same Buffer for hash input', async () => {
    const root = await tempRoot();
    const content = 'agents clean\n';
    await writeFile(join(root, 'AGENTS.md'), content, 'utf8');

    const readSpy = jest.spyOn(secretScanReader, 'readCandidateForSecretScan');

    const result = await runContextScanPipeline({
      projectId: resolveOk.projectId,
      stage: resolveOk.stage,
      resolveOk,
      repositoryRoot: root,
      includeCleanBytes: true,
    });

    expect(readSpy).toHaveBeenCalledTimes(1);
    expect(result.cleanFiles).toHaveLength(1);
    const clean = result.cleanFiles?.[0];
    expect(clean?.path).toBe('AGENTS.md');
    expect(hashBytes(clean!.bytes)).toBe(hashBytes(Buffer.from(content, 'utf8')));
    expect(clean!.bytes).toBe(
      (await readSpy.mock.results[0]?.value)?.bytes,
    );

    readSpy.mockRestore();
  });

  it('does not reread after repository mutation and hashes original in-memory bytes', async () => {
    const root = await tempRoot();
    const original = 'original bytes';
    await writeFile(join(root, 'AGENTS.md'), original, 'utf8');

    const readSpy = jest.spyOn(secretScanReader, 'readCandidateForSecretScan');

    const result = await runContextScanPipeline({
      projectId: resolveOk.projectId,
      stage: resolveOk.stage,
      resolveOk,
      repositoryRoot: root,
      includeCleanBytes: true,
    });

    await writeFile(join(root, 'AGENTS.md'), 'mutated on disk', 'utf8');

    expect(readSpy).toHaveBeenCalledTimes(1);
    expect(hashBytes(result.cleanFiles![0]!.bytes)).toBe(
      hashBytes(Buffer.from(original, 'utf8')),
    );

    readSpy.mockRestore();
  });

  it('classifies oversize as unscannable without reading bytes', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'AGENTS.md'), 'clean', 'utf8');
    const big = Buffer.alloc(SECRET_SCAN_MAX_FILE_BYTES + 1, 0x61);
    await writeFile(join(root, 'big.txt'), big);

    const mixedResolve = {
      ...resolveOk,
      pathCount: 2,
      paths: ['AGENTS.md', 'big.txt'],
    };

    const readSpy = jest.spyOn(secretScanReader, 'readCandidateForSecretScan');

    const result = await runContextScanPipeline({
      projectId: mixedResolve.projectId,
      stage: mixedResolve.stage,
      resolveOk: mixedResolve,
      repositoryRoot: root,
      includeCleanBytes: true,
    });

    expect(result.eligiblePaths).toEqual(['AGENTS.md']);
    expect(result.unscannable).toEqual([
      { path: 'big.txt', reason: 'unscannable_content' },
    ]);
    expect(result.cleanFiles).toHaveLength(1);
    expect(readSpy).toHaveBeenCalledTimes(2);

    readSpy.mockRestore();
  });

  it('omits cleanFiles when includeCleanBytes is false', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'AGENTS.md'), 'clean', 'utf8');

    const result = await runContextScanPipeline({
      projectId: resolveOk.projectId,
      stage: resolveOk.stage,
      resolveOk,
      repositoryRoot: root,
      includeCleanBytes: false,
    });

    expect(result.cleanFiles).toBeUndefined();
    expect(result.eligiblePaths).toEqual(['AGENTS.md']);
  });
});
