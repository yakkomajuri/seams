import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { loadMergedConfig, writeConfig } from '../services/config.js';
import type { FileWatcher } from '../services/watcher.js';
import type { SeamsConfig } from '../types.js';

export async function registerSettingsRoutes(app: FastifyInstance, rootDir: string, runtimeConfig: SeamsConfig, watcher: FileWatcher): Promise<void> {
  app.get('/api/settings', async () => ({ settings: await loadMergedConfig(rootDir, runtimeConfig), rootDir: path.basename(rootDir) }));

  app.put<{ Body: { settings: SeamsConfig } }>('/api/settings', async (req) => {
    await writeConfig(rootDir, req.body.settings);
    watcher.broadcast({ type: 'server:config-changed' });
    return { ok: true };
  });
}
