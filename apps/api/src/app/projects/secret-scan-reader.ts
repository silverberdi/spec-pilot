import { constants, open } from 'node:fs/promises';
import { join } from 'node:path';
import {
  SECRET_SCAN_MAX_FILE_BYTES,
  SECRET_SCAN_MAX_TOTAL_BYTES,
  SECRET_SCAN_TIMEOUT_MS,
} from '@specpilot/shared-contracts';

export type SecretScanReadOk = {
  ok: true;
  kind: 'text';
  text: string;
  bytes: Buffer;
  bytesRead: number;
};

export type SecretScanReadUnscannable = {
  ok: true;
  kind: 'unscannable';
  bytesRead: number;
};

export type SecretScanReadFail = {
  ok: false;
  code:
    | 'context_path_escape'
    | 'secret_scan_entry_unreadable'
    | 'secret_scan_limit_exceeded'
    | 'secret_scan_timeout';
};

export type SecretScanReadResult =
  | SecretScanReadOk
  | SecretScanReadUnscannable
  | SecretScanReadFail;

function isInvalidRelativePath(relativePath: string): boolean {
  if (relativePath.length === 0) {
    return true;
  }
  if (relativePath.includes('\0')) {
    return true;
  }
  if (relativePath.startsWith('/') || relativePath.startsWith('./')) {
    return true;
  }
  if (relativePath.includes('\\')) {
    return true;
  }
  const segments = relativePath.split('/');
  return segments.some((segment) => segment === '..');
}

function isErrno(
  error: unknown,
  codes: ReadonlyArray<string>,
): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    codes.includes((error as { code: string }).code)
  );
}

function deadlineExceeded(startedAt: number): boolean {
  return Date.now() - startedAt >= SECRET_SCAN_TIMEOUT_MS;
}

/**
 * Safe open+fstat+read for one candidate path under repositoryRoot.
 * Never returns or logs file contents to callers beyond the Result text field
 * (callers must not log Result.text).
 */
export async function readCandidateForSecretScan(options: {
  repositoryRoot: string;
  relativePath: string;
  totalBytesRead: number;
  scanStartedAt: number;
}): Promise<SecretScanReadResult> {
  const { repositoryRoot, relativePath, totalBytesRead, scanStartedAt } =
    options;

  if (deadlineExceeded(scanStartedAt)) {
    return { ok: false, code: 'secret_scan_timeout' };
  }

  if (isInvalidRelativePath(relativePath)) {
    return { ok: false, code: 'context_path_escape' };
  }

  const absolutePath = join(repositoryRoot, relativePath);
  let handle: Awaited<ReturnType<typeof open>> | undefined;

  try {
    handle = await open(
      absolutePath,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    const stats = await handle.stat();
    if (!stats.isFile()) {
      return { ok: false, code: 'secret_scan_entry_unreadable' };
    }

    const fileSize = stats.size;
    if (fileSize > SECRET_SCAN_MAX_FILE_BYTES) {
      return { ok: true, kind: 'unscannable', bytesRead: 0 };
    }

    if (totalBytesRead + fileSize > SECRET_SCAN_MAX_TOTAL_BYTES) {
      return { ok: false, code: 'secret_scan_limit_exceeded' };
    }

    if (deadlineExceeded(scanStartedAt)) {
      return { ok: false, code: 'secret_scan_timeout' };
    }

    if (fileSize === 0) {
      return {
        ok: true,
        kind: 'text',
        text: '',
        bytes: Buffer.alloc(0),
        bytesRead: 0,
      };
    }

    const buffer = Buffer.alloc(fileSize);
    const { bytesRead } = await handle.read(buffer, 0, fileSize, 0);
    if (bytesRead !== fileSize) {
      return { ok: false, code: 'secret_scan_entry_unreadable' };
    }

    if (deadlineExceeded(scanStartedAt)) {
      return { ok: false, code: 'secret_scan_timeout' };
    }

    for (let i = 0; i < buffer.length; i += 1) {
      if (buffer[i] === 0) {
        return { ok: true, kind: 'unscannable', bytesRead };
      }
    }

    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const text = decoder.decode(buffer);
      return { ok: true, kind: 'text', text, bytes: buffer, bytesRead };
    } catch {
      return { ok: true, kind: 'unscannable', bytesRead };
    }
  } catch (error: unknown) {
    if (
      isErrno(error, [
        'ELOOP',
        'ENOENT',
        'EACCES',
        'EPERM',
        'ENOTDIR',
        'EISDIR',
      ])
    ) {
      return { ok: false, code: 'secret_scan_entry_unreadable' };
    }
    // macOS may surface O_NOFOLLOW failures as EOPNOTSUPP / EFTYPE / EMLINK-like —
    // treat unexpected open/fstat/read entry failures as unreadable when errno-like.
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'string'
    ) {
      return { ok: false, code: 'secret_scan_entry_unreadable' };
    }
    throw error;
  } finally {
    if (handle !== undefined) {
      await handle.close().catch(() => undefined);
    }
  }
}
