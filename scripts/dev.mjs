import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const DEFAULT_PORT = 4444;
const DEFAULT_WEB_PORT = 5173;
const HOST = '127.0.0.1';
const PNPM_BIN = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const preferredBackendPort = parsePort(process.env.SEAMS_SERVER_PORT) ?? DEFAULT_PORT;
const backendPort = await findAvailablePort(preferredBackendPort, HOST);
const preferredWebPort = parsePort(process.env.SEAMS_WEB_PORT) ?? DEFAULT_WEB_PORT;
const webPort = await findAvailablePort(preferredWebPort, HOST);
const env = {
  ...process.env,
  SEAMS_SERVER_PORT: String(backendPort),
  SEAMS_WEB_PORT: String(webPort),
};

if (backendPort !== preferredBackendPort) {
  console.log(`Port ${preferredBackendPort} is in use, using ${backendPort} for the dev backend.`);
} else {
  console.log(`Using port ${backendPort} for the dev backend.`);
}

if (webPort !== preferredWebPort) {
  console.log(`Port ${preferredWebPort} is in use, using ${webPort} for the dev UI.`);
} else {
  console.log(`Using port ${webPort} for the dev UI.`);
}

console.log(`Open http://${HOST}:${webPort}`);

const children = [
  spawn(PNPM_BIN, ['run', 'dev:server', '--', '--port', String(backendPort)], {
    stdio: 'inherit',
    env,
  }),
  spawn(PNPM_BIN, ['run', 'dev:web'], {
    stdio: 'inherit',
    env,
  }),
];

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => process.exit(exitCode), 100).unref();
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));

for (const child of children) {
  child.on('error', () => shutdown(1));
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }
    shutdown(signal ? 1 : (code ?? 0));
  });
}

function parsePort(raw) {
  if (!raw) {
    return null;
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    return null;
  }

  return port;
}

async function findAvailablePort(startPort, host) {
  let port = startPort;
  while (!(await canListenOnPort(port, host))) {
    port += 1;
  }
  return port;
}

function canListenOnPort(port, host) {
  return new Promise((resolve, reject) => {
    const tester = createServer();
    tester.unref();

    tester.once('error', (error) => {
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
