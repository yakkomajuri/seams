import path from 'node:path';

export function normalizeAssetsDir(assetsDir: string): string {
  const normalized = assetsDir
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  return normalized || 'assets';
}

export function resolveAssetsRoot(rootDir: string, assetsDir: string): string {
  return path.join(rootDir, normalizeAssetsDir(assetsDir));
}

export function servesAssetsFromRoot(assetsDir: string): boolean {
  return path.posix.basename(normalizeAssetsDir(assetsDir)) === 'public';
}

export function buildAssetUrl(assetsDir: string, relativePath: string): string {
  const normalizedPath = relativePath.replace(/^\/+/, '');
  if (servesAssetsFromRoot(assetsDir)) {
    return `/${normalizedPath}`;
  }
  return `/${normalizeAssetsDir(assetsDir)}/${normalizedPath}`;
}
