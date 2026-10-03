import net from 'node:net';
import express from 'express';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export class DevRunner {
  constructor() {
    this.activeServers = new Map(); // projectId -> { port, serverInstance, type: 'static'|'vite', proc }
  }

  async findFreePort(startPort = 5180) {
    let port = startPort;
    while (true) {
      const isAvailable = await new Promise(resolve => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
          server.close(() => resolve(true));
        });
        server.listen(port, '127.0.0.1');
      });

      if (isAvailable) return port;
      port++;
      if (port > 65535) throw new Error('No available ports found');
    }
  }

  async start(projectId, projectPath) {
    this.stop(projectId);

    const hasPackageJson = fs.existsSync(path.join(projectPath, 'package.json'));
    const port = await this.findFreePort(5180 + Math.floor(Math.random() * 50));

    if (hasPackageJson) {
      // Run npm run dev or vite
      const proc = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--host', '127.0.0.1'], {
        cwd: projectPath,
        env: { ...process.env, PORT: String(port) },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', d => stdout += d.toString());
      proc.stderr.on('data', d => stderr += d.toString());

      const url = `http://127.0.0.1:${port}`;
      this.activeServers.set(projectId, { port, url, type: 'vite', proc, getLogs: () => ({ stdout, stderr }) });
      return { port, url };
    } else {
      // Serve static files via Express
      const app = express();
      app.use(express.static(projectPath));
      
      const serverInstance = await new Promise((resolve) => {
        const server = app.listen(port, '127.0.0.1', () => resolve(server));
      });

      const url = `http://127.0.0.1:${port}`;
      this.activeServers.set(projectId, { port, url, type: 'static', serverInstance });
      return { port, url };
    }
  }

  stop(projectId) {
    const active = this.activeServers.get(projectId);
    if (!active) return false;

    if (active.serverInstance) {
      active.serverInstance.close();
    }
    if (active.proc) {
      active.proc.kill('SIGTERM');
    }
    this.activeServers.delete(projectId);
    return true;
  }

  getStatus(projectId) {
    const active = this.activeServers.get(projectId);
    if (!active) return { isRunning: false };
    return {
      isRunning: true,
      port: active.port,
      url: active.url,
      type: active.type
    };
  }
}
