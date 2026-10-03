# Antigravity Multi-Account Vibe-Coding Studio SaaS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete personal SaaS platform for vibe coding, featuring a multi-account pool of 5 Google Antigravity profiles with intelligent quota load-balancing, a split-screen web IDE with live iframe preview and self-healing error recovery, and seamless GitHub synchronization.

**Architecture:** Node.js/Express backend managing isolated Antigravity CLI profile environments, local dev servers, and git commands via WebSockets and REST APIs, paired with a React 19/Vite modern web studio with Monaco editor, live iframe viewport toggles, and multi-profile HUD.

**Tech Stack:** Node.js 22+, Express, `ws` (WebSockets), `simple-git`, React 19, Vite, TailwindCSS / Custom Luxury Design System, Monaco Editor, Lucide Icons, `better-sqlite3`.

## Global Constraints
- Target directory: `/Users/blackborz/Downloads/meridian`
- Node.js runtime: v22.23.2+
- Profiles directory: `~/.meridian-studio/profiles/profile_{1..5}`
- Workspaces directory: `~/meridian-studio/workspaces/`
- Every Antigravity profile must enforce `useAiCredits: false` in `settings.json`
- Strict error handling with automatic fallback between profiles on HTTP 429 / quota exhaustion

---

### Task 1: Multi-Account Pool & Quota Load Balancer

**Files:**
- Create: `server/src/config.js`
- Create: `server/src/pool/profileManager.js`
- Create: `server/src/pool/quotaMonitor.js`
- Create: `server/src/pool/accountRouter.js`
- Test: `server/test/pool.test.js`

**Interfaces:**
- `ProfileManager.getProfiles()`: returns `Array<Profile>`
- `ProfileManager.ensureProfile(id)`: initializes directory, settings.json, tokens
- `QuotaMonitor.getProfileQuota(profileId)`: returns `{ gemini5h: number, geminiWeekly: number, other5h: number, otherWeekly: number }`
- `AccountRouter.selectBestProfile()`: returns `Profile` with lowest utilization
- `AccountRouter.executeTurn({ prompt, model, systemPrompt, onChunk })`: handles streaming execution with automatic failover

- [ ] **Step 1: Write unit tests for profileManager and accountRouter**
  - Verify initialization of 5 isolated profile paths.
  - Verify `settings.json` creation with `useAiCredits: false`.
  - Verify selection heuristic picks profile with lowest 5h quota usage.
  - Verify failover on simulated 429 error.

- [ ] **Step 2: Run test to verify it fails**
  - Run `node --test server/test/pool.test.js`.

- [ ] **Step 3: Implement ProfileManager and QuotaMonitor**
  - Implement directory management in `~/.meridian-studio/profiles/profile_{1..5}`.
  - Implement CLI invocation with isolated `AGY_HOME` / state directories.
  - Implement parsing of `agy -p /usage --output-format json` and `agy -p /config`.

- [ ] **Step 4: Implement AccountRouter with Failover**
  - Least-utilized quota first algorithm.
  - Error catcher for quota exhaustion / rate limit triggers automatic retry on next healthiest profile.

- [ ] **Step 5: Run tests and verify they pass**
  - Run `node --test server/test/pool.test.js`.

- [ ] **Step 6: Commit Task 1**
  - Git commit: `feat(pool): implement multi-account antigravity router and quota balancer`.

---

### Task 2: Workspace Management, Dev Runner & Git Service

**Files:**
- Create: `server/src/workspace/workspaceManager.js`
- Create: `server/src/workspace/devRunner.js`
- Create: `server/src/git/gitService.js`
- Test: `server/test/workspace.test.js`

**Interfaces:**
- `WorkspaceManager.createProject(name, template)`: returns `projectPath`
- `WorkspaceManager.listFiles(projectId)`: returns file tree
- `WorkspaceManager.readFile(projectId, path)` / `writeFile(projectId, path, content)`
- `DevRunner.start(projectId)`: allocates port, spawns dev server, returns `port` & `url`
- `DevRunner.stop(projectId)`
- `GitService.clone(url, targetPath, token)`
- `GitService.status(projectPath)`: returns `{ modified: [], untracked: [], branch: string }`
- `GitService.commitAndPush(projectPath, message, token)`

- [ ] **Step 1: Write unit tests for WorkspaceManager and GitService**
  - Test project creation, reading/writing files, git status detection.

- [ ] **Step 2: Run test to verify it fails**
  - Run `node --test server/test/workspace.test.js`.

- [ ] **Step 3: Implement WorkspaceManager and DevRunner**
  - Project directory management in `~/meridian-studio/workspaces/`.
  - Process spawner with stdout/stderr capture for self-healing error detection.
  - Free port allocation using `net.createServer`.

- [ ] **Step 4: Implement GitService**
  - Wrap `simple-git` for clone, branch, commit, push with authentication headers.
  - Auto-commit message formatting.

- [ ] **Step 5: Run tests and verify they pass**
  - Run `node --test server/test/workspace.test.js`.

- [ ] **Step 6: Commit Task 2**
  - Git commit: `feat(workspace): implement project workspace manager, dev runner, and git service`.

---

### Task 3: Vibe-Coding Agent Loop & WebSocket Server

**Files:**
- Create: `server/src/agent/vibeAgent.js`
- Create: `server/src/server.js`
- Test: `server/test/server.test.js`

**Interfaces:**
- `VibeAgent.run({ projectId, prompt, ws })`: parses tools (file edits, bash execution, error self-healing), streams tokens to WebSocket client.
- REST endpoints:
  - `GET /api/profiles`: list 5 profiles with live quotas
  - `POST /api/profiles/:id/auth`: trigger OAuth login for slot
  - `GET /api/projects`: list workspaces
  - `POST /api/projects`: create or clone project
  - `POST /api/git/commit`: commit & push
- WebSocket: `/ws/chat` for bidirectional streaming agent communication.

- [ ] **Step 1: Write integration tests for API and WebSocket**
  - Test `/api/profiles` endpoint structure.
  - Test WebSocket message protocol (`prompt`, `chunk`, `tool_call`, `diff`, `done`).

- [ ] **Step 2: Run test to verify it fails**
  - Run `node --test server/test/server.test.js`.

- [ ] **Step 3: Implement VibeAgent logic**
  - Parse tool requests (read_file, write_file, execute_command).
  - Generate clean unified diffs for the UI.
  - Error feedback: if a command fails or TypeScript error occurs, immediately feed back into agent.

- [ ] **Step 4: Implement Express & WebSocket Server**
  - Express app with cors, json body parser, dynamic proxying for dev server iframes.
  - Attach WebSocket server for real-time agent turns.

- [ ] **Step 5: Run tests and verify they pass**
  - Run `node --test server/test/server.test.js`.

- [ ] **Step 6: Commit Task 3**
  - Git commit: `feat(server): build vibe-coding agent loop, REST API, and websocket server`.

---

### Task 4: Modern Web Studio Frontend (React 19 / Vite)

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.ts`
- Create: `client/src/index.css`
- Create: `client/src/App.tsx`
- Create: `client/src/components/Header.tsx` (Repo badge, Active Account HUD, Commit button)
- Create: `client/src/components/ChatPanel.tsx` (Streaming message history, Diff view, prompt bar)
- Create: `client/src/components/PreviewPanel.tsx` (Responsive iframe viewport, reload, dev console)
- Create: `client/src/components/AccountPoolModal.tsx` (5 accounts with quota gauges, add account button)
- Create: `client/src/components/GitHubModal.tsx` (PAT token, repo picker, branch selector)
- Create: `client/src/components/FileTree.tsx`

- [ ] **Step 1: Scaffold Vite client application**
  - Initialize client with React 19, TypeScript, Lucide Icons.
  - Setup Tailwind / Luxury Dark Design System in `client/src/index.css`.

- [ ] **Step 2: Build Header & Account Pool HUD**
  - Display quota meters for all 5 accounts (Gemini-Weekly, Gemini-5h).
  - Modal to authenticate each Google account via OAuth browser flow.

- [ ] **Step 3: Build Chat Panel with Diff Inspector**
  - WebSocket connection to `/ws/chat`.
  - Stream chunks with typing animation.
  - Collapsible tool execution blocks showing additions/deletions with syntax highlighting.

- [ ] **Step 4: Build Preview & Code Explorer**
  - Device frame switcher (100% desktop, 768px tablet, 375px mobile).
  - Iframe pointing to active project dev server.
  - Tab for file tree and inline code viewing.

- [ ] **Step 5: Build GitHub Integration Drawer**
  - Connect GitHub token, list user repos, select active repo, 1-click commit & push.

- [ ] **Step 6: Verify end-to-end flow in browser**
  - Start both server and client.
  - Verify live connection to Antigravity account pool.
  - Test vibe-coding prompt generating a real project.

- [ ] **Step 7: Commit Task 4**
  - Git commit: `feat(client): complete modern vibe-coding studio frontend`.
