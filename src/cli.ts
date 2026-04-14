import path from 'node:path';
import { cac } from 'cac';
import open from 'open';
import { loadConfig, mergeConfig } from './services/config.js';
import { startServer } from './server.js';
import pkg from '../package.json' assert { type: 'json' };

const cli = cac('seams');
cli.version(pkg.version);
const DEFAULT_DEV_WEB_PORT = 5173;

cli
  .command('[dir]', 'Open a directory in seams')
  .option('--port <port>', 'Port number')
  .option('--no-open', 'Do not open browser')
  .action(async (dir = '.', flags) => {
    const dev = Boolean(process.env.SEAMS_DEV);
    const rootDir = path.resolve(process.cwd(), dir);
    const fileConfig = await loadConfig(rootDir);
    const config = mergeConfig(fileConfig, {
      defaultPort: flags.port ? Number(flags.port) : undefined,
    });

    const { port } = await startServer({ rootDir, config, dev });
    const devWebPort = parsePort(process.env.SEAMS_WEB_PORT) ?? DEFAULT_DEV_WEB_PORT;

    if (port !== config.defaultPort) {
      console.warn(
        dev
          ? `Port ${config.defaultPort} is in use, using ${port} for the dev backend instead.`
          : `Port ${config.defaultPort} is in use, using ${port} instead.`,
      );
    }

    const url = dev ? `http://127.0.0.1:${devWebPort}` : `http://127.0.0.1:${port}`;
    if (!flags['noOpen']) {
      await open(url);
    }
    console.log(dev ? `seams dev UI at ${url} (backend http://127.0.0.1:${port})` : `seams running at ${url}`);
  });

cli.help();
cli.parse();

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
