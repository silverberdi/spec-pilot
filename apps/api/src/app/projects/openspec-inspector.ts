import { execFile as execFileCb } from 'node:child_process';
import {
  lstat,
  readdir,
  realpath,
  access,
  constants,
} from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import type {
  OpenSpecChangeSummaryDto,
  OpenSpecDiscoveryBlockedCode,
  OpenSpecDiscoveryDto,
} from '@specpilot/shared-contracts';
import {
  GIT_EXEC_MAX_BUFFER,
  GIT_EXEC_TIMEOUT_MS,
  OPENSPEC_MAX_ACTIVE_CHANGES,
  OPENSPEC_MAX_SPECS_ENTRIES,
} from '@specpilot/shared-contracts';

const execFile = promisify(execFileCb);

export type ExecFileFn = (
  file: string,
  args: readonly string[],
  options: {
    cwd: string;
    timeout: number;
    maxBuffer: number;
  },
) => Promise<{ stdout: string; stderr: string }>;

function blocked(
  code: OpenSpecDiscoveryBlockedCode,
  message: string,
): OpenSpecDiscoveryDto {
  return { status: 'blocked', code, message };
}

/**
 * Returns true when candidate is equal to or under root (both absolute).
 */
export function isPathInsideRoot(root: string, candidate: string): boolean {
  const normalizedRoot = root.endsWith(sep) ? root.slice(0, -1) : root;
  if (candidate === normalizedRoot) {
    return true;
  }
  return candidate.startsWith(normalizedRoot + sep);
}

export class OpenSpecInspector {
  constructor(private readonly exec: ExecFileFn = execFile) {}

  async inspect(repositoryPath: string): Promise<OpenSpecDiscoveryDto> {
    try {
      const openspecPath = join(repositoryPath, 'openspec');
      const contained = await this.resolveContained(repositoryPath, openspecPath);
      if (contained.status === 'blocked') {
        return contained.result;
      }
      if (contained.kind === 'missing') {
        return blocked(
          'openspec_root_missing',
          'No se encontró el directorio openspec en el repositorio.',
        );
      }
      if (contained.kind !== 'directory') {
        return blocked(
          'openspec_root_missing',
          'openspec debe ser un directorio regular dentro del repositorio.',
        );
      }

      const changesPath = join(openspecPath, 'changes');
      const changesContained = await this.resolveContained(
        repositoryPath,
        changesPath,
      );
      if (changesContained.status === 'blocked') {
        return changesContained.result;
      }

      let activeNames: string[] = [];
      if (changesContained.kind === 'directory') {
        const listed = await this.listImmediateRegularDirectories(
          repositoryPath,
          changesPath,
        );
        if (listed.status === 'blocked') {
          return listed.result;
        }
        activeNames = listed.names.filter((name) => name !== 'archive');
        if (activeNames.length > OPENSPEC_MAX_ACTIVE_CHANGES) {
          return blocked(
            'openspec_inspection_limit_exceeded',
            `Se superó el máximo de ${OPENSPEC_MAX_ACTIVE_CHANGES} cambios activos.`,
          );
        }
      }

      let specsEntriesVisited = 0;
      const activeChanges: OpenSpecChangeSummaryDto[] = [];
      for (const name of activeNames) {
        const changeDir = join(changesPath, name);
        const changeContained = await this.resolveContained(
          repositoryPath,
          changeDir,
        );
        if (changeContained.status === 'blocked') {
          return changeContained.result;
        }
        if (changeContained.kind !== 'directory') {
          continue;
        }

        const hasProposal = await this.isDirectRegularFile(
          repositoryPath,
          join(changeDir, 'proposal.md'),
        );
        if (hasProposal.status === 'blocked') {
          return hasProposal.result;
        }
        const hasDesign = await this.isDirectRegularFile(
          repositoryPath,
          join(changeDir, 'design.md'),
        );
        if (hasDesign.status === 'blocked') {
          return hasDesign.result;
        }
        const hasTasks = await this.isDirectRegularFile(
          repositoryPath,
          join(changeDir, 'tasks.md'),
        );
        if (hasTasks.status === 'blocked') {
          return hasTasks.result;
        }

        const specsResult = await this.hasCapabilitySpec(
          repositoryPath,
          join(changeDir, 'specs'),
          specsEntriesVisited,
        );
        if (specsResult.status === 'blocked') {
          return specsResult.result;
        }
        specsEntriesVisited = specsResult.visited;

        activeChanges.push({
          name,
          hasProposal: hasProposal.value,
          hasDesign: hasDesign.value,
          hasTasks: hasTasks.value,
          hasSpecs: specsResult.hasSpecs,
        });
      }

      let archivedChangeCount = 0;
      const archivePath = join(changesPath, 'archive');
      const archiveContained = await this.resolveContained(
        repositoryPath,
        archivePath,
      );
      if (archiveContained.status === 'blocked') {
        return archiveContained.result;
      }
      if (archiveContained.kind === 'directory') {
        const archived = await this.listImmediateRegularDirectories(
          repositoryPath,
          archivePath,
        );
        if (archived.status === 'blocked') {
          return archived.result;
        }
        archivedChangeCount = archived.names.length;
      }

      const cliAvailable = await this.tryLocalCli(repositoryPath);

      return {
        status: 'ok',
        rootPresent: true,
        activeChanges,
        archivedChangeCount,
        cliAvailable,
      };
    } catch {
      return blocked(
        'openspec_inspect_failed',
        'No se pudo inspeccionar el estado OpenSpec del repositorio.',
      );
    }
  }

  private async tryLocalCli(repositoryPath: string): Promise<boolean> {
    const cliPath = join(repositoryPath, 'node_modules', '.bin', 'openspec');
    try {
      let st;
      try {
        st = await lstat(cliPath);
      } catch {
        return false;
      }

      let resolvedPath: string;
      if (st.isSymbolicLink()) {
        try {
          resolvedPath = await realpath(cliPath);
        } catch {
          return false;
        }
        if (!isPathInsideRoot(repositoryPath, resolvedPath)) {
          return false;
        }
        const target = await lstat(resolvedPath);
        if (!target.isFile()) {
          return false;
        }
      } else if (st.isFile()) {
        resolvedPath = resolve(cliPath);
        if (!isPathInsideRoot(repositoryPath, resolvedPath)) {
          return false;
        }
      } else {
        return false;
      }

      await access(resolvedPath, constants.X_OK);
      await this.exec(resolvedPath, ['list', '--json'], {
        cwd: repositoryPath,
        timeout: GIT_EXEC_TIMEOUT_MS,
        maxBuffer: GIT_EXEC_MAX_BUFFER,
      });
      return true;
    } catch {
      return false;
    }
  }

  private async resolveContained(
    root: string,
    candidate: string,
  ): Promise<
    | {
        status: 'ok';
        kind: 'missing' | 'directory' | 'file' | 'other';
        resolved: string;
      }
    | { status: 'blocked'; result: OpenSpecDiscoveryDto }
  > {
    let st;
    try {
      st = await lstat(candidate);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: unknown }).code === 'ENOENT'
      ) {
        return { status: 'ok', kind: 'missing', resolved: candidate };
      }
      return {
        status: 'blocked',
        result: blocked(
          'openspec_inspect_failed',
          'No se pudo inspeccionar el estado OpenSpec del repositorio.',
        ),
      };
    }

    if (st.isSymbolicLink()) {
      let resolvedTarget: string;
      try {
        resolvedTarget = await realpath(candidate);
      } catch {
        return {
          status: 'blocked',
          result: blocked(
            'openspec_path_escape',
            'Se detectó un enlace simbólico fuera del repositorio canónico.',
          ),
        };
      }
      if (!isPathInsideRoot(root, resolvedTarget)) {
        return {
          status: 'blocked',
          result: blocked(
            'openspec_path_escape',
            'Se detectó un enlace simbólico fuera del repositorio canónico.',
          ),
        };
      }
      // Do not follow symlink during traversal — treat as other (not regular dir/file).
      return { status: 'ok', kind: 'other', resolved: resolvedTarget };
    }

    const resolved = resolve(candidate);
    if (!isPathInsideRoot(root, resolved)) {
      return {
        status: 'blocked',
        result: blocked(
          'openspec_path_escape',
          'Se detectó una ruta fuera del repositorio canónico.',
        ),
      };
    }

    if (st.isDirectory()) {
      return { status: 'ok', kind: 'directory', resolved };
    }
    if (st.isFile()) {
      return { status: 'ok', kind: 'file', resolved };
    }
    return { status: 'ok', kind: 'other', resolved };
  }

  private async listImmediateRegularDirectories(
    root: string,
    dirPath: string,
  ): Promise<
    | { status: 'ok'; names: string[] }
    | { status: 'blocked'; result: OpenSpecDiscoveryDto }
  > {
    let entries;
    try {
      entries = await readdir(dirPath, { withFileTypes: true });
    } catch {
      return {
        status: 'blocked',
        result: blocked(
          'openspec_inspect_failed',
          'No se pudo listar el directorio OpenSpec.',
        ),
      };
    }

    const names: string[] = [];
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        const child = join(dirPath, entry.name);
        const contained = await this.resolveContained(root, child);
        if (contained.status === 'blocked') {
          return contained;
        }
        // Do not follow; skip symlink entries for active/archive counts.
        continue;
      }
      if (entry.isDirectory()) {
        const child = join(dirPath, entry.name);
        const contained = await this.resolveContained(root, child);
        if (contained.status === 'blocked') {
          return contained;
        }
        if (contained.kind === 'directory') {
          names.push(entry.name);
        }
      }
    }
    names.sort();
    return { status: 'ok', names };
  }

  private async isDirectRegularFile(
    root: string,
    filePath: string,
  ): Promise<
    | { status: 'ok'; value: boolean }
    | { status: 'blocked'; result: OpenSpecDiscoveryDto }
  > {
    const contained = await this.resolveContained(root, filePath);
    if (contained.status === 'blocked') {
      return contained;
    }
    return { status: 'ok', value: contained.kind === 'file' };
  }

  private async hasCapabilitySpec(
    root: string,
    specsDir: string,
    visitedSoFar: number,
  ): Promise<
    | { status: 'ok'; hasSpecs: boolean; visited: number }
    | { status: 'blocked'; result: OpenSpecDiscoveryDto }
  > {
    const contained = await this.resolveContained(root, specsDir);
    if (contained.status === 'blocked') {
      return contained;
    }
    if (contained.kind !== 'directory') {
      return { status: 'ok', hasSpecs: false, visited: visitedSoFar };
    }

    let visited = visitedSoFar;
    let entries;
    try {
      entries = await readdir(specsDir, { withFileTypes: true });
    } catch {
      return {
        status: 'blocked',
        result: blocked(
          'openspec_inspect_failed',
          'No se pudo listar el directorio specs.',
        ),
      };
    }

    let hasSpecs = false;
    for (const entry of entries) {
      visited += 1;
      if (visited > OPENSPEC_MAX_SPECS_ENTRIES) {
        return {
          status: 'blocked',
          result: blocked(
            'openspec_inspection_limit_exceeded',
            `Se superó el máximo de ${OPENSPEC_MAX_SPECS_ENTRIES} entradas bajo specs/.`,
          ),
        };
      }

      if (entry.isSymbolicLink()) {
        const child = join(specsDir, entry.name);
        const childContained = await this.resolveContained(root, child);
        if (childContained.status === 'blocked') {
          return childContained;
        }
        continue;
      }

      if (!entry.isDirectory()) {
        continue;
      }

      const capabilityDir = join(specsDir, entry.name);
      const capContained = await this.resolveContained(root, capabilityDir);
      if (capContained.status === 'blocked') {
        return capContained;
      }
      if (capContained.kind !== 'directory') {
        continue;
      }

      let capEntries;
      try {
        capEntries = await readdir(capabilityDir, { withFileTypes: true });
      } catch {
        return {
          status: 'blocked',
          result: blocked(
            'openspec_inspect_failed',
            'No se pudo listar un directorio de capability bajo specs/.',
          ),
        };
      }

      for (const capEntry of capEntries) {
        visited += 1;
        if (visited > OPENSPEC_MAX_SPECS_ENTRIES) {
          return {
            status: 'blocked',
            result: blocked(
              'openspec_inspection_limit_exceeded',
              `Se superó el máximo de ${OPENSPEC_MAX_SPECS_ENTRIES} entradas bajo specs/.`,
            ),
          };
        }
        if (capEntry.isSymbolicLink()) {
          const child = join(capabilityDir, capEntry.name);
          const childContained = await this.resolveContained(root, child);
          if (childContained.status === 'blocked') {
            return childContained;
          }
          continue;
        }
        if (capEntry.isFile() && capEntry.name === 'spec.md') {
          hasSpecs = true;
        }
      }
    }

    return { status: 'ok', hasSpecs, visited };
  }
}
