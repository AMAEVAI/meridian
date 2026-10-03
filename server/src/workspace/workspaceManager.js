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
    const cleanId = String(projectId || 'project')
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '-');
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
      id: path.basename(projectPath),
      name: metadata.name || projectId,
      folderPath: projectPath,
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
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectMeta.name} • BLACKBORZ AI</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body class="bg-black text-neutral-100 min-h-screen flex items-center justify-center p-6 selection:bg-white selection:text-black">
  <div class="max-w-lg w-full p-8 rounded-3xl bg-neutral-950/80 border border-white/15 text-center shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl">
    <div class="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-950 border border-white/20 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
      <span class="text-xl font-black text-white tracking-wider">BB</span>
    </div>
    <h1 class="text-3xl font-black text-white tracking-tight mb-2">${projectMeta.name}</h1>
    <p class="text-neutral-400 mb-8 text-sm font-medium">Создано в BLACKBORZ AI • Папка в Загрузках</p>
    <div class="flex items-center justify-center gap-3">
      <button id="btn" class="px-6 py-3 rounded-full bg-white hover:bg-neutral-200 text-black font-bold text-sm transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)] active:scale-95 cursor-pointer">Тестовое действие</button>
    </div>
    <div id="output" class="mt-6 text-xs text-neutral-400 font-mono min-h-[20px]"></div>
  </div>
  <script src="script.js"></script>
</body>
</html>`, 'utf8');

        fs.writeFileSync(path.join(projectPath, 'style.css'), `* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;\n}\nbody {\n  background-color: #000000;\n}\n`, 'utf8');
        fs.writeFileSync(path.join(projectPath, 'script.js'), `let count = 0;\nconst btn = document.getElementById('btn');\nconst output = document.getElementById('output');\nif (btn) {\n  btn.addEventListener('click', () => {\n    count++;\n    output.textContent = \`Клик номер \${count} • Система работает штатно\`;\n  });\n}\n`, 'utf8');
      }
    }

    return {
      id: path.basename(projectPath),
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
      // Skip hidden folders and meridian app itself
      if (entry.name.startsWith('.') || entry.name === 'meridian') continue;
      
      const projectPath = path.join(this.workspacesDir, entry.name);
      const metaPath = path.join(projectPath, '.meridian', 'project.json');
      
      // ONLY include directories that have .meridian/project.json (BLACKBORZ AI projects)
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          projects.push({ ...meta, path: projectPath, folderName: entry.name });
        } catch {
          projects.push({ id: entry.name, name: entry.name, path: projectPath, folderName: entry.name });
        }
      }
    }

    return projects.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  }

  deleteProject(projectId) {
    const projectPath = this.getProjectPath(projectId);
    if (!projectPath.startsWith(this.workspacesDir)) {
      throw new Error('Access denied');
    }
    if (fs.existsSync(projectPath)) {
      // Remove directory
      fs.rmSync(projectPath, { recursive: true, force: true });
      return true;
    }
    return false;
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
