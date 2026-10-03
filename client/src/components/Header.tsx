import React from 'react';
import { 
  Sparkles, 
  GitBranch, 
  Layers, 
  Plus, 
  ChevronDown, 
  UploadCloud, 
  RefreshCw,
  FolderGit2
} from 'lucide-react';

export function Header({
  projects,
  currentProject,
  onSelectProject,
  onCreateProject,
  profiles,
  onOpenPoolModal,
  onOpenGitModal,
  onCommitPush,
  isCommitting,
  gitStatus
}) {
  const activeCount = profiles.filter(p => p.isActive && p.status === 'ready').length;

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between z-20">
      {/* Brand & Project Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wide text-white">MERIDIAN</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">STUDIO</span>
            </div>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 mx-1" />

        {/* Project Dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors text-xs font-medium text-slate-200">
            <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>{currentProject?.name || 'Select Project'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-56 glass-dropdown rounded-xl p-1 z-50">
            <div className="text-[11px] font-semibold text-slate-400 px-2 py-1.5">Your Projects</div>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => onSelectProject(p)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                  p.id === currentProject?.id ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span className="truncate">{p.name}</span>
                {p.id === currentProject?.id && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
              </button>
            ))}
            <div className="border-t border-slate-800 my-1" />
            <button
              onClick={onCreateProject}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-2 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Controls: Account Pool HUD & GitHub */}
      <div className="flex items-center gap-3">
        {/* Antigravity 5-Account Pool HUD Pill */}
        <button
          onClick={onOpenPoolModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 hover:border-indigo-500/60 transition-all text-xs shadow-sm hover:shadow-indigo-500/10"
        >
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-200">AI Pool:</span>
            <span className="text-indigo-400 font-mono font-medium">{activeCount}/5 Active</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse' : 'bg-amber-400'}`} />
        </button>

        {/* GitHub Repository & Commit Control */}
        <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800">
          <button
            onClick={onOpenGitModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800 text-xs text-slate-300 transition-colors"
          >
            <GitBranch className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate max-w-[120px] font-mono text-[11px]">
              {gitStatus?.branch || 'main'}
            </span>
          </button>

          <button
            onClick={onCommitPush}
            disabled={isCommitting}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            {isCommitting ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5" />
            )}
            <span>Push</span>
          </button>
        </div>
      </div>
    </header>
  );
}
