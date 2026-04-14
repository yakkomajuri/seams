import type { FastifyInstance } from 'fastify';
import { loadMergedConfig } from '../services/config.js';
import { getIgnoreRules } from '../services/ignorePaths.js';
import { searchFiles } from '../services/search.js';
import type { SeamsConfig } from '../types.js';

export async function registerSearchRoutes(app: FastifyInstance, rootDir: string, runtimeConfig: SeamsConfig): Promise<void> {
  app.get<{ Querystring: { q?: string } }>('/api/search', async (req) => {
    const config = await loadMergedConfig(rootDir, runtimeConfig);
    return { results: await searchFiles(rootDir, req.query.q ?? '', getIgnoreRules(config)) };
  });
}
