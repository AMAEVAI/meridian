import React from 'react';
import { 
  GitBranch, 
  Layers, 
  UploadCloud, 
  RefreshCw,
  Cpu,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  ExternalLink
} from 'lucide-react';

export function Header({
  isSidebarOpen,
  onToggleSidebar,
  currentProject,
  profiles,
  onOpenPoolModal,
  onOpenGitModal,
  onCommitPush,
  isCommitting,
  gitStatus,
  onClearChat,
  selectedModel,
  activeAccountNotice,
  previewUrl
}) {
  const activeCount = profiles.filter(p => p.isActive && p.status === 'ready').length;

  return (
    <header className="h-14 border-b border-white/10 bg-black/90 backdrop-blur-xl px-5 flex items-center justify-between z-20 shrink-0">
      {/* Left: Sidebar Toggle & Model Status */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          title={isSidebarOpen ? "Скрыть меню" : "Показать меню"}
        >
          {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        <div className="h-5 w-[1px] bg-white/10" />

        {/* Locked Model Pill */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-neutral-950 border border-white/15 rounded-full px-3.5 py-1 text-xs text-white font-mono font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span>Gemini 3.8 Flash High</span>
          </div>

          <span className="hidden sm:inline-flex text-[10px] text-neutral-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full font-mono">
            5-Acc Auto-Switch
          </span>
        </div>

        {/* Current Active Project Tag */}
        {currentProject && (
          <span className="hidden md:inline-flex text-xs text-neutral-400 font-mono items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/60 border border-white/10">
            <span>Проект:</span>
            <span className="text-white font-semibold">{currentProject.name}</span>
          </span>
        )}
      </div>

      {/* Right Controls: Settings & Account Pool HUD */}
      <div className="flex items-center gap-3">
        {/* Live Active Account / Failover Status Notice */}
        {activeAccountNotice && (
          <div className={`hidden lg:flex items-center gap-2 text-xs px-3.5 py-1 rounded-full border transition-all ${
            activeAccountNotice.includes('Лимит') || activeAccountNotice.includes('исчерпан')
              ? 'text-amber-200 bg-amber-500/15 border-amber-500/35 animate-pulse'
              : 'text-neutral-300 bg-white/5 border-white/15'
          }`}>
            <Cpu className="w-3.5 h-3.5 text-neutral-300 animate-pulse" />
            <span className="truncate max-w-[200px] font-mono text-[11px] font-medium">{activeAccountNotice}</span>
          </div>
        )}

        {/* AI Pool Settings Pill */}
        <button
          onClick={onOpenPoolModal}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-950 hover:bg-neutral-900 border border-white/15 hover:border-white/30 transition-all text-xs text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-white" />
          <span className="font-semibold text-neutral-200 hidden sm:inline">AI Pool:</span>
          <span className="text-white font-mono font-bold">{activeCount}/5</span>
          <span className={`w-1.5 h-1.5 rounded-full ${activeCount > 0 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-neutral-500'}`} />
        </button>

        {/* GitHub / Push */}
        <div className="flex items-center gap-1.5 bg-neutral-950 rounded-full p-1 border border-white/15">
          <button
            onClick={onOpenGitModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-white/5 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="GitHub Репозиторий"
          >
            <GitBranch className="w-3.5 h-3.5 text-neutral-400" />
            <span className="truncate max-w-[100px] font-mono text-[11px] hidden md:inline">
              {gitStatus?.branch || 'main'}
            </span>
          </button>

          <button
            onClick={onCommitPush}
            disabled={isCommitting}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white hover:bg-neutral-200 disabled:opacity-40 text-xs font-bold text-black shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all active:scale-95 cursor-pointer"
          >
            {isCommitting ? (
              <RefreshCw className="w-3 h-3 animate-spin text-black" />
            ) : (
              <UploadCloud className="w-3 h-3 text-black" />
            )}
            <span className="hidden sm:inline">Push</span>
          </button>
        </div>

        {/* Clear Chat Button */}
        {onClearChat && (
          <button
            onClick={onClearChat}
            className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Очистить диалог"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
