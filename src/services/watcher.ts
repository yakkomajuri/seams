import path from 'node:path';
import chokidar from 'chokidar';
import type { WebSocket } from '@fastify/websocket';
import { loadMergedConfig } from './config.js';
import { getGlobIgnorePatterns, getIgnoreRules, isIgnoredPath } from './ignorePaths.js';
import type { SeamsConfig, WsMessage } from '../types.js';

export class FileWatcher {
  private clients = new Set<WebSocket>();
  private recentWrites = new Map<string, number>();

  constructor(private rootDir: string, private runtimeConfig: SeamsConfig) {}

  addClient(client: WebSocket): void {
    this.clients.add(client);
    client.on('close', () => this.clients.delete(client));
  }

  markSelfWrite(relPath: string): void {
    this.recentWrites.set(relPath, Date.now());
  }

  start(): void {
    const startupIgnoreRules = getIgnoreRules(this.runtimeConfig);
    const watcher = chokidar.watch(['**/*.md', '**/*.mdx', '**/*.txt'], {
      cwd: this.rootDir,
      ignored: getGlobIgnorePatterns(startupIgnoreRules),
      depth: this.runtimeConfig.depth,
      ignoreInitial: true,
    });

    const maybeBroadcast = async (type: WsMessage['type'], relPath: string) => {
      const ts = this.recentWrites.get(relPath);
      if (ts && Date.now() - ts < 1000) {
        this.recentWrites.delete(relPath);
        return;
      }

      const config = await loadMergedConfig(this.rootDir, this.runtimeConfig);
      if (isIgnoredPath(relPath, getIgnoreRules(config), 'file')) {
        return;
      }

      this.broadcast({ type, path: relPath });
    };

    watcher.on('change', (p) => { void maybeBroadcast('file:changed', normalize(p)); });
    watcher.on('add', (p) => { void maybeBroadcast('file:created', normalize(p)); });
    watcher.on('unlink', (p) => { void maybeBroadcast('file:deleted', normalize(p)); });
  }

  broadcast(message: WsMessage): void {
    const raw = JSON.stringify(message);
    for (const client of this.clients) {
      try {
        client.send(raw);
      } catch {
        this.clients.delete(client);
      }
    }
  }
}

function normalize(p: string): string {
  return p.split(path.sep).join('/');
}
