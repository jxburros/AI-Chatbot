import { createServer } from 'node:net';
import { spawn } from 'node:child_process';

const START_PORT = Number(process.env.PORT) || 3000;
const MAX_ATTEMPTS = 20;

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => tester.close(() => resolve(true)));
    tester.listen(port, '0.0.0.0');
  });
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

const child = spawn('npx', ['next', 'dev', '-p', String(port)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code) => process.exit(code ?? 0));
