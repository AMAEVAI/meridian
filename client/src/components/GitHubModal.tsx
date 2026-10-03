import React, { useState } from 'react';
import { X, GitBranch, GitPullRequest, Key, CheckCircle, AlertTriangle } from 'lucide-react';

export function GitHubModal({
  isOpen,
  onClose,
  currentProject,
  gitStatus,
  onCommitPush,
  isCommitting
}) {
  const [token, setToken] = useState(localStorage.getItem('meridian_github_token') || '');
  const [commitMessage, setCommitMessage] = useState('feat: update project via Meridian Studio');
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const handleSaveToken = () => {
    localStorage.setItem('meridian_github_token', token);
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white">
              <GitPullRequest className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                GitHub Integration
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sync your project with your GitHub repository.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* GitHub Token */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Personal Access Token (PAT)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                onClick={handleSaveToken}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors"
              >
                Save
              </button>
            </div>
            {statusMessage && (
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> {statusMessage}
              </p>
            )}
          </div>

          {/* Repo Status */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                Active Branch: <span className="text-slate-200 font-mono">{gitStatus?.branch || 'main'}</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {gitStatus?.modified?.length || 0} modified files
              </span>
            </div>

            {gitStatus?.modified?.length > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-1 my-2 text-[11px] font-mono text-slate-400">
                {gitStatus.modified.map((file, i) => (
                  <div key={i} className="text-amber-400/90 truncate">• {file}</div>
                ))}
              </div>
            )}

            {/* Commit Message Box */}
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Commit Message
              </label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCommit}
            disabled={isCommitting}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all"
          >
            {isCommitting ? 'Pushing...' : 'Commit & Push'}
          </button>
        </div>
      </div>
    </div>
  );
}
