import { createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { FastifyInstance } from 'fastify';
import { buildAssetUrl, resolveAssetsRoot } from '../services/assets.js';

export async function registerUploadRoutes(app: FastifyInstance, rootDir: string, assetsDir: string): Promise<void> {
  app.post('/api/upload', async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'No file uploaded' });

    const basename = path.basename(file.filename).replace(/\s+/g, '-');
    const filename = `${Date.now()}-${basename}`;
    const targetDir = resolveAssetsRoot(rootDir, assetsDir);
    await fs.mkdir(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, filename);
    if (!targetPath.startsWith(targetDir)) {
      return reply.code(400).send({ error: 'Invalid filename' });
    }
    await pipeline(file.file, createWriteStream(targetPath));

    return { url: buildAssetUrl(assetsDir, filename) };
  });
}
