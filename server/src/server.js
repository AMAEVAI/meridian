import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { spawn } from 'node:child_process';

import { SERVER_PORT, AGY_BIN } from './config.js';
import { ProfileManager } from './pool/profileManager.js';
import { QuotaMonitor } from './pool/quotaMonitor.js';
import { AccountRouter } from './pool/accountRouter.js';
import { WorkspaceManager } from './workspace/workspaceManager.js';
import { DevRunner } from './workspace/devRunner.js';
import { GitService } from './git/gitService.js';
import { VibeAgent } from './agent/vibeAgent.js';

export function createServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/chat' });

  app.use(cors());
  app.use(express.json());

  // Initialize subsystems
  const profileManager = new ProfileManager();
  const quotaMonitor = new QuotaMonitor({ profileManager });
  const accountRouter = new AccountRouter();
  const workspaceManager = new WorkspaceManager();
  const devRunner = new DevRunner();
  const gitService = new GitService();
  const vibeAgent = new VibeAgent({ profileManager, quotaMonitor, accountRouter, workspaceManager });

  // 1. Profiles & Quota Endpoints
  app.get('/api/profiles', async (req, res) => {
    try {
      const profiles = profileManager.listProfiles();
      const quotas = await quotaMonitor.getAllQuotas(profiles);
      const data = profiles.map(p => ({
        ...p,
        quota: quotas[p.id] || { gemini5h: 0, geminiWeekly: 0 },
        isCoolingDown: accountRouter.isCoolingDown(p.id)
      }));
      res.json({ profiles: data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/profiles/:id/toggle', (req, res) => {
    try {
      const { id } = req.params;
      const current = profileManager.getProfile(id);
      if (!current) return res.status(404).json({ error: 'Profile not found' });
      const updated = profileManager.updateProfile(id, { isActive: !current.isActive });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/profiles/:id/auth', (req, res) => {
    try {
      const { id } = req.params;
      if (id === 'profile_1') {
        return res.json({ success: true, message: 'Profile 1 is your primary active Google account and is already authenticated!' });
      }
      res.json({ success: true, message: `To connect profile ${id}, please run in terminal: agy --config-dir ~/.meridian-studio/profiles/${id}` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Project & Workspace Endpoints
  app.get('/api/projects', (req, res) => {
    try {
      const projects = workspaceManager.listProjects();
      const enriched = projects.map(p => ({
        ...p,
        devStatus: devRunner.getStatus(p.id)
      }));
      res.json({ projects: enriched });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/projects', (req, res) => {
    try {
      const { name, template } = req.body;
      const project = workspaceManager.createProject(name, template || 'vanilla-html');
      res.json(project);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/projects/:id/files', (req, res) => {
    try {
      const files = workspaceManager.listFiles(req.params.id);
      res.json({ files });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/projects/:id/files/content', (req, res) => {
    try {
      const { filePath } = req.query;
      if (!filePath) return res.status(400).json({ error: 'filePath query param is required' });
      const content = workspaceManager.readFile(req.params.id, String(filePath));
      res.json({ content });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/projects/:id/files', (req, res) => {
    try {
      const { filePath, content } = req.body;
      workspaceManager.writeFile(req.params.id, filePath, content);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Dev Server & Preview Runner
  app.post('/api/projects/:id/preview/start', async (req, res) => {
    try {
      const projectPath = workspaceManager.getProjectPath(req.params.id);
      const runner = await devRunner.start(req.params.id, projectPath);
      res.json(runner);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/projects/:id/preview/stop', (req, res) => {
    try {
      devRunner.stop(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Git Endpoints
  app.get('/api/projects/:id/git/status', async (req, res) => {
    try {
      const projectPath = workspaceManager.getProjectPath(req.params.id);
      const status = await gitService.getStatus(projectPath);
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/projects/:id/git/commit', async (req, res) => {
    try {
      const { message, push, token, remote, branch } = req.body;
      const projectPath = workspaceManager.getProjectPath(req.params.id);
      await gitService.commit(projectPath, message || 'Update from Vibe-Coding Studio');
      if (push) {
        await gitService.push(projectPath, remote || 'origin', branch || 'main', token);
      }
      res.json({ success: true, message: 'Committed successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. WebSocket Chat for Vibe Coding
  wss.on('connection', (ws) => {
    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'prompt') {
          const { projectId, prompt, model } = msg;

          await vibeAgent.run({
            projectId,
            prompt,
            model: model || 'gemini-3.8-flash-high',
            onStatus: (status) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'status', ...status }));
              }
            },
            onChunk: (chunk) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'chunk', chunk }));
              }
            },
            onTool: (tool) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'tool', ...tool }));
              }
            }
          });

          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'done' }));
          }
        }
      } catch (err) {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'error', message: err.message }));
        }
      }
    });
  });

  return { app, server, wss, devRunner };
}

// Start standalone if executed directly
if (process.argv[1]?.endsWith('server.js')) {
  const { server } = createServer();
  server.listen(SERVER_PORT, '127.0.0.1', () => {
    console.log(`⚡ Meridian Studio Server listening on http://127.0.0.1:${SERVER_PORT}`);
  });
}
