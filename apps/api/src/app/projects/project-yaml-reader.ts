import { access, lstat, readFile, realpath, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { PROJECT_YAML_MAX_BYTES } from '@specpilot/shared-contracts';
import type { ConfigurationFailureCode } from './project-yaml-validator';

export type ReadProjectYamlResult =
  | { ok: true; bytes: Buffer }
  | { ok: false; code: ConfigurationFailureCode };

/**
 * Read-only reader for `.specpilot/project.yaml` under a canonical repository path.
 * MUST NOT create, modify, or delete files in the target repository.
 */
@Injectable()
export class ProjectYamlReader {
  async readExactBytes(canonicalRepositoryPath: string): Promise<ReadProjectYamlResult> {
    const yamlPath = join(canonicalRepositoryPath, '.specpilot', 'project.yaml');

    try {
      await access(yamlPath, fsConstants.F_OK);
    } catch {
      return { ok: false, code: 'project_yaml_missing' };
    }

    let yamlStat;
    try {
      yamlStat = await lstat(yamlPath);
    } catch {
      return { ok: false, code: 'project_yaml_missing' };
    }

    if (yamlStat.isSymbolicLink() || !yamlStat.isFile()) {
      return { ok: false, code: 'project_yaml_not_regular_file' };
    }

    // Size check before reading full contents into parse path.
    if (yamlStat.size > PROJECT_YAML_MAX_BYTES) {
      return { ok: false, code: 'project_yaml_too_large' };
    }

    // Confirm the repository directory still resolves (read-only).
    try {
      const directoryStat = await stat(await realpath(canonicalRepositoryPath));
      if (!directoryStat.isDirectory()) {
        return { ok: false, code: 'project_yaml_missing' };
      }
    } catch {
      return { ok: false, code: 'project_yaml_missing' };
    }

    const bytes = await readFile(yamlPath);
    if (bytes.byteLength > PROJECT_YAML_MAX_BYTES) {
      return { ok: false, code: 'project_yaml_too_large' };
    }
    return { ok: true, bytes };
  }
}
