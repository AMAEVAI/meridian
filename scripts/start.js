import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

console.log('⚡ Starting Meridian Studio (Multi-Account Antigravity Vibe-Coding Platform)...');

// 1. Start Server on port 4000 (with auto-watch)
const server = spawn('node', ['--watch', 'server/src/server.js'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, PORT: '4000' }
});

// 2. Start Client on port 3000
const client = spawn('npm', ['--prefix', 'client', 'run', 'dev'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env }
});

const cleanup = () => {
  console.log('\nShutting down Meridian Studio services...');
  server.kill('SIGTERM');
  client.kill('SIGTERM');
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
