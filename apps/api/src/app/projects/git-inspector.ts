import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  GitDiscoveryBlockedCode,
  GitDiscoveryDto,
} from '@specpilot/shared-contracts';
import {
  GIT_EXEC_MAX_BUFFER,
  GIT_EXEC_TIMEOUT_MS,
} from '@specpilot/shared-contracts';

const execFile = promisify(execFileCb);

export type ExecFileFn = (
  file: string,
  args: readonly string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    timeout: number;
    maxBuffer: number;
  },
) => Promise<{ stdout: string; stderr: string }>;

const GIT_ENV: NodeJS.ProcessEnv = {
  GIT_TERMINAL_PROMPT: '0',
  GIT_OPTIONAL_LOCKS: '0',
  LC_ALL: 'C',
  PATH: process.env['PATH'] ?? '',
};

function isTimeoutError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const record = error as { killed?: boolean; code?: string; signal?: string };
  return (
    record.killed === true ||
    record.code === 'ETIMEDOUT' ||
    record.signal === 'SIGTERM'
  );
}

function blocked(
  code: GitDiscoveryBlockedCode,
  message: string,
): GitDiscoveryDto {
  return { status: 'blocked', code, message };
}

export class GitInspector {
  constructor(private readonly exec: ExecFileFn = execFile) {}

  async inspect(repositoryPath: string): Promise<GitDiscoveryDto> {
    try {
      const inside = await this.runGit(repositoryPath, [
        'rev-parse',
        '--is-inside-work-tree',
      ]);
      if (inside.status === 'blocked') {
        return inside.result;
      }
      if (inside.stdout.trim() !== 'true') {
        return blocked(
          'not_a_git_repository',
          'La ruta no es un repositorio Git de trabajo.',
        );
      }

      const abbrev = await this.runGit(repositoryPath, [
        'rev-parse',
        '--abbrev-ref',
        'HEAD',
      ]);
      if (abbrev.status === 'blocked') {
        return abbrev.result;
      }
      const abbrevName = abbrev.stdout.trim();
      const branch =
        abbrevName.length === 0 || abbrevName === 'HEAD' ? null : abbrevName;
      if (branch !== null && branch.length === 0) {
        return blocked(
          'git_inspect_failed',
          'No se pudo determinar la rama Git.',
        );
      }

      const head = await this.runGit(repositoryPath, ['rev-parse', 'HEAD']);
      let headSha: string | null;
      if (head.status === 'blocked') {
        if (head.result.status === 'blocked' && head.result.code === 'git_inspection_timeout') {
          return head.result;
        }
        // Failed rev-parse HEAD → unborn only when still a valid work tree.
        headSha = null;
      } else {
        const sha = head.stdout.trim().toLowerCase();
        if (!/^[a-f0-9]{40}$/.test(sha)) {
          return blocked(
            'git_inspect_failed',
            'El SHA de HEAD no es un hash Git válido.',
          );
        }
        headSha = sha;
      }

      const status = await this.runGit(repositoryPath, [
        'status',
        '--porcelain=v1',
      ]);
      if (status.status === 'blocked') {
        return status.result;
      }
      const dirty = status.stdout.trim().length > 0;

      let upstream: string | null = null;
      const upstreamResult = await this.runGit(repositoryPath, [
        'rev-parse',
        '--abbrev-ref',
        '--symbolic-full-name',
        '@{upstream}',
      ]);
      if (upstreamResult.status === 'ok') {
        const name = upstreamResult.stdout.trim();
        upstream = name.length > 0 ? name : null;
      }

      return {
        status: 'ok',
        isRepo: true,
        headSha,
        branch,
        dirty,
        upstream,
      };
    } catch {
      return blocked(
        'git_inspect_failed',
        'No se pudo inspeccionar el estado Git del repositorio.',
      );
    }
  }

  private async runGit(
    cwd: string,
    args: readonly string[],
  ): Promise<
    | { status: 'ok'; stdout: string }
    | { status: 'blocked'; result: GitDiscoveryDto }
  > {
    try {
      const { stdout } = await this.exec('git', args, {
        cwd,
        env: GIT_ENV,
        timeout: GIT_EXEC_TIMEOUT_MS,
        maxBuffer: GIT_EXEC_MAX_BUFFER,
      });
      return { status: 'ok', stdout };
    } catch (error: unknown) {
      if (isTimeoutError(error)) {
        return {
          status: 'blocked',
          result: blocked(
            'git_inspection_timeout',
            'La inspección Git superó el tiempo máximo permitido.',
          ),
        };
      }
      if (
        args[0] === 'rev-parse' &&
        args[1] === '--is-inside-work-tree'
      ) {
        return {
          status: 'blocked',
          result: blocked(
            'not_a_git_repository',
            'La ruta no es un repositorio Git de trabajo.',
          ),
        };
      }
      return {
        status: 'blocked',
        result: blocked(
          'git_inspect_failed',
          'No se pudo inspeccionar el estado Git del repositorio.',
        ),
      };
    }
  }
}
