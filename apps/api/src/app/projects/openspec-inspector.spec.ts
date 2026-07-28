import { mkdir, symlink, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import {
  OpenSpecInspector,
  isPathInsideRoot,
  type ExecFileFn,
} from './openspec-inspector';
import { OPENSPEC_MAX_ACTIVE_CHANGES } from '@specpilot/shared-contracts';

describe('OpenSpecInspector', () => {
  async function makeRepo(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'sp-os-'));
  }

  it('exports path containment helper', () => {
    expect(isPathInsideRoot('/a/b', '/a/b')).toBe(true);
    expect(isPathInsideRoot('/a/b', '/a/b/c')).toBe(true);
    expect(isPathInsideRoot('/a/b', '/a/other')).toBe(false);
  });

  it('blocks missing openspec root', async () => {
    const repo = await makeRepo();
    const result = await new OpenSpecInspector().inspect(repo);
    expect(result).toMatchObject({
      status: 'blocked',
      code: 'openspec_root_missing',
    });
  });

  it('returns ok for empty active changes', async () => {
    const repo = await makeRepo();
    await mkdir(join(repo, 'openspec', 'changes'), { recursive: true });
    const result = await new OpenSpecInspector().inspect(repo);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.activeChanges).toEqual([]);
      expect(result.archivedChangeCount).toBe(0);
      expect(result.cliAvailable).toBe(false);
    }
  });

  it('sets artifact booleans only for exact presence rules', async () => {
    const repo = await makeRepo();
    const change = join(repo, 'openspec', 'changes', 'chg-demo');
    await mkdir(join(change, 'specs', 'cap-a'), { recursive: true });
    await mkdir(join(change, 'nested'), { recursive: true });
    await writeFile(join(change, 'proposal.md'), 'x');
    await writeFile(join(change, 'nested', 'design.md'), 'x');
    await writeFile(join(change, 'specs', 'notes.md'), 'not a capability');
    await writeFile(join(change, 'specs', 'cap-a', 'spec.md'), 'req');

    const result = await new OpenSpecInspector().inspect(repo);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.activeChanges).toEqual([
        {
          name: 'chg-demo',
          hasProposal: true,
          hasDesign: false,
          hasTasks: false,
          hasSpecs: true,
        },
      ]);
    }
  });

  it('blocks symlink escape under openspec', async () => {
    const repo = await makeRepo();
    const outside = await makeRepo();
    await mkdir(join(repo, 'openspec'), { recursive: true });
    await symlink(outside, join(repo, 'openspec', 'changes'));
    const result = await new OpenSpecInspector().inspect(repo);
    // changes is a symlink to outside → resolveContained on changes path escapes
    // or listing skips; if openspec exists but changes is escape when resolved:
    expect(
      result.status === 'blocked' && result.code === 'openspec_path_escape',
    ).toBe(true);
  });

  it('blocks when active changes exceed limit', async () => {
    const repo = await makeRepo();
    const changes = join(repo, 'openspec', 'changes');
    await mkdir(changes, { recursive: true });
    for (let i = 0; i < OPENSPEC_MAX_ACTIVE_CHANGES + 1; i += 1) {
      await mkdir(join(changes, `chg-${String(i).padStart(4, '0')}`));
    }
    const result = await new OpenSpecInspector().inspect(repo);
    expect(result).toMatchObject({
      status: 'blocked',
      code: 'openspec_inspection_limit_exceeded',
    });
  });

  it('does not block when local CLI is absent', async () => {
    const repo = await makeRepo();
    await mkdir(join(repo, 'openspec', 'changes'), { recursive: true });
    const result = await new OpenSpecInspector().inspect(repo);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.cliAvailable).toBe(false);
    }
  });

  it('sets cliAvailable false when local CLI fails without blocking', async () => {
    const repo = await makeRepo();
    await mkdir(join(repo, 'openspec', 'changes'), { recursive: true });
    const binDir = join(repo, 'node_modules', '.bin');
    await mkdir(binDir, { recursive: true });
    const cli = join(binDir, 'openspec');
    await writeFile(cli, '#!/bin/sh\nexit 1\n');
    await chmod(cli, 0o755);

    const failingExec: ExecFileFn = async () => {
      throw new Error('cli failed');
    };
    const result = await new OpenSpecInspector(failingExec).inspect(repo);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.cliAvailable).toBe(false);
    }
  });
});
