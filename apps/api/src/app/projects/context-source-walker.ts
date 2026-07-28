import { readdir, lstat, readlink, realpath } from 'node:fs/promises';
import { join, resolve as pathResolve, relative, sep, isAbsolute } from 'node:path';
import picomatch from 'picomatch';
import {
  CONTEXT_SOURCE_MAX_MATCHED_FILES,
  CONTEXT_SOURCE_MAX_PATH_BYTES,
  CONTEXT_SOURCE_MAX_VISITED_ENTRIES,
  CONTEXT_SOURCE_RESOLVE_TIMEOUT_MS,
  MANDATORY_CONTEXT_EXCLUDES,
  PICOMATCH_RESOLVE_OPTIONS,
  type ContextSourceResolveBlockedCode,
} from '@specpilot/shared-contracts';

export type ContextWalkOk = {
  ok: true;
  paths: string[];
  visitedEntries: number;
};

export type ContextWalkBlocked = {
  ok: false;
  code: ContextSourceResolveBlockedCode;
};

export type ContextWalkResult = ContextWalkOk | ContextWalkBlocked;

export type ContextWalkOptions = {
  repositoryRoot: string;
  include: string[];
  exclude: string[];
  maxVisitedEntries?: number;
  maxMatchedFiles?: number;
  maxPathBytes?: number;
  timeoutMs?: number;
  now?: () => number;
};

export function buildEffectiveExcludes(snapshotExcludes: string[]): string[] {
  const effective = [...snapshotExcludes];
  for (const pattern of MANDATORY_CONTEXT_EXCLUDES) {
    if (!effective.includes(pattern)) {
      effective.push(pattern);
    }
  }
  return effective;
}

export function validateContextPatterns(
  include: string[],
  exclude: string[],
): { ok: true } | { ok: false; code: 'invalid_context_patterns' } {
  for (const pattern of [...include, ...exclude]) {
    if (!isValidContextPattern(pattern)) {
      return { ok: false, code: 'invalid_context_patterns' };
    }
  }
  if (include.length === 0) {
    return { ok: false, code: 'invalid_context_patterns' };
  }
  return { ok: true };
}

function isValidContextPattern(pattern: string): boolean {
  if (typeof pattern !== 'string') {
    return false;
  }
  const trimmed = pattern.trim();
  if (trimmed.length === 0 || trimmed !== pattern) {
    // empty after trim, or had surrounding whitespace that would surprise operators
    if (trimmed.length === 0) {
      return false;
    }
  }
  if (pattern.includes('\0')) {
    return false;
  }
  if (pattern.startsWith('/') || isAbsolute(pattern)) {
    return false;
  }
  if (pattern.includes('\\')) {
    return false;
  }
  const segments = pattern.split('/');
  if (segments.some((segment) => segment === '..')) {
    return false;
  }
  try {
    picomatch(pattern, PICOMATCH_RESOLVE_OPTIONS);
  } catch {
    return false;
  }
  return true;
}

function sortPaths(paths: string[]): string[] {
  return paths.slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function isInsideRepo(repoRoot: string, absolutePath: string): boolean {
  const rel = relative(repoRoot, absolutePath);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function toRepoRelative(repoRoot: string, absolutePath: string): string {
  return relative(repoRoot, absolutePath).split(sep).join('/');
}

/**
 * Include-based descent pruning (not a hard-coded skip list).
 * A directory is entered only when at least one include pattern could match a
 * path under it. Patterns starting with `**` disable pruning for that pattern.
 */
function directoryCouldContainMatch(
  dirRel: string,
  includePatterns: string[],
): boolean {
  for (const pattern of includePatterns) {
    if (pattern === '**' || pattern.startsWith('**/')) {
      return true;
    }
    const metaIdx = pattern.search(/[*?[{]/);
    const literal = (
      metaIdx === -1 ? pattern : pattern.slice(0, metaIdx)
    ).replace(/\/$/, '');
    if (literal.length === 0) {
      return true;
    }
    if (
      dirRel === literal ||
      literal.startsWith(`${dirRel}/`) ||
      dirRel.startsWith(`${literal}/`)
    ) {
      return true;
    }
    if (
      picomatch(pattern, PICOMATCH_RESOLVE_OPTIONS)(`${dirRel}/__sp_probe__`)
    ) {
      return true;
    }
  }
  return false;
}

export async function walkContextSources(
  options: ContextWalkOptions,
): Promise<ContextWalkResult> {
  const repoRoot = await realpath(options.repositoryRoot);
  const maxVisited =
    options.maxVisitedEntries ?? CONTEXT_SOURCE_MAX_VISITED_ENTRIES;
  const maxMatched =
    options.maxMatchedFiles ?? CONTEXT_SOURCE_MAX_MATCHED_FILES;
  const maxPathBytes = options.maxPathBytes ?? CONTEXT_SOURCE_MAX_PATH_BYTES;
  const timeoutMs = options.timeoutMs ?? CONTEXT_SOURCE_RESOLVE_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const startedAt = now();

  const includeMatchers = options.include.map((pattern) =>
    picomatch(pattern, PICOMATCH_RESOLVE_OPTIONS),
  );
  const excludeMatchers = options.exclude.map((pattern) =>
    picomatch(pattern, PICOMATCH_RESOLVE_OPTIONS),
  );

  let visitedEntries = 0;
  const matched: string[] = [];
  let pathBytes = 0;

  const stack: string[] = [repoRoot];

  while (stack.length > 0) {
    if (now() - startedAt > timeoutMs) {
      return { ok: false, code: 'context_resolution_timeout' };
    }

    const currentDir = stack.pop()!;
    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch (error: unknown) {
      if (isPermissionError(error)) {
        return { ok: false, code: 'context_entry_unreadable' };
      }
      throw error;
    }

    for (const entry of entries) {
      if (now() - startedAt > timeoutMs) {
        return { ok: false, code: 'context_resolution_timeout' };
      }

      visitedEntries += 1;
      if (visitedEntries > maxVisited) {
        return { ok: false, code: 'context_resolution_limit_exceeded' };
      }

      const absolutePath = join(currentDir, entry.name);

      if (entry.name === '.git') {
        continue;
      }

      let st;
      try {
        st = await lstat(absolutePath);
      } catch (error: unknown) {
        if (isPermissionError(error)) {
          return { ok: false, code: 'context_entry_unreadable' };
        }
        throw error;
      }

      if (st.isSymbolicLink()) {
        let target: string;
        try {
          target = await readlink(absolutePath);
        } catch (error: unknown) {
          if (isPermissionError(error)) {
            return { ok: false, code: 'context_entry_unreadable' };
          }
          throw error;
        }
        const resolvedTarget = isAbsolute(target)
          ? target
          : pathResolve(currentDir, target);
        let canonicalTarget: string;
        try {
          canonicalTarget = await realpath(resolvedTarget);
        } catch {
          return { ok: false, code: 'context_path_escape' };
        }
        if (!isInsideRepo(repoRoot, canonicalTarget)) {
          return { ok: false, code: 'context_path_escape' };
        }
        continue;
      }

      if (st.isDirectory()) {
        const childRel = toRepoRelative(repoRoot, absolutePath);
        if (directoryCouldContainMatch(childRel, options.include)) {
          stack.push(absolutePath);
        }
        continue;
      }

      if (!st.isFile()) {
        continue;
      }

      const rel = toRepoRelative(repoRoot, absolutePath);
      const included = includeMatchers.some((match) => match(rel));
      if (!included) {
        continue;
      }
      const excluded = excludeMatchers.some((match) => match(rel));
      if (excluded) {
        continue;
      }

      matched.push(rel);
      if (matched.length > maxMatched) {
        return { ok: false, code: 'context_resolution_limit_exceeded' };
      }
      pathBytes += Buffer.byteLength(rel, 'utf8');
      if (pathBytes > maxPathBytes) {
        return { ok: false, code: 'context_resolution_limit_exceeded' };
      }
    }
  }

  return {
    ok: true,
    paths: sortPaths(matched),
    visitedEntries,
  };
}

function isPermissionError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    ((error as { code: unknown }).code === 'EACCES' ||
      (error as { code: unknown }).code === 'EPERM')
  );
}
