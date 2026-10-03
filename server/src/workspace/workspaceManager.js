import fs from 'node:fs';
import path from 'node:path';
import { WORKSPACES_DIR } from '../config.js';

export class WorkspaceManager {
  constructor(options = {}) {
    this.workspacesDir = options.workspacesDir || WORKSPACES_DIR;
    this.init();
  }

  init() {
    if (!fs.existsSync(this.workspacesDir)) {
      fs.mkdirSync(this.workspacesDir, { recursive: true });
    }
  }

  getProjectPath(projectId) {
    // Sanitize projectId
    const cleanId = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.workspacesDir, cleanId);
  }

  createProject(projectId, template = 'vanilla-html', metadata = {}) {
    const projectPath = this.getProjectPath(projectId);
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    const metaDir = path.join(projectPath, '.meridian');
    if (!fs.existsSync(metaDir)) {
      fs.mkdirSync(metaDir, { recursive: true });
    }

    const projectMeta = {
      id: projectId,
      name: metadata.name || projectId,
      template,
      githubRepo: metadata.githubRepo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...metadata
    };
    fs.writeFileSync(path.join(metaDir, 'project.json'), JSON.stringify(projectMeta, null, 2), 'utf8');

    // Scaffold starter template files if directory is empty
    const existing = fs.readdirSync(projectPath).filter(f => f !== '.meridian');
    if (existing.length === 0) {
      if (template === 'vanilla-html') {
        fs.writeFileSync(path.join(projectPath, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectMeta.name}</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6">
  <div class="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center shadow-2xl">
    <h1 class="text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent mb-4">${projectMeta.name}</h1>
    <p class="text-slate-300 mb-6 font-medium">BLACKBORZ AI • Autonomous Engineering Engine</p>
    <button id="btn" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium transition-all shadow-lg shadow-indigo-500/20 active:scale-95">Interact with me</button>
    <div id="output" class="mt-4 text-sm text-indigo-300 font-mono"></div>
  </div>
  <script src="script.js"></script>
</body>
</html>`, 'utf8');

        fs.writeFileSync(path.join(projectPath, 'style.css'), `/* Custom styles */\nbody { font-family: system-ui, -apple-system, sans-serif; }\n`, 'utf8');
        fs.writeFileSync(path.join(projectPath, 'script.js'), `let count = 0;\ndocument.getElementById('btn').addEventListener('click', () => {\n  count++;\n  document.getElementById('output').textContent = 'Clicked ' + count + ' times!';\n});\n`, 'utf8');
      }
    }

    return {
      id: projectId,
      path: projectPath,
      ...projectMeta
    };
  }

  listProjects() {
    if (!fs.existsSync(this.workspacesDir)) return [];
    const entries = fs.readdirSync(this.workspacesDir, { withFileTypes: true });
    const projects = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const projectPath = path.join(this.workspacesDir, entry.name);
      const metaPath = path.join(projectPath, '.meridian', 'project.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          projects.push({ ...meta, path: projectPath });
        } catch {
          projects.push({ id: entry.name, name: entry.name, path: projectPath });
        }
      } else {
        projects.push({ id: entry.name, name: entry.name, path: projectPath });
      }
    }
    return projects;
  }

  listFiles(projectId, subDir = '') {
    const projectPath = this.getProjectPath(projectId);
    const targetDir = path.join(projectPath, subDir);
    if (!fs.existsSync(targetDir)) return [];

    const results = [];
    const walk = (dir, rel) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.name === '.git' || item.name === 'node_modules' || item.name === '.meridian') continue;
        const itemRel = path.join(rel, item.name);
        const itemAbs = path.join(dir, item.name);
        if (item.isDirectory()) {
          results.push({ name: item.name, path: itemRel, isDir: true });
          walk(itemAbs, itemRel);
        } else {
          results.push({ name: item.name, path: itemRel, isDir: false, size: fs.statSync(itemAbs).size });
        }
      }
    };

    walk(targetDir, subDir);
    return results;
  }

  readFile(projectId, relPath) {
    const projectPath = this.getProjectPath(projectId);
    const absPath = path.join(projectPath, relPath);
    // Security check to avoid path traversal
    if (!absPath.startsWith(projectPath)) {
      throw new Error('Access denied: path traversal attempt');
    }
    return fs.readFileSync(absPath, 'utf8');
  }

  writeFile(projectId, relPath, content) {
    const projectPath = this.getProjectPath(projectId);
    const absPath = path.join(projectPath, relPath);
    if (!absPath.startsWith(projectPath)) {
      throw new Error('Access denied: path traversal attempt');
    }
    const dir = path.dirname(absPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(absPath, content, 'utf8');
    return true;
  }

  deleteFile(projectId, relPath) {
    const projectPath = this.getProjectPath(projectId);
    const absPath = path.join(projectPath, relPath);
    if (!absPath.startsWith(projectPath)) {
      throw new Error('Access denied: path traversal attempt');
    }
    if (fs.existsSync(absPath)) {
      fs.rmSync(absPath, { recursive: true, force: true });
      return true;
    }
    return false;
  }
}
