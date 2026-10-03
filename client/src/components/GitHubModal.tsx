import React, { useState } from 'react';
import { X, GitBranch, GitPullRequest, Key, CheckCircle } from 'lucide-react';

export function GitHubModal({
  isOpen,
  onClose,
  currentProject,
  gitStatus,
  onCommitPush,
  isCommitting
}) {
  const [token, setToken] = useState(localStorage.getItem('blackborz_github_token') || localStorage.getItem('meridian_github_token') || '');
  const [commitMessage, setCommitMessage] = useState('feat: update project via BLACKBORZ AI');
  const [statusMessage, setStatusMessage] = useState('');

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveToken = () => {
    localStorage.setItem('blackborz_github_token', token);
    setStatusMessage('Token saved locally!');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleCommit = async () => {
    await onCommitPush({
      message: commitMessage,
      token: token || undefined,
      push: true
    });
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-950 border border-white/15 w-full max-w-xl rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden flex flex-col cursor-default"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-950 border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
              <GitPullRequest className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                GitHub Integration
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Синхронизация проекта с вашим GitHub репозиторием.
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* GitHub Token */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-neutral-400" />
              <span>Personal Access Token (PAT)</span>
            </label>
            <div className="flex gap-2.5">
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="flex-1 bg-black border border-white/15 rounded-xl px-4 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white/40 font-mono"
              />
              <button
                onClick={handleSaveToken}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/15 text-xs font-semibold text-white rounded-xl transition-colors cursor-pointer"
              >
                Сохранить
              </button>
            </div>
            {statusMessage && (
              <p className="text-[11px] text-white mt-1.5 flex items-center gap-1 font-mono">
                <CheckCircle className="w-3 h-3 text-white" /> {statusMessage}
              </p>
            )}
          </div>

          {/* Repo Status */}
          <div className="p-4 rounded-2xl bg-black border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-neutral-400" />
                Ветка: <span className="text-white font-mono">{gitStatus?.branch || 'main'}</span>
              </span>
              <span className="text-[11px] text-neutral-400 font-mono">
                {gitStatus?.modified?.length || 0} измененных файлов
              </span>
            </div>

            {gitStatus?.modified?.length > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-1 my-2 text-[11px] font-mono text-neutral-300">
                {gitStatus.modified.map((file, i) => (
                  <div key={i} className="text-neutral-300 truncate">• {file}</div>
                ))}
              </div>
            )}

            {/* Commit Message Box */}
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                Сообщение коммита
              </label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white/40 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-black border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            onClick={handleCommit}
            disabled={isCommitting}
            className="px-6 py-2 rounded-full bg-white hover:bg-neutral-200 disabled:opacity-40 text-xs font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.25)] transition-all cursor-pointer"
          >
            {isCommitting ? 'Отправка...' : 'Commit & Push'}
          </button>
        </div>
      </div>
    </div>
  );
}
