import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { FileContent, FileNode } from '../types.js';
import type { IgnoreRules } from './ignorePaths.js';
import { isIgnoredPath } from './ignorePaths.js';

const ALLOWED = new Set(['.md', '.mdx', '.txt']);

function compareNodes(a: FileNode, b: FileNode): number {
  if (a.type !== b.type) {
    return a.type === 'directory' ? -1 : 1;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function safeResolve(rootDir: string, requestedPath: string): string {
  const resolved = path.resolve(rootDir, requestedPath);
  const root = path.resolve(rootDir);
  if (!resolved.startsWith(root)) {
    throw new Error('Invalid path');
  }
  return resolved;
}

export async function scanDirectory(
  rootDir: string,
  maxDepth: number,
  ignoreRules: IgnoreRules,
  depth = 0,
  rel = '.',
): Promise<FileNode[]> {
  if (depth > maxDepth) return [];
  const current = safeResolve(rootDir, rel);
  const entries = await fs.readdir(current, { withFileTypes: true });
  const nodes: FileNode[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.seamsrc') continue;
    const childRel = path.join(rel, entry.name);
    if (entry.isDirectory()) {
      if (isIgnoredPath(childRel, ignoreRules, 'directory')) continue;
      nodes.push({
        name: entry.name,
        path: childRel,
        type: 'directory',
        children: await scanDirectory(rootDir, maxDepth, ignoreRules, depth + 1, childRel),
      });
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (ALLOWED.has(ext) && !isIgnoredPath(childRel, ignoreRules, 'file')) {
      nodes.push({ name: entry.name, path: childRel, type: 'file' });
    }
  }
  return nodes.sort(compareNodes);
}

export async function readFile(rootDir: string, relPath: string): Promise<FileContent> {
  const abs = safeResolve(rootDir, relPath);
  const content = await fs.readFile(abs, 'utf8');
  const parsed = matter(content);
  return {
    path: relPath,
    content,
    frontmatter: parsed.data,
    body: parsed.content,
  };
}

export async function writeFile(rootDir: string, relPath: string, content: string): Promise<void> {
  const abs = safeResolve(rootDir, relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, 'utf8');
}

export async function createFile(rootDir: string, relPath: string): Promise<void> {
  const abs = safeResolve(rootDir, relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, '', { flag: 'wx' });
}

export async function createDirectory(rootDir: string, relPath: string): Promise<void> {
  const abs = safeResolve(rootDir, relPath);
  await fs.mkdir(abs, { recursive: true });
}

export async function deleteFile(rootDir: string, relPath: string): Promise<void> {
  const abs = safeResolve(rootDir, relPath);
  await fs.rm(abs, { force: true });
}

export async function renameFile(rootDir: string, oldPath: string, newPath: string): Promise<void> {
  const absOld = safeResolve(rootDir, oldPath);
  const absNew = safeResolve(rootDir, newPath);
  await fs.mkdir(path.dirname(absNew), { recursive: true });
  await fs.rename(absOld, absNew);
}
