import React, { useState, useEffect } from 'react';
import { 
  X, 
  GitBranch, 
  GitPullRequest, 
  GitCommit, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Lock, 
  Globe, 
  Sparkles, 
  RefreshCw, 
  Trash2, 
  Check, 
  Eye, 
  EyeOff, 
  ArrowUpRight, 
  Download,
  FolderGit2
} from 'lucide-react';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: any;
  gitStatus: any;
  onCommitPush: (commitData: any) => Promise<any>;
  isCommitting: boolean;
  onRefreshStatus?: () => void;
}

export function GitHubModal({
  isOpen,
  onClose,
  currentProject,
  gitStatus: initialGitStatus,
  onCommitPush,
  isCommitting,
  onRefreshStatus
}: GitHubModalProps) {
  // Token state
  const [token, setToken] = useState(() => 
    localStorage.getItem('blackborz_github_token') || 
    localStorage.getItem('meridian_github_token') || ''
  );
  const [showToken, setShowToken] = useState(false);
  const [githubUser, setGitHubUser] = useState<any>(null);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [tokenFeedback, setTokenFeedback] = useState<{ type: string; message: string } | null>(null);

  // Local live Git status
  const [gitStatus, setGitStatus] = useState<any>(initialGitStatus);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  // Remote Repository Linking state
  const [repoMode, setRepoMode] = useState<'link' | 'create'>('link');
  const [existingRepoUrl, setExistingRepoUrl] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [isPrivateRepo, setIsPrivateRepo] = useState(false);
  const [isSettingRemote, setIsSettingRemote] = useState(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);

  // Commit & Push state
  const [commitMessage, setCommitMessage] = useState('feat: update project via BLACKBORZ AI');
  const [targetBranch, setTargetBranch] = useState('main');
  const [isPulling, setIsPulling] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
    link?: string;
  } | null>(null);

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load live git status and verify token on open
  useEffect(() => {
    if (isOpen && currentProject?.id) {
      fetchStatus();
      if (token.trim()) {
        verifyToken(token.trim());
      }
      setNewRepoName(currentProject.name || currentProject.id || 'my-app');
      setActionFeedback(null);
    }
  }, [isOpen, currentProject?.id]);

  const fetchStatus = async () => {
    if (!currentProject?.id) return;
    setIsLoadingStatus(true);
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/git/status`);
      if (res.ok) {
        const data = await res.json();
        setGitStatus(data);
        if (data.branch) setTargetBranch(data.branch);
        if (data.remoteUrl && !existingRepoUrl) {
          setExistingRepoUrl(data.remoteUrl);
        }
      }
    } catch (err) {
      console.error('Failed to fetch git status', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Verify GitHub PAT
  const verifyToken = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) return;
    setIsVerifyingToken(true);
    setTokenFeedback(null);
    try {
      const res = await fetch('/api/github/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToVerify.trim() })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setGitHubUser(data.user);
        localStorage.setItem('blackborz_github_token', tokenToVerify.trim());
        setTokenFeedback({
          type: 'success',
          message: `Авторизован: @${data.user.login} (${data.user.name || ''})`
        });
      } else {
        setGitHubUser(null);
        setTokenFeedback({
          type: 'error',
          message: data.error || 'Неверный токен GitHub PAT'
        });
      }
    } catch (err: any) {
      setGitHubUser(null);
      setTokenFeedback({ type: 'error', message: err.message });
    } finally {
      setIsVerifyingToken(false);
    }
  };

  // Save token locally
  const handleSaveToken = () => {
    if (!token.trim()) {
      localStorage.removeItem('blackborz_github_token');
      setGitHubUser(null);
      setTokenFeedback(null);
      return;
    }
    verifyToken(token.trim());
  };

  // Link existing repository
  const handleLinkRemote = async () => {
    if (!existingRepoUrl.trim()) {
      setActionFeedback({ type: 'error', message: 'Введите URL репозитория GitHub' });
      return;
    }
    setIsSettingRemote(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/git/remote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remoteUrl: existingRepoUrl.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchStatus();
        if (onRefreshStatus) onRefreshStatus();
        setActionFeedback({
          type: 'success',
          message: `Репозиторий успешно привязан: ${data.webUrl}`,
          link: data.webUrl
        });
      } else {
        setActionFeedback({ type: 'error', message: data.error || 'Ошибка привязки репозитория' });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSettingRemote(false);
    }
  };

  // Unlink remote
  const handleUnlinkRemote = async () => {
    if (!confirm('Отвязать этот проект от удаленного GitHub репозитория?')) return;
    try {
      await fetch(`/api/projects/${currentProject.id}/git/remote`, { method: 'DELETE' });
      await fetchStatus();
      if (onRefreshStatus) onRefreshStatus();
      setExistingRepoUrl('');
      setActionFeedback({ type: 'success', message: 'Репозиторий успешно отвязан' });
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    }
  };

  // Create new repository on GitHub via API
  const handleCreateNewRepo = async () => {
    if (!token.trim()) {
      setActionFeedback({
        type: 'error',
        message: 'Для создания репозитория требуется GitHub Personal Access Token (PAT)'
      });
      return;
    }
    if (!newRepoName.trim()) {
      setActionFeedback({ type: 'error', message: 'Введите название нового репозитория' });
      return;
    }

    setIsCreatingRepo(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/github/create-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          repoName: newRepoName.trim(),
          description: `Created with BLACKBORZ AI Studio`,
          isPrivate: isPrivateRepo
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchStatus();
        if (onRefreshStatus) onRefreshStatus();
        setActionFeedback({
          type: 'success',
          message: `Репозиторий создан и опубликован на GitHub!`,
          link: data.repo.htmlUrl
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: data.error || 'Ошибка создания репозитория на GitHub'
        });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setIsCreatingRepo(false);
    }
  };

  // Pull from GitHub
  const handlePull = async () => {
    setIsPulling(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/git/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim() || undefined,
          branch: targetBranch
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchStatus();
        if (onRefreshStatus) onRefreshStatus();
        setActionFeedback({
          type: 'success',
          message: 'Изменения успешно загружены из GitHub (Pull завершен)!'
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: data.error || 'Ошибка выполнения git pull'
        });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setIsPulling(false);
    }
  };

  // Generate Smart AI commit message based on changed files
  const handleGenerateAiCommit = () => {
    const files = [...(gitStatus?.modified || []), ...(gitStatus?.untracked || [])];
    if (files.length === 0) {
      setCommitMessage('chore: synchronize workspace state');
      return;
    }

    if (files.some(f => f.includes('index.html') || f.includes('style.css'))) {
      setCommitMessage(`feat(ui): update visual styling and dark design layout`);
    } else if (files.some(f => f.includes('script.js') || f.includes('.js') || f.includes('.ts'))) {
      setCommitMessage(`feat(app): implement core logic and client interactions`);
    } else {
      setCommitMessage(`feat: update ${files.slice(0, 2).join(', ')}${files.length > 2 ? ` and ${files.length - 2} more` : ''}`);
    }
  };

  // Commit and Push
  const handleCommit = async () => {
    if (!gitStatus?.remoteUrl && !existingRepoUrl.trim()) {
      setActionFeedback({
        type: 'error',
        message: 'Не указан удаленный репозиторий GitHub. Пожалуйста, привяжите существующий репозиторий или создайте новый.'
      });
      return;
    }

    setActionFeedback(null);
    const result = await onCommitPush({
      message: commitMessage.trim() || 'Update from BLACKBORZ AI Studio',
      token: token.trim() || undefined,
      remoteUrl: existingRepoUrl.trim() || undefined,
      branch: targetBranch || 'main',
      push: true
    });

    if (result && result.success) {
      await fetchStatus();
      if (onRefreshStatus) onRefreshStatus();
      setActionFeedback({
        type: 'success',
        message: `Коммит ${result.commitHash || ''} успешно отправлен в GitHub!`,
        link: result.pushResult?.webUrl || gitStatus?.webUrl
      });
    } else if (result && result.error) {
      setActionFeedback({
        type: 'error',
        message: result.error
      });
    }
  };

  if (!isOpen) return null;

  const totalChanges = (gitStatus?.modified?.length || 0) + 
                       (gitStatus?.untracked?.length || 0) + 
                       (gitStatus?.deleted?.length || 0);

  const hasRemote = Boolean(gitStatus?.remoteUrl);

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 cursor-pointer animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-950 border border-white/15 w-full max-w-2xl rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden flex flex-col max-h-[92vh] cursor-default"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-950 border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] shrink-0">
              <FolderGit2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  GitHub Синхронизация & CI/CD
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/15">
                  Git Engine
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Автоматический версионинг, коммиты и публикация в репозиторий GitHub.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* SECTION 1: GITHUB PERSONAL ACCESS TOKEN */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-neutral-400" />
                <span>GitHub Personal Access Token (PAT)</span>
              </label>

              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=BLACKBORZ%20AI%20Studio"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Создать токен (scope: repo)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex gap-2.5">
              <div className="relative flex-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white/40 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors p-1"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                onClick={handleSaveToken}
                disabled={isVerifyingToken || !token.trim()}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 border border-white/15 text-xs font-semibold text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                {isVerifyingToken ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Проверить</span>
              </button>
            </div>

            {/* Token feedback or verified user card */}
            {githubUser ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2.5">
                  {githubUser.avatarUrl && (
                    <img 
                      src={githubUser.avatarUrl} 
                      alt={githubUser.login} 
                      className="w-5 h-5 rounded-full border border-emerald-500/40"
                    />
                  )}
                  <span className="font-semibold text-white">@{githubUser.login}</span>
                  <span className="text-[11px] text-emerald-400 font-mono">• Авторизован в GitHub</span>
                </div>
                <a 
                  href={githubUser.htmlUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[11px] text-emerald-400 hover:text-white flex items-center gap-1"
                >
                  <span>Профиль</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            ) : tokenFeedback ? (
              <div className={`p-2 rounded-xl text-xs flex items-center gap-2 border ${
                tokenFeedback.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-white/5 border-white/10 text-neutral-300'
              }`}>
                {tokenFeedback.type === 'error' ? <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" /> : <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
                <span>{tokenFeedback.message}</span>
              </div>
            ) : null}
          </div>

          {/* SECTION 2: REPOSITORY CONNECTION */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-neutral-400" />
                <span>GitHub Репозиторий проекта</span>
              </span>

              {hasRemote && (
                <button
                  onClick={handleUnlinkRemote}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Отвязать репозиторий</span>
                </button>
              )}
            </div>

            {hasRemote ? (
              /* Already Linked Repo View */
              <div className="p-3.5 rounded-xl bg-black border border-white/15 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-mono font-bold text-white flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{gitStatus.remoteUrl}</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono mt-0.5 flex items-center gap-2">
                    <span>Ветка: <strong className="text-white">{gitStatus.branch || 'main'}</strong></span>
                    {gitStatus.ahead > 0 && <span className="text-amber-300">• Ahead: {gitStatus.ahead}</span>}
                    {gitStatus.behind > 0 && <span className="text-sky-300">• Behind: {gitStatus.behind}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {gitStatus.webUrl && (
                    <a
                      href={gitStatus.webUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <span>Открыть на GitHub</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              /* Not Linked: Choice to Link Existing or Create New */
              <div className="space-y-3">
                <div className="flex items-center gap-1 bg-black p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setRepoMode('link')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      repoMode === 'link' 
                        ? 'bg-neutral-800 text-white shadow-sm' 
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Привязать существующий
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepoMode('create')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      repoMode === 'create' 
                        ? 'bg-neutral-800 text-white shadow-sm' 
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Создать новый на GitHub
                  </button>
                </div>

                {repoMode === 'link' ? (
                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      placeholder="https://github.com/username/my-project.git или username/my-project"
                      value={existingRepoUrl}
                      onChange={(e) => setExistingRepoUrl(e.target.value)}
                      className="flex-1 bg-black border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white/40 font-mono"
                    />
                    <button
                      onClick={handleLinkRemote}
                      disabled={isSettingRemote || !existingRepoUrl.trim()}
                      className="px-4 py-2 bg-white hover:bg-neutral-200 disabled:opacity-40 text-black text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      {isSettingRemote ? 'Привязка...' : 'Привязать'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex gap-2.5">
                      <input
                        type="text"
                        placeholder="Название репозитория (например: my-vibe-app)"
                        value={newRepoName}
                        onChange={(e) => setNewRepoName(e.target.value)}
                        className="flex-1 bg-black border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white/40 font-mono"
                      />

                      <button
                        onClick={handleCreateNewRepo}
                        disabled={isCreatingRepo || !newRepoName.trim() || !token.trim()}
                        className="px-4 py-2 bg-white hover:bg-neutral-200 disabled:opacity-40 text-black text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                      >
                        {isCreatingRepo ? 'Создание...' : 'Создать и привязать'}
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-400 px-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="repo_visibility"
                          checked={!isPrivateRepo}
                          onChange={() => setIsPrivateRepo(false)}
                          className="accent-white"
                        />
                        <Globe className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Public (публичный)</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="repo_visibility"
                          checked={isPrivateRepo}
                          onChange={() => setIsPrivateRepo(true)}
                          className="accent-white"
                        />
                        <Lock className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Private (приватный)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: WORKING DIRECTORY CHANGES */}
          <div className="p-4 rounded-2xl bg-black border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-neutral-400" />
                <span>Изменения в проекте</span>
              </span>

              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                totalChanges > 0 
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' 
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}>
                {totalChanges > 0 ? `${totalChanges} файлов готово к коммиту` : 'Нет изменений'}
              </span>
            </div>

            {totalChanges > 0 ? (
              <div className="max-h-36 overflow-y-auto space-y-1.5 my-2 text-[11px] font-mono p-2.5 rounded-xl bg-neutral-950 border border-white/5">
                {gitStatus?.modified?.map((file: string, i: number) => (
                  <div key={`m-${i}`} className="flex items-center justify-between text-neutral-300 hover:text-white">
                    <span className="truncate">~ {file}</span>
                    <span className="text-[10px] text-amber-400/80 uppercase font-bold shrink-0">MODIFIED</span>
                  </div>
                ))}

                {gitStatus?.untracked?.map((file: string, i: number) => (
                  <div key={`u-${i}`} className="flex items-center justify-between text-emerald-300/90 hover:text-emerald-200">
                    <span className="truncate">+ {file}</span>
                    <span className="text-[10px] text-emerald-400 uppercase font-bold shrink-0">NEW</span>
                  </div>
                ))}

                {gitStatus?.deleted?.map((file: string, i: number) => (
                  <div key={`d-${i}`} className="flex items-center justify-between text-rose-400/90 hover:text-rose-300">
                    <span className="truncate">- {file}</span>
                    <span className="text-[10px] text-rose-400 uppercase font-bold shrink-0">DELETED</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-neutral-950/60 border border-white/5 text-center text-xs text-neutral-400">
                Рабочая директория чиста. Все файлы закоммичены.
              </div>
            )}

            {/* Commit Message & AI Auto-generator */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-neutral-400">
                  Сообщение коммита
                </label>

                <button
                  type="button"
                  onClick={handleGenerateAiCommit}
                  className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Сгенерировать AI коммит</span>
                </button>
              </div>

              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="feat: кратко опишите сделанные изменения"
                className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white/40 font-mono"
              />
            </div>
          </div>

          {/* Action Feedback Card */}
          {actionFeedback && (
            <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-in fade-in duration-150 ${
              actionFeedback.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}>
              {actionFeedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{actionFeedback.message}</p>
                {actionFeedback.link && (
                  <a 
                    href={actionFeedback.link} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1 text-white underline mt-1 font-mono text-[11px]"
                  >
                    <span>Открыть репозиторий на GitHub</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-black border-t border-white/10 flex items-center justify-between gap-3">
          <div>
            {hasRemote && (
              <button
                onClick={handlePull}
                disabled={isPulling || isCommitting}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-40 text-xs font-medium text-neutral-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Загрузить изменения из GitHub репозитория (git pull)"
              >
                <Download className={`w-3.5 h-3.5 ${isPulling ? 'animate-bounce text-emerald-400' : ''}`} />
                <span>{isPulling ? 'Загрузка...' : 'Pull из GitHub'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Отмена
            </button>

            <button
              onClick={handleCommit}
              disabled={isCommitting || isCreatingRepo || isSettingRemote}
              className="px-6 py-2.5 rounded-full bg-white hover:bg-neutral-200 disabled:opacity-40 text-xs font-bold text-black shadow-[0_0_25px_rgba(255,255,255,0.25)] transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              {isCommitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Отправка в GitHub...</span>
                </>
              ) : (
                <>
                  <GitPullRequest className="w-3.5 h-3.5 text-black" />
                  <span>Commit & Push</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
