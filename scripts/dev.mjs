import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const START_PORT = Number(process.env.PORT) || 3000;
const MAX_ATTEMPTS = 20;
// Next binds both the IPv4 and IPv6 wildcard addresses, so a port only
// counts as free if it's open on both.
const HOSTS_TO_CHECK = ['0.0.0.0', '::'];

function isHostPortFree(port, host) {
  return new Promise((resolve) => {
    const tester = createServer();
    // Only EADDRINUSE means the port is actually taken. Any other error
    // (e.g. EAFNOSUPPORT on hosts without IPv6) just means this address
    // family isn't usable here, not that the port is busy.
    tester.once('error', (error) => resolve(error.code !== 'EADDRINUSE'));
    tester.once('listening', () => tester.close(() => resolve(true)));
    tester.listen(port, host);
  });
}

async function isPortFree(port) {
  for (const host of HOSTS_TO_CHECK) {
    if (!(await isHostPortFree(port, host))) return false;
  }
  return true;
}

async function findFreePort(startPort) {
  for (let port = startPort; port < startPort + MAX_ATTEMPTS; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port found in range ${startPort}-${startPort + MAX_ATTEMPTS - 1}`);
}

const port = await findFreePort(START_PORT);
if (port !== START_PORT) {
  console.log(`Port ${START_PORT} is in use, starting on ${port} instead.`);
}

const nextBin = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, 'dev', '-p', String(port)], {
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
