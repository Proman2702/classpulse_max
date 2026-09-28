import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const args = process.argv[2] === 'dev'
  ? [require.resolve('tsx/cli'), 'watch', 'src/index.ts']
  : ['dist/index.js'];

// MAX API v2 uses the Russian Trusted CA. Keep normal TLS verification enabled.
const child = spawn(process.execPath, args, {
  cwd: fileURLToPath(new URL('.', import.meta.url)),
  stdio: 'inherit',
  env: { ...process.env, NODE_EXTRA_CA_CERTS: fileURLToPath(new URL('certs/russiantrusted.pem', import.meta.url)) },
});
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
