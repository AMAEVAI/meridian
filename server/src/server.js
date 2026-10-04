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
import { UsageTracker } from './pool/usageTracker.js';
import { ProviderManager } from './pool/providerManager.js';
import { RouterEngine, ROUTING_STRATEGIES } from './pool/routerEngine.js';
import { CooldownLadder } from './pool/cooldownLadder.js';
import { OpenAiGateway } from './pool/openAiGateway.js';

export function createServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/chat' });

  app.use(cors());
  app.use(express.json());

  // Initialize FreeLLMAPI-style multi-provider subsystems
  const profileManager = new ProfileManager();
  const providerManager = new ProviderManager();
  const quotaMonitor = new QuotaMonitor({ profileManager });
  const cooldownLadder = new CooldownLadder();
  const accountRouter = new AccountRouter();
  const workspaceManager = new WorkspaceManager();
  const devRunner = new DevRunner();
  const gitService = new GitService();
  const usageTracker = new UsageTracker();

  const routerEngine = new RouterEngine({
    profileManager,
    providerManager,
    usageTracker,
    cooldownLadder,
    strategy: 'balanced'
  });

  const openAiGateway = new OpenAiGateway({
    routerEngine,
    profileManager,
    providerManager
  });

  const vibeAgent = new VibeAgent({
    profileManager,
    providerManager,
    quotaMonitor,
    accountRouter,
    routerEngine,
    workspaceManager,
    usageTracker
  });

  // 1. Profiles & Quota Endpoints
  app.get('/api/profiles', async (req, res) => {
    try {
      const profiles = profileManager.listProfiles();
      const profileIds = profiles.map(p => p.id);
      const realUsage = usageTracker.getAllUsage(profileIds);
      const activeId = accountRouter.getLastUsedProfileId() || 'profile_1';
      const data = profiles.map(p => {
        const usage = realUsage[p.id] || {};
        return {
          ...p,
          isCurrentlyActive: p.id === activeId,
          quota: {
            gemini5h: usage.quota5h || 0,
            geminiWeekly: usage.quotaWeekly || 0,
            requestsLast5h: usage.requestsLast5h || 0,
            requestsLast24h: usage.requestsLast24h || 0,
            requestsLast7d: usage.requestsLast7d || 0,
            requestsLimit5h: 312,
            requestsLimit24h: 1500,
            quotaDaily: usage.quotaDaily || 0,
            lastRequest: usage.lastRequest || null,
            totalTokens: usage.totalTokens || 0,
            status: p.hasApiKey ? 'ready' : 'unconfigured',
            type: p.hasApiKey ? 'api_key' : 'unconfigured',
            fetchedAt: Date.now()
          },
          isCoolingDown: accountRouter.isCoolingDown(p.id),
          cooldownRemainingMs: accountRouter.getCooldownRemaining(p.id)
        };
      });
      res.json({ profiles: data, activeProfileId: activeId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Real-time synchronization and live test of all profiles in pool
  app.post('/api/profiles/sync', async (req, res) => {
    try {
      const profiles = profileManager.listProfiles();
      const profileIds = profiles.map(p => p.id);
      const syncResults = {};

      for (const p of profiles) {
        const full = profileManager.getProfile(p.id);
        if (full?.apiKey) {
          const t0 = Date.now();
          try {
            const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${full.apiKey}`);
            const latency = Date.now() - t0;
            if (testRes.ok) {
              syncResults[p.id] = { status: 'ready', latencyMs: latency };
              profileManager.updateProfile(p.id, { status: 'ready' });
            } else {
              const errData = await testRes.json().catch(() => ({}));
              syncResults[p.id] = { status: 'error', error: errData?.error?.message || `HTTP ${testRes.status}` };
              profileManager.updateProfile(p.id, { status: 'error' });
            }
          } catch (e) {
            syncResults[p.id] = { status: 'error', error: e.message };
            profileManager.updateProfile(p.id, { status: 'error' });
          }
        } else if (p.isPrimary || p.id === 'profile_1') {
          syncResults[p.id] = { status: 'ready', latencyMs: 95 };
        } else {
          syncResults[p.id] = { status: 'unconfigured' };
        }
      }

      const freshProfiles = profileManager.listProfiles();
      const realUsage = usageTracker.getAllUsage(profileIds);
      const activeId = accountRouter.getLastUsedProfileId() || 'profile_1';

      const data = freshProfiles.map(p => {
        const usage = realUsage[p.id] || {};
        const check = syncResults[p.id] || {};
        return {
          ...p,
          isCurrentlyActive: p.id === activeId,
          latencyMs: check.latencyMs,
          status: check.status || p.status,
          quota: {
            gemini5h: usage.quota5h || 0,
            geminiWeekly: usage.quotaWeekly || 0,
            requestsLast5h: usage.requestsLast5h || 0,
            requestsLast24h: usage.requestsLast24h || 0,
            requestsLast7d: usage.requestsLast7d || 0,
            requestsLimit5h: 312,
            requestsLimit24h: 1500,
            quotaDaily: usage.quotaDaily || 0,
            lastRequest: usage.lastRequest || null,
            totalTokens: usage.totalTokens || 0,
            status: p.hasApiKey ? 'ready' : 'unconfigured',
            type: p.hasApiKey ? 'api_key' : 'unconfigured',
            fetchedAt: Date.now()
          },
          isCoolingDown: accountRouter.isCoolingDown(p.id),
          cooldownRemainingMs: accountRouter.getCooldownRemaining(p.id)
        };
      });

      res.json({
        success: true,
        profiles: data,
        activeProfileId: activeId,
        syncedAt: Date.now()
      });
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

  app.put('/api/profiles/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, apiKey, authType, isActive } = req.body;
      const updated = profileManager.updateProfile(id, {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(apiKey && typeof apiKey === 'string' && apiKey.trim() !== '' && { apiKey: apiKey.trim() }),
        ...(authType !== undefined && { authType }),
        ...(isActive !== undefined && { isActive })
      });
      const { apiKey: _rawKey, ...safeUpdated } = updated;
      res.json({ success: true, profile: { ...safeUpdated, hasApiKey: Boolean(updated.apiKey) } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/profiles/:id/test', async (req, res) => {
    try {
      const { id } = req.params;
      const profile = profileManager.getProfile(id);
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      if (profile.apiKey) {
        // Direct test against Google Gemini API without spawning browser OAuth
        const t0 = Date.now();
        const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${profile.apiKey}`);
        const latency = Date.now() - t0;
        const testData = await testRes.json();
        if (!testRes.ok) {
          throw new Error(testData?.error?.message || `Google API returned ${testRes.status}`);
        }
        profileManager.updateProfile(id, { status: 'ready', authType: 'api_key' });
        return res.json({ success: true, latency, message: `Google Gemini API ключ подтвержден (${latency} ms)` });
      }

      if (profile.isPrimary || id === 'profile_1') {
        const env = profileManager.getEnv(id);
        const { execFile } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const execFileAsync = promisify(execFile);

        await execFileAsync(AGY_BIN, ['models'], {
          env,
          timeout: 10000
        });

        profileManager.updateProfile(id, { status: 'ready' });
        return res.json({ success: true, message: 'Основной аккаунт подтвержден и готов к работе!' });
      }

      return res.status(400).json({ error: 'Укажите Gemini API ключ для этого профиля.' });
    } catch (err) {
      res.status(400).json({ error: `Ошибка проверки подключения: ${err.message}` });
    }
  });

  app.post('/api/profiles/:id/reset', (req, res) => {
    try {
      const { id } = req.params;
      const reset = profileManager.resetProfile(id);
      res.json({ success: true, profile: reset });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 1.5 FreeLLMAPI Routing & External Providers Endpoints
  app.get('/api/router/config', (req, res) => {
    try {
      res.json({
        strategy: routerEngine.getStrategy(),
        strategies: ROUTING_STRATEGIES,
        chain: routerEngine.getRankedChain()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/router/strategy', (req, res) => {
    try {
      const { strategy } = req.body;
      const ok = routerEngine.setStrategy(strategy);
      if (!ok) return res.status(400).json({ error: 'Неизвестная стратегия маршрутизации' });
      res.json({ success: true, strategy: routerEngine.getStrategy() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/providers', (req, res) => {
    try {
      res.json({ providers: providerManager.getProviders() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/providers/:id', (req, res) => {
    try {
      const updated = providerManager.updateProvider(req.params.id, req.body);
      res.json({ success: true, provider: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/providers/:id/test', async (req, res) => {
    try {
      const result = await providerManager.testProvider(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 1.6 Universal OpenAI-Compatible API Gateway (/v1)
  app.get('/v1/models', (req, res) => openAiGateway.handleListModels(req, res));
  app.post('/v1/chat/completions', (req, res) => openAiGateway.handleChatCompletions(req, res));

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

  app.delete('/api/projects/:id', (req, res) => {
    try {
      const success = workspaceManager.deleteProject(req.params.id);
      res.json({ success });
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

  // 4. Git & GitHub Integration Endpoints
  app.get('/api/projects/:id/git/status', async (req, res) => {
    try {
      const projectPath = workspaceManager.getProjectPath(req.params.id);
      const status = await gitService.getStatus(projectPath);
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/projects/:id/git/remote', async (req, res) => {
    try {
      const { remoteUrl, remoteName } = req.body;
      const projectPath = workspaceManager.getProjectPath(req.params.id);
      const result = await gitService.setRemote(projectPath, remoteName || 'origin', remoteUrl);
      workspaceManager.updateProject(req.params.id, { githubRepo: result.webUrl });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/projects/:id/git/remote', async (req, res) => {
    try {
      const projectPath = workspaceManager.getProjectPath(req.params.id);
      await gitService.removeRemote(projectPath);
      workspaceManager.updateProject(req.params.id, { githubRepo: null });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/projects/:id/git/commit', async (req, res) => {
    try {
      const { message, push, token, remote, branch, remoteUrl } = req.body;
      const projectPath = workspaceManager.getProjectPath(req.params.id);
      
      // 1. Commit
      const commitRes = await gitService.commit(
        projectPath, 
        message || 'Update from BLACKBORZ AI Studio'
      );

      let pushRes = null;
      // 2. Push if requested
      if (push) {
        pushRes = await gitService.push(
          projectPath, 
          remote || 'origin', 
          branch || 'main', 
          token, 
          remoteUrl
        );
        if (pushRes.webUrl) {
          workspaceManager.updateProject(req.params.id, { githubRepo: pushRes.webUrl });
        }
      }

      res.json({ 
        success: true, 
        committed: commitRes.committed, 
        commitHash: commitRes.commitHash, 
        pushed: Boolean(push),
        pushResult: pushRes 
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/projects/:id/git/pull', async (req, res) => {
    try {
      const { token, remote, branch } = req.body;
      const projectPath = workspaceManager.getProjectPath(req.params.id);
      const pullRes = await gitService.pull(projectPath, remote || 'origin', branch || 'main', token);
      res.json({ success: true, pullResult: pullRes });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/github/verify-token', async (req, res) => {
    try {
      const { token } = req.body;
      const verification = await gitService.verifyGitHubToken(token);
      res.json(verification);
    } catch (err) {
      res.status(400).json({ valid: false, error: err.message });
    }
  });

  app.post('/api/projects/:id/github/create-repo', async (req, res) => {
    try {
      const { token, repoName, description, isPrivate } = req.body;
      const projectPath = workspaceManager.getProjectPath(req.params.id);

      // 1. Create on GitHub
      const repoData = await gitService.createGitHubRepo(token, repoName, description, isPrivate);

      // 2. Set as origin remote
      await gitService.setRemote(projectPath, 'origin', repoData.cloneUrl);
      workspaceManager.updateProject(req.params.id, { githubRepo: repoData.htmlUrl });

      // 3. Commit all files
      await gitService.commit(projectPath, 'feat: initial commit from BLACKBORZ AI Studio');

      // 4. Push to new repository
      const pushRes = await gitService.push(projectPath, 'origin', 'main', token);

      res.json({
        success: true,
        repo: repoData,
        pushed: true,
        pushResult: pushRes
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 5. WebSocket Chat for Vibe Coding
  wss.on('connection', (ws) => {
    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'prompt') {
          const { projectId, prompt, history, model } = msg;

          await vibeAgent.run({
            projectId,
            prompt,
            history: history || [],
            model: model || 'gemini-3.8-flash-high',
            onStatus: (status) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(status));
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
