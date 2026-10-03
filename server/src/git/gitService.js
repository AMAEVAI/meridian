import { simpleGit } from 'simple-git';
import fs from 'node:fs';
import path from 'node:path';

export class GitService {
  constructor() {}

  getGit(projectPath) {
    return simpleGit({ baseDir: projectPath, maxConcurrentProcesses: 2 });
  }

  formatCommitMessage(description, type = 'feat', scope = '') {
    const scopePart = scope ? `(${scope})` : '';
    return `${type}${scopePart}: ${description}`;
  }

  async isGitRepo(projectPath) {
    const gitDir = path.join(projectPath, '.git');
    return fs.existsSync(gitDir);
  }

  async init(projectPath) {
    const git = this.getGit(projectPath);
    await git.init();
    return true;
  }

  async getStatus(projectPath) {
    const isRepo = await this.isGitRepo(projectPath);
    if (!isRepo) {
      return { isRepo: false, branch: null, modified: [], untracked: [] };
    }

    const git = this.getGit(projectPath);
    const status = await git.status();
    return {
      isRepo: true,
      branch: status.current,
      modified: status.modified,
      untracked: status.not_added,
      staged: status.staged,
      ahead: status.ahead,
      behind: status.behind
    };
  }

  async commit(projectPath, message) {
    const isRepo = await this.isGitRepo(projectPath);
    if (!isRepo) {
      await this.init(projectPath);
    }
    const git = this.getGit(projectPath);
    await git.add('.');
    const result = await git.commit(message);
    return result;
  }

  async push(projectPath, remote = 'origin', branch = 'main', token = null) {
    const git = this.getGit(projectPath);
    // If token is provided, configure remote url with token
    if (token) {
      const remotes = await git.getRemotes(true);
      const origin = remotes.find(r => r.name === remote);
      if (origin && origin.refs.push) {
        let authUrl = origin.refs.push;
        if (authUrl.startsWith('https://') && !authUrl.includes('@')) {
          authUrl = authUrl.replace('https://', `https://${token}@`);
          await git.remote(['set-url', remote, authUrl]);
        }
      }
    }
    return await git.push(remote, branch);
  }

  async clone(url, targetPath, token = null) {
    let cloneUrl = url;
    if (token && cloneUrl.startsWith('https://') && !cloneUrl.includes('@')) {
      cloneUrl = cloneUrl.replace('https://', `https://${token}@`);
    }
    const git = simpleGit();
    return await git.clone(cloneUrl, targetPath);
  }
}
