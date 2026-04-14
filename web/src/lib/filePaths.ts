export function normalizeFilePath(path: string): string {
  return path.replace(/^\.\//, '').replace(/^\/+/, '');
}

export function encodeFilePath(path: string): string {
  return normalizeFilePath(path)
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function decodeFilePath(path: string): string {
  return normalizeFilePath(path)
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join('/');
}
