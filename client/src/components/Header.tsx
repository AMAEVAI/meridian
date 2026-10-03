import React from 'react';
import { 
  Layers, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Trash2,
  Cpu,
  Folder
} from 'lucide-react';

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  currentProject: any;
  profiles: any[];
  onOpenPoolModal: () => void;
  onClearChat?: () => void;
  activeAccountNotice?: string;
}

export function Header({
  isSidebarOpen,
  onToggleSidebar,
  currentProject,
  profiles,
  onOpenPoolModal,
  onClearChat,
  activeAccountNotice
}: HeaderProps) {
  const activeCount = profiles.filter(p => p.isActive && p.status === 'ready').length;

  return (
    <header className="h-14 border-b border-white/10 bg-black/90 backdrop-blur-xl px-5 flex items-center justify-between z-20 shrink-0">
      {/* Left: Sidebar Toggle & Minimalist Project Name (ChatGPT / Claude Style) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          title={isSidebarOpen ? "Скрыть меню" : "Показать меню"}
        >
          {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        <div className="h-4 w-[1px] bg-white/10" />

        {/* Minimalist Project Title & Location */}
        <div className="flex items-center gap-2.5">
          <Folder className="w-4 h-4 text-neutral-500" />
          <span className="text-sm font-semibold text-white tracking-tight">
            {currentProject?.name || 'BLACKBORZ AI'}
          </span>
          {currentProject?.id && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-neutral-400 font-mono">
              ~/Downloads/{currentProject.id}
            </span>
          )}
        </div>
      </div>

      {/* Right Controls: Account Pool & Clear Dialog */}
      <div className="flex items-center gap-3">
        {/* Active Account Switching Live Notice */}
        {activeAccountNotice && (
          <div className={`hidden lg:flex items-center gap-2 text-xs px-3 py-1 rounded-full border transition-all ${
            activeAccountNotice.includes('Лимит') || activeAccountNotice.includes('исчерпан')
              ? 'text-amber-200 bg-amber-500/15 border-amber-500/35 animate-pulse'
              : 'text-neutral-300 bg-white/5 border-white/15'
          }`}>
            <Cpu className="w-3.5 h-3.5 text-neutral-300 animate-pulse" />
            <span className="truncate max-w-[220px] font-mono text-[11px] font-medium">{activeAccountNotice}</span>
          </div>
        )}

        {/* AI Pool Status Pill */}
        <button
          onClick={onOpenPoolModal}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-950 hover:bg-neutral-900 border border-white/15 hover:border-white/30 transition-all text-xs text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] cursor-pointer"
          title="Google AI Pool (5 аккаунтов с автопереключением)"
        >
          <Layers className="w-3.5 h-3.5 text-neutral-300" />
          <span className="font-medium text-neutral-300 hidden sm:inline">AI Pool:</span>
          <span className="text-white font-mono font-bold">{activeCount}/5</span>
          <span className={`w-1.5 h-1.5 rounded-full ${activeCount > 0 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-neutral-500'}`} />
        </button>

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
