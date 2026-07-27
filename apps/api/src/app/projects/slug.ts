/**
 * Derive a lowercase kebab-case slug from a directory basename.
 * Returns null when a valid slug cannot be produced.
 */
export function deriveSlugFromBasename(directoryBasename: string): string | null {
  const normalized = directoryBasename
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!normalized) {
    return null;
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return null;
  }

  return normalized;
}
