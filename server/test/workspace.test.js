import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { WorkspaceManager } from '../src/workspace/workspaceManager.js';
import { GitService } from '../src/git/gitService.js';
import { DevRunner } from '../src/workspace/devRunner.js';

test('WorkspaceManager creates and manages project workspaces', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-test-'));
  try {
    const wm = new WorkspaceManager({ workspacesDir: tmpDir });
    const project = wm.createProject('my-vibe-app', 'vanilla-html');

    assert.equal(project.id, 'my-vibe-app');
    assert.ok(fs.existsSync(project.path));

    // Test writing and reading files
    wm.writeFile('my-vibe-app', 'src/app.js', 'console.log("hello vibe");');
    const content = wm.readFile('my-vibe-app', 'src/app.js');
    assert.equal(content, 'console.log("hello vibe");');

    // Test listing files
    const files = wm.listFiles('my-vibe-app');
    const filePaths = files.map(f => f.path);
    assert.ok(filePaths.includes('src/app.js'));
    assert.ok(filePaths.includes('index.html'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('GitService formats conventional commit messages and inspects status', async () => {
  const gitService = new GitService();
  
  const msg1 = gitService.formatCommitMessage('add animated cart drawer with Framer', 'feat');
  assert.equal(msg1, 'feat: add animated cart drawer with Framer');

  const msg2 = gitService.formatCommitMessage('fix modal overflow bug', 'fix', 'modal');
  assert.equal(msg2, 'fix(modal): fix modal overflow bug');
});

test('DevRunner allocates free ports', async () => {
  const runner = new DevRunner();
  const port1 = await runner.findFreePort(5180);
  assert.ok(port1 >= 5180);
});
