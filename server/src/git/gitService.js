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
    try {
      await git.branch(['-M', 'main']);
    } catch {}
    return true;
  }

  // Normalize any repo URL (e.g. 'owner/repo', 'https://github.com/owner/repo', 'git@github.com:owner/repo.git')
  normalizeRepoUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let url = rawUrl.trim();
    // If entered as 'owner/repo'
    if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(url)) {
      return `https://github.com/${url}.git`;
    }
    // If missing .git at end of github.com url
    if (url.startsWith('https://github.com/') && !url.endsWith('.git')) {
      return `${url}.git`;
    }
    return url;
  }

  // Get web URL for browser (e.g. 'https://github.com/owner/repo')
  getWebUrl(repoUrl) {
    if (!repoUrl) return null;
    let clean = repoUrl.replace(/\.git$/, '');
    clean = clean.replace(/https:\/\/[^@]+@/, 'https://');
    clean = clean.replace(/^git@github\.com:/, 'https://github.com/');
    return clean;
  }

  // Mask token from URL for safe logging/display
  maskUrl(url) {
    if (!url) return null;
    return url.replace(/https:\/\/[^@]+@/, 'https://***@');
  }

  async getStatus(projectPath) {
    const isRepo = await this.isGitRepo(projectPath);
    if (!isRepo) {
      await this.init(projectPath);
    }

    const git = this.getGit(projectPath);
    const status = await git.status();

    // Get remotes
    let remotes = [];
    let remoteUrl = null;
    let webUrl = null;

    try {
      const rawRemotes = await git.getRemotes(true);
      remotes = rawRemotes.map(r => ({
        name: r.name,
        push: this.maskUrl(r.refs.push),
        fetch: this.maskUrl(r.refs.fetch),
        rawPush: r.refs.push
      }));
      const origin = rawRemotes.find(r => r.name === 'origin') || rawRemotes[0];
      if (origin && origin.refs.push) {
        remoteUrl = origin.refs.push.replace(/https:\/\/[^@]+@/, 'https://');
        webUrl = this.getWebUrl(remoteUrl);
      }
    } catch {}

    // Get latest commit
    let lastCommit = null;
    try {
      const log = await git.log({ maxCount: 1 });
      if (log && log.latest) {
        lastCommit = {
          hash: log.latest.hash.slice(0, 7),
          fullHash: log.latest.hash,
          message: log.latest.message,
          date: log.latest.date,
          author: log.latest.author_name
        };
      }
    } catch {}

    const modified = status.modified || [];
    const untracked = status.not_added || [];
    const deleted = status.deleted || [];
    const staged = status.staged || [];

    const totalChanges = modified.length + untracked.length + deleted.length;

    return {
      isRepo: true,
      branch: status.current || 'main',
      modified,
      untracked,
      deleted,
      staged,
      totalChanges,
      ahead: status.ahead || 0,
      behind: status.behind || 0,
      remotes,
      remoteUrl,
      webUrl,
      lastCommit
    };
  }

  async setRemote(projectPath, remoteName = 'origin', rawUrl) {
    if (!rawUrl) throw new Error('URL репозитория не указан');
    const cleanUrl = this.normalizeRepoUrl(rawUrl);

    const isRepo = await this.isGitRepo(projectPath);
    if (!isRepo) {
      await this.init(projectPath);
    }

    const git = this.getGit(projectPath);
    const remotes = await git.getRemotes(true);
    const exists = remotes.some(r => r.name === remoteName);

    if (exists) {
      await git.remote(['set-url', remoteName, cleanUrl]);
    } else {
      await git.addRemote(remoteName, cleanUrl);
    }

    return {
      success: true,
      remoteName,
      remoteUrl: cleanUrl,
      webUrl: this.getWebUrl(cleanUrl)
    };
  }

  async removeRemote(projectPath, remoteName = 'origin') {
    const isRepo = await this.isGitRepo(projectPath);
    if (!isRepo) return { success: true };
    const git = this.getGit(projectPath);
    try {
      await git.removeRemote(remoteName);
    } catch {}
    return { success: true };
  }

  async commit(projectPath, message = 'Update from BLACKBORZ AI Studio', author = 'BLACKBORZ AI <ai@blackborz.io>') {
    const isRepo = await this.isGitRepo(projectPath);
    if (!isRepo) {
      await this.init(projectPath);
    }

    const git = this.getGit(projectPath);
    
    // Ensure default branch is main
    try {
      await git.branch(['-M', 'main']);
    } catch {}

    // Stage all changes
    await git.add('-A');

    // Check if there are changes to commit
    const status = await git.status();
    if (status.staged.length === 0) {
      return {
        success: true,
        committed: false,
        message: 'Нет изменений для коммита'
      };
    }

    const commitResult = await git.commit(message, undefined, {
      '--author': author
    });

    return {
      success: true,
      committed: true,
      commitHash: commitResult.commit?.slice(0, 7) || 'HEAD',
      summary: commitResult.summary
    };
  }

  async push(projectPath, remote = 'origin', branch = 'main', token = null, remoteUrl = null) {
    const isRepo = await this.isGitRepo(projectPath);
    if (!isRepo) {
      await this.init(projectPath);
    }

    const git = this.getGit(projectPath);

    // If explicit remoteUrl passed, set it first
    if (remoteUrl) {
      await this.setRemote(projectPath, remote, remoteUrl);
    }

    // Check if remote exists
    const remotes = await git.getRemotes(true);
    const targetRemote = remotes.find(r => r.name === remote) || remotes[0];

    if (!targetRemote || !targetRemote.refs.push) {
      throw new Error('Удаленный репозиторий GitHub не привязан. Пожалуйста, укажите URL репозитория или создайте новый.');
    }

    const originalPushUrl = targetRemote.refs.push.replace(/https:\/\/[^@]+@/, 'https://');
    let authedUrl = originalPushUrl;

    if (token) {
      // Build token-authenticated URL
      authedUrl = originalPushUrl.replace('https://', `https://${encodeURIComponent(token.trim())}@`);
      await git.remote(['set-url', targetRemote.name, authedUrl]);
    }

    try {
      // Ensure branch name is main or target
      const currentStatus = await git.status();
      const currentBranch = currentStatus.current || branch || 'main';

      if (currentBranch !== branch) {
        try {
          await git.branch(['-M', branch]);
        } catch {}
      }

      // Execute push with --set-upstream to configure tracking
      const pushResult = await git.push(targetRemote.name, branch, ['--set-upstream']);
      
      return {
        success: true,
        branch,
        remote: targetRemote.name,
        webUrl: this.getWebUrl(originalPushUrl),
        remoteUrl: originalPushUrl,
        pushResult
      };
    } catch (err) {
      let msg = err.message || 'Ошибка при push в репозиторий';
      if (msg.includes('Authentication failed') || msg.includes('Invalid username or password') || msg.includes('403')) {
        msg = 'Ошибка аутентификации GitHub: проверьте правильность Personal Access Token (PAT) и наличие прав "repo".';
      } else if (msg.includes('Repository not found')) {
        msg = 'Репозиторий не найден. Убедитесь, что репозиторий создан на GitHub и токен имеет к нему доступ.';
      } else if (msg.includes('Updates were rejected because the remote contains work')) {
        msg = 'На GitHub есть изменения, которых нет локально. Сделайте Pull перед Push.';
      }
      throw new Error(msg);
    } finally {
      // Security: always restore clean URL without embedded token in .git/config
      try {
        await git.remote(['set-url', targetRemote.name, originalPushUrl]);
      } catch {}
    }
  }

  async pull(projectPath, remote = 'origin', branch = 'main', token = null) {
    const git = this.getGit(projectPath);
    const remotes = await git.getRemotes(true);
    const targetRemote = remotes.find(r => r.name === remote) || remotes[0];

    if (!targetRemote) {
      throw new Error('Удаленный репозиторий не настроен');
    }

    const originalPushUrl = targetRemote.refs.push.replace(/https:\/\/[^@]+@/, 'https://');
    if (token) {
      const authedUrl = originalPushUrl.replace('https://', `https://${encodeURIComponent(token.trim())}@`);
      await git.remote(['set-url', targetRemote.name, authedUrl]);
    }

    try {
      const pullResult = await git.pull(targetRemote.name, branch, ['--rebase']);
      return {
        success: true,
        summary: pullResult.summary
      };
    } finally {
      if (token) {
        try {
          await git.remote(['set-url', targetRemote.name, originalPushUrl]);
        } catch {}
      }
    }
  }

  // Verify GitHub PAT token using GitHub REST API
  async verifyGitHubToken(token) {
    if (!token || !token.trim()) {
      throw new Error('Токен не указан');
    }

    const cleanToken = token.trim();
    const res = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'BLACKBORZ-AI-Studio'
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Неверный или просроченный токен GitHub PAT');
      }
      throw new Error(`Ошибка проверки токена: ${res.statusText} (${res.status})`);
    }

    const user = await res.json();
    const scopesHeader = res.headers.get('x-oauth-scopes') || '';
    const scopes = scopesHeader.split(',').map(s => s.trim()).filter(Boolean);
    const hasRepoScope = scopes.includes('repo') || scopes.includes('public_repo');

    return {
      valid: true,
      user: {
        login: user.login,
        name: user.name || user.login,
        avatarUrl: user.avatar_url,
        htmlUrl: user.html_url,
        bio: user.bio,
        publicRepos: user.public_repos
      },
      scopes,
      hasRepoScope
    };
  }

  // Create repository on GitHub via REST API
  async createGitHubRepo(token, repoName, description = '', isPrivate = false) {
    if (!token || !token.trim()) throw new Error('Токен GitHub не указан');
    if (!repoName || !repoName.trim()) throw new Error('Название репозитория не указано');

    const cleanName = repoName.trim().replace(/[^a-zA-Z0-9_.-]/g, '-');
    const res = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'BLACKBORZ-AI-Studio'
      },
      body: JSON.stringify({
        name: cleanName,
        description: description || 'Created with BLACKBORZ AI Studio',
        private: Boolean(isPrivate),
        auto_init: false
      })
    });

    if (!res.ok) {
      let errorMsg = `Ошибка создания репозитория (${res.status})`;
      try {
        const errData = await res.json();
        if (errData.errors && errData.errors.length > 0) {
          errorMsg = errData.errors.map(e => e.message).join(', ');
        } else if (errData.message) {
          errorMsg = errData.message;
        }
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await res.json();
    return {
      success: true,
      name: data.name,
      fullName: data.full_name,
      htmlUrl: data.html_url,
      cloneUrl: data.clone_url,
      sshUrl: data.ssh_url,
      isPrivate: data.private
    };
  }
}
