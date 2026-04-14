import { promises as fs } from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import type { SearchContentMatch, SearchResult } from '../types.js';
import type { IgnoreRules } from './ignorePaths.js';
import { getGlobIgnorePatterns } from './ignorePaths.js';

function findContentMatch(raw: string, query: string): SearchContentMatch | undefined {
  const lines = raw.split(/\r?\n/);

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (line.toLowerCase().includes(query)) {
      return {
        line: idx + 1,
        preview: line.trim().slice(0, 180),
      };
    }
  }

  return undefined;
}

function scoreResult(result: SearchResult, query: string): number {
  const lowerName = result.fileName.toLowerCase();

  let score = 0;

  if (lowerName === query) score += 60;
  else if (lowerName.startsWith(query)) score += 40;
  else if (lowerName.includes(query)) score += 24;

  if (result.contentMatch) score += 8;
  if (result.matchKinds.length === 2) score += 4;

  return score;
}

export async function searchFiles(rootDir: string, query: string, ignoreRules: IgnoreRules): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const files = await glob('**/*.{md,mdx,txt}', {
    cwd: rootDir,
    nodir: true,
    ignore: getGlobIgnorePatterns(ignoreRules),
  });
  const q = query.toLowerCase();
  const results: Array<SearchResult & { score: number }> = [];

  for (const rel of files) {
    const normalizedPath = rel.replaceAll(path.sep, '/');
    const fileName = path.basename(rel);
    const lowerName = fileName.toLowerCase();
    const nameMatch = lowerName.includes(q);
    const raw = await fs.readFile(path.join(rootDir, rel), 'utf8');
    const contentMatch = findContentMatch(raw, q);

    if (!nameMatch && !contentMatch) continue;

    const result: SearchResult = {
      path: normalizedPath,
      fileName,
      matchKinds: [nameMatch ? 'name' : null, contentMatch ? 'content' : null].filter(
        (kind): kind is SearchResult['matchKinds'][number] => kind !== null,
      ),
      contentMatch,
    };

    results.push({
      ...result,
      score: scoreResult(result, q),
    });
  }

  return results
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 100)
    .map(({ score: _score, ...result }) => result);
}
