import { decodeFilePath, encodeFilePath } from './filePaths';

export type AppRoute =
  | { kind: 'files'; path?: string }
  | { kind: 'settings' };

function normalizeHash(hash?: string | null): string {
  if (!hash) return '';
  return hash.startsWith('#') ? hash : `#${hash}`;
}

function normalizePathname(pathname: string): string {
  if (!pathname) return '/';
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '');
}

export function parseAppRoute(pathname: string): AppRoute | null {
  const normalized = normalizePathname(pathname);

  if (normalized === '/' || normalized === '/files') {
    return { kind: 'files' };
  }

  if (normalized === '/settings') {
    return { kind: 'settings' };
  }

  if (normalized.startsWith('/files/')) {
    return { kind: 'files', path: decodeFilePath(normalized.slice('/files/'.length)) };
  }

  if (normalized.startsWith('/')) {
    const path = decodeFilePath(normalized.slice(1));
    if (path) {
      return { kind: 'files', path };
    }
  }

  return null;
}

export function getCurrentRoute(): AppRoute | null {
  return parseAppRoute(window.location.pathname);
}

function pushRoute(path: string, replace = false, hash?: string): void {
  const nextPath = normalizePathname(path);
  const nextHash = normalizeHash(hash);
  const currentPath = normalizePathname(window.location.pathname);
  const currentHash = normalizeHash(window.location.hash);

  if (currentPath === nextPath && currentHash === nextHash) return;

  if (replace) {
    window.history.replaceState({}, '', `${nextPath}${nextHash}`);
  } else {
    window.history.pushState({}, '', `${nextPath}${nextHash}`);
  }

  if (currentPath !== nextPath) {
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  if (currentHash !== nextHash) {
    window.dispatchEvent(new Event('hashchange'));
  }
}

export function filesRoute(path?: string, options?: { hash?: string }): string {
  const base = path ? `/files/${encodeFilePath(path)}` : '/files';
  return `${base}${normalizeHash(options?.hash)}`;
}

export function goToFiles(path?: string, options?: { replace?: boolean; hash?: string }): void {
  pushRoute(path ? `/files/${encodeFilePath(path)}` : '/files', options?.replace, options?.hash);
}

export function goToSettings(options?: { replace?: boolean }): void {
  pushRoute('/settings', options?.replace);
}
