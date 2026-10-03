# Design Specification: Antigravity Multi-Account Vibe-Coding Studio SaaS

**Date:** 2026-10-03  
**Status:** Approved by User  
**Target:** Local & Cloud-ready Personal SaaS Platform for Vibe Coding powered by pooled Google Antigravity Accounts.

---

## 1. Executive Summary

The **Antigravity Vibe-Coding Studio** is an all-in-one web-based software development platform (in the vein of Lovable, Bolt, and Cursor Web) powered by an automated, load-balanced pool of **5 Google AI / Antigravity accounts**. 

It eliminates quota exhaustion by intelligently rotating active sessions, monitoring 5-hour and weekly usage windows across accounts, seamlessly failing over during rate limits, providing a split-screen vibe-coding chat and live preview environment, and enabling one-click GitHub synchronization (branching, commits, and pushes).

---

## 2. Core Architecture

The system consists of three interconnected layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WEB UI (React / Next.js)                        │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │ Vibe-Coding Chat      │  │ Live App Preview (iframe) / File Tree  │ │
│  │ - Natural Language    │  │ - Automatic Port Proxying              │ │
│  │ - Diff Inspector      │  │ - Monaco / Code View                   │ │
│  └───────────────────────┘  └────────────────────────────────────────┘ │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │ 5-Account Quota HUD   │  │ GitHub Sync & Branch Manager           │ │
│  └───────────────────────┘  └────────────────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ WebSockets / REST API
┌───────────────────────────────────▼────────────────────────────────────┐
│                    STUDIO BACKEND ORCHESTRATOR                         │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │ Account Pool Router   │  │ Workspace & Dev Server Engine          │ │
│  │ - Least-Quota First   │  │ - Child process spawner (Vite, Next)   │ │
│  │ - Seamless Failover   │  │ - Live HMR Tunnel                      │ │
│  └───────────────────────┘  └────────────────────────────────────────┘ │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │ Git Integration       │  │ Antigravity Execution Bridge           │ │
│  │ - Clone, Commit, Push │  │ - Multi-session CLI / SDK Spawner      │ │
│  └───────────────────────┘  └────────────────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────┬───────────────┼───────────────┬───────────────┐
    │ Profile 1     │ Profile 2     │ Profile 3     │ Profile 4     │ Profile 5
 ┌──▼──────────┐ ┌──▼──────────┐ ┌──▼──────────┐ ┌──▼──────────┐ ┌──▼──────────┐
 │ Google AI #1│ │ Google AI #2│ │ Google AI #3│ │ Google AI #4│ │ Google AI #5│
 │ Quota: 20%  │ │ Quota: 0%   │ │ Quota: 45%  │ │ Quota: 10%  │ │ Quota: 0%   │
 └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 3. Subsystem Specifications

### 3.1 Multi-Account Pool & Load Balancer

1. **Storage & Isolation:**
   - Isolated profiles stored in `~/.meridian-studio/profiles/profile_{1..5}/`.
   - Each profile directory maintains independent state:
     - `settings.json` (strictly enforcing `useAiCredits: false` to prevent accidental billing).
     - Isolated credentials, authentication tokens, and conversation states.
2. **Account Onboarding:**
   - Browser-based OAuth flow triggered per slot from the UI.
   - Slot status indicators: `Unconfigured`, `Authenticating`, `Active`, `Cooling Down`, `Quota Exceeded`.
3. **Smart Quota Balancer:**
   - Polls active quota windows for each profile:
     - `gemini-5h` and `gemini-weekly`
     - `3p-5h` and `3p-weekly` (for Claude / third-party models)
   - Routing heuristic: **Least-Utilized Quota First** within the current 5-hour rolling window.
4. **Resilient Failover:**
   - If an active account receives HTTP 429, quota exhaustion, or temporary timeout, the orchestrator automatically swaps the execution context to the next available profile in the pool without failing the user's turn.

### 3.2 Vibe-Coding Studio UI & Execution Engine

1. **Dual-Pane Layout:**
   - **Left Pane: Agentic Chat & Tool Log**
     - Streaming conversational response.
     - Collapsible tool execution blocks (File Read, File Edit, Command Execution).
     - Visual side-by-side / inline diff viewer before and after changes.
     - Self-Healing loop: terminal build or runtime errors are automatically fed back into the agent to auto-fix code.
   - **Right Pane: Live Workspace**
     - Tab 1: **Preview** — Responsive iframe with device viewport toggles (Desktop, Tablet, Mobile) pointing to the running dev server.
     - Tab 2: **Code Editor** — Syntax-highlighted code editor for manual tweaks.
     - Tab 3: **Files** — Full project file explorer with search.
2. **Project Runtime Engine:**
   - Manages projects in `~/meridian-studio/workspaces/<project_id>/`.
   - Automatic detection of project stack (Vite, Next.js, SvelteKit, Static HTML, Python/Flask).
   - Starts dev servers on dynamically allocated local ports (e.g. 5175..5200) with websocket proxying to avoid port collision.

### 3.3 GitHub Integration & Version Control

1. **Authentication:**
   - Secure storage of GitHub Personal Access Token (PAT) with `repo` scope.
2. **Repository Operations:**
   - Clone remote repository into workspace.
   - Initialize new repository and push to GitHub.
   - Branch switching and new feature branch creation.
3. **AI-Powered Smart Commit & Push:**
   - Automatically computes git diffs.
   - Generates Conventional Commits message (e.g. `feat(auth): integrate google oauth button with ripple animation`).
   - One-click "Commit & Push" button to sync with GitHub remote origin.

---

## 4. Technology Stack

- **Frontend:** React 19 / Next.js, TailwindCSS / Custom Luxury Design System, Lucide Icons, Monaco Editor / CodeViewer.
- **Backend:** Node.js (v22+), Express / Next.js Server Actions, WebSockets (`ws`) for streaming agent outputs.
- **Orchestration & VCS:** Antigravity CLI (`agy`) child process manager, `simple-git`, dynamic port allocator (`get-port`).
- **Data Persistence:** SQLite (`better-sqlite3`) for project metadata, chat history, account quota logs.

---

## 5. Security & Safety

- **Local-First Isolation:** All tokens, API keys, and workspace files reside on the user's local disk; no third-party telemetry.
- **Quota Safeguard:** Antigravity CLI forced to `useAiCredits: false` to eliminate accidental credit spend beyond subscription allowances.
- **Process Sandboxing:** Child execution runs strictly scoped within the active project directory.

---

## 6. Implementation Milestones

1. **Milestone 1: Backend Foundation & Multi-Account Router**
   - Profile isolation directories (`profile_1` through `profile_5`).
   - CLI wrapper with quota monitoring and automatic rotation.
2. **Milestone 2: Vibe-Coding Engine & Workspace Manager**
   - Project filesystem manager + dev server launcher (Vite/Next runner).
   - Agent tool execution pipeline (read, edit, bash, lint/build check).
3. **Milestone 3: Studio Web Application**
   - High-end split-screen UI (Chat, Iframe Preview, Quota HUD, File Tree).
   - WebSocket streaming integration.
4. **Milestone 4: GitHub Sync & Polishing**
   - GitHub PAT authentication, clone/branch/commit/push flows.
   - Self-healing error recovery and end-to-end testing.
