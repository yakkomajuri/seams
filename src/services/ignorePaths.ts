import path from 'node:path';
import type { SeamsConfig } from '../types.js';

export interface IgnoreRules {
  ignoreDirs: string[];
  ignoreFiles: string[];
}

export function getIgnoreRules(config: Pick<SeamsConfig, 'ignoreDirs' | 'ignoreFiles'>): IgnoreRules {
  return {
    ignoreDirs: uniqueNormalizedPaths(config.ignoreDirs, 'directory'),
    ignoreFiles: uniqueNormalizedPaths(config.ignoreFiles, 'file'),
  };
}

export function isIgnoredPath(relPath: string, rules: IgnoreRules, type: 'file' | 'directory'): boolean {
  const normalizedPath = normalizeRelativePath(relPath);
  if (!normalizedPath) return false;

  if (matchesIgnoredDirectory(normalizedPath, rules.ignoreDirs)) {
    return true;
  }

  if (type === 'directory') {
    return false;
  }

  return rules.ignoreFiles.includes(normalizedPath);
}

export function getGlobIgnorePatterns(rules: IgnoreRules): string[] {
  return [
    'node_modules/**',
    '.git/**',
    ...rules.ignoreDirs.map((dir) => `${dir}/**`),
    ...rules.ignoreFiles,
  ];
}

function uniqueNormalizedPaths(values: string[], type: 'file' | 'directory'): string[] {
  const normalized = values
    .map((value) => normalizeRelativePath(value))
    .map((value) => (type === 'directory' ? value.replace(/\/+$/, '') : value))
    .filter(Boolean);

  return [...new Set(normalized)];
}

function matchesIgnoredDirectory(relPath: string, ignoreDirs: string[]): boolean {
  return ignoreDirs.some((dir) => relPath === dir || relPath.startsWith(`${dir}/`));
}

function normalizeRelativePath(relPath: string): string {
  return path.posix
    .normalize(relPath.replaceAll('\\', '/').trim())
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
    .replace(/^$/, '.')
    .replace(/^\.$/, '');
}
