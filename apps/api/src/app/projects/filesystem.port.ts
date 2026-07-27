export type PreflightFailureCode =
  | 'empty_repository_path'
  | 'relative_repository_path'
  | 'repository_not_found'
  | 'repository_not_directory'
  | 'repository_not_readable'
  | 'project_yaml_missing'
  | 'project_yaml_not_regular_file';

export type PreflightResult =
  | { ok: true; canonicalPath: string; basename: string }
  | { ok: false; code: PreflightFailureCode };

/**
 * Read-only filesystem port for registration preflight.
 * Implementations MUST NOT create, modify, or delete files in the target repository.
 */
export interface FilesystemPort {
  preflightRepository(repositoryPath: string): Promise<PreflightResult>;
}

export const FILESYSTEM_PORT = Symbol('FILESYSTEM_PORT');
