import type { FileNode } from '../../../src/types';

export function collectDirectoryPaths(nodes: FileNode[]): string[] {
  const paths: string[] = [];

  function visit(entries: FileNode[]): void {
    for (const entry of entries) {
      if (entry.type !== 'directory') continue;
      paths.push(entry.path);
      visit(entry.children ?? []);
    }
  }

  visit(nodes);
  return paths;
}

export function setDirectoryPathOpen(paths: string[], path: string, open: boolean): string[] {
  const isOpen = paths.includes(path);

  if (open) {
    return isOpen ? paths : [...paths, path];
  }

  return isOpen ? paths.filter((candidate) => candidate !== path) : paths;
}

export function pruneDirectoryPaths(paths: string[], validPaths: string[]): string[] {
  const valid = new Set(validPaths);
  let changed = false;

  const next = paths.filter((path) => {
    const keep = valid.has(path);
    if (!keep) changed = true;
    return keep;
  });

  return changed ? next : paths;
}
