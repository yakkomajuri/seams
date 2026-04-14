import type { FastifyInstance } from 'fastify';
import matter from 'gray-matter';
import { loadMergedConfig } from '../services/config.js';
import { createDirectory, createFile, deleteFile, readFile, renameFile, scanDirectory, writeFile } from '../services/fileTree.js';
import { getIgnoreRules } from '../services/ignorePaths.js';
import type { FileWatcher } from '../services/watcher.js';
import type { SeamsConfig } from '../types.js';

export async function registerFileRoutes(
  app: FastifyInstance,
  rootDir: string,
  runtimeConfig: SeamsConfig,
  watcher: FileWatcher,
): Promise<void> {
  app.get('/api/files', async () => {
    const config = await loadMergedConfig(rootDir, runtimeConfig);
    return { files: await scanDirectory(rootDir, config.depth, getIgnoreRules(config)) };
  });

  app.get<{ Params: { '*': string } }>('/api/files/*', async (req) => readFile(rootDir, req.params['*']));

  app.put<{ Params: { '*': string }; Body: { content?: string; body?: string; frontmatter?: Record<string, unknown> } }>('/api/files/*', async (req) => {
    const content = typeof req.body.content === 'string'
      ? req.body.content
      : matter.stringify(req.body.body ?? '', req.body.frontmatter ?? {});
    await writeFile(rootDir, req.params['*'], content);
    watcher.markSelfWrite(req.params['*']);
    return { ok: true };
  });

  app.post<{ Body: { path: string } }>('/api/files', async (req) => {
    await createFile(rootDir, req.body.path);
    watcher.markSelfWrite(req.body.path);
    return { ok: true };
  });

  app.post<{ Body: { path: string } }>('/api/directories', async (req) => {
    await createDirectory(rootDir, req.body.path);
    watcher.markSelfWrite(req.body.path);
    return { ok: true };
  });

  app.delete<{ Params: { '*': string } }>('/api/files/*', async (req) => {
    await deleteFile(rootDir, req.params['*']);
    watcher.markSelfWrite(req.params['*']);
    return { ok: true };
  });

  app.patch<{ Params: { '*': string }; Body: { newPath: string } }>('/api/files/*', async (req) => {
    await renameFile(rootDir, req.params['*'], req.body.newPath);
    watcher.markSelfWrite(req.params['*']);
    return { ok: true };
  });
}
