import { access, lstat, realpath, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { basename, isAbsolute, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import type { FilesystemPort, PreflightResult } from './filesystem.port';

@Injectable()
export class NodeFilesystemAdapter implements FilesystemPort {
  async preflightRepository(repositoryPath: string): Promise<PreflightResult> {
    if (typeof repositoryPath !== 'string' || repositoryPath.trim().length === 0) {
      return { ok: false, code: 'empty_repository_path' };
    }

    const trimmed = repositoryPath.trim();
    if (!isAbsolute(trimmed)) {
      return { ok: false, code: 'relative_repository_path' };
    }

    try {
      await access(trimmed, fsConstants.F_OK);
    } catch {
      return { ok: false, code: 'repository_not_found' };
    }

    let canonicalPath: string;
    try {
      canonicalPath = await realpath(trimmed);
    } catch {
      return { ok: false, code: 'repository_not_found' };
    }

    let directoryStat;
    try {
      directoryStat = await stat(canonicalPath);
    } catch {
      return { ok: false, code: 'repository_not_found' };
    }

    if (!directoryStat.isDirectory()) {
      return { ok: false, code: 'repository_not_directory' };
    }

    try {
      await access(canonicalPath, fsConstants.R_OK);
    } catch {
      return { ok: false, code: 'repository_not_readable' };
    }

    const yamlPath = join(canonicalPath, '.specpilot', 'project.yaml');
    try {
      const yamlStat = await lstat(yamlPath);
      if (yamlStat.isSymbolicLink() || !yamlStat.isFile()) {
        return { ok: false, code: 'project_yaml_not_regular_file' };
      }
    } catch {
      return { ok: false, code: 'project_yaml_missing' };
    }

    return {
      ok: true,
      canonicalPath,
      basename: basename(canonicalPath),
    };
  }
}
