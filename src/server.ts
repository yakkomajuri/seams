import path from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import type { WebSocket } from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import type { SeamsConfig } from './types.js';
import { registerFileRoutes } from './routes/files.js';
import { registerSearchRoutes } from './routes/search.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerUploadRoutes } from './routes/upload.js';
import { normalizeAssetsDir, resolveAssetsRoot, servesAssetsFromRoot } from './services/assets.js';
import { FileWatcher } from './services/watcher.js';

export interface StartServerOptions {
  rootDir: string;
  config: SeamsConfig;
  dev?: boolean;
}

export interface StartServerResult {
  app: FastifyInstance;
  port: number;
}

const HOST = '127.0.0.1';
const DEFAULT_DEV_WEB_PORT = 5173;
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

export async function startServer({ rootDir, config, dev }: StartServerOptions): Promise<StartServerResult> {
  const port = await findAvailablePort(config.defaultPort, HOST);
  const app = Fastify({ logger: false });
  const watcher = new FileWatcher(rootDir, config);
  const assetsRoot = resolveAssetsRoot(rootDir, config.assets);
  watcher.start();

  await app.register(cors);
  await app.register(multipart);
  await app.register(websocket);

  app.get('/ws', { websocket: true }, (socket: WebSocket) => watcher.addClient(socket));

  await registerFileRoutes(app, rootDir, config, watcher);
  await registerUploadRoutes(app, rootDir, config.assets);
  await registerSearchRoutes(app, rootDir, config);
  await registerSettingsRoutes(app, rootDir, config, watcher);

  await app.register(fastifyStatic, {
    root: assetsRoot,
    prefix: `/${normalizeAssetsDir(config.assets)}/`,
    decorateReply: false,
  });

  if (servesAssetsFromRoot(config.assets)) {
    await app.register(fastifyStatic, {
      root: assetsRoot,
      prefix: '/',
      decorateReply: false,
    });
  }

  await app.register(fastifyStatic, {
    root: rootDir,
    prefix: '/raw/',
    decorateReply: false,
  });

  if (dev) {
    const devWebPort = parsePort(process.env.SEAMS_WEB_PORT) ?? DEFAULT_DEV_WEB_PORT;
    app.get('/', async (_, reply) => reply.redirect(`http://${HOST}:${devWebPort}/`));
  } else {
    const webRoot = path.resolve(MODULE_DIR, '../web-dist');
    await app.register(fastifyStatic, { root: webRoot, prefix: '/', wildcard: false });
    app.setNotFoundHandler((_, reply) => reply.sendFile('index.html'));
  }

  await app.listen({ port, host: HOST });
  return { app, port };
}

async function findAvailablePort(startPort: number, host: string): Promise<number> {
  let port = startPort;
  while (!(await canListenOnPort(port, host))) {
    port += 1;
  }
  return port;
}

function canListenOnPort(port: number, host: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const tester = createServer();
    tester.unref();

    tester.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }
      reject(error);
    });

    tester.listen(port, host, () => {
      tester.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(true);
      });
    });
  });
}

function parsePort(raw: string | undefined): number | null {
  if (!raw) {
    return null;
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    return null;
  }

  return port;
}
