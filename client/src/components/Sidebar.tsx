import React from 'react';
import { 
  Plus, 
  MessageSquare, 
  Folder,
  Files, 
  GitBranch, 
  ExternalLink, 
  Layers, 
  Settings, 
  ChevronRight,
  Cpu,
  Trash2
} from 'lucide-react';
import { BBLogo } from './BBLogo';

interface SidebarProps {
  projects: any[];
  currentProject: any;
  onSelectProject: (p: any) => void;
  onCreateProject: () => void;
  onDeleteProject?: (projectId: string, e: React.MouseEvent) => void;
  profiles: any[];
  onOpenPoolModal: () => void;
  onOpenGitModal: () => void;
  onOpenFilesDrawer: () => void;
  previewUrl?: string;
  filesCount?: number;
}

export function Sidebar({
  projects,
  currentProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  profiles,
  onOpenPoolModal,
  onOpenGitModal,
  onOpenFilesDrawer,
  previewUrl,
  filesCount
}: SidebarProps) {
  const activeCount = profiles.filter(p => p.isActive && p.status === 'ready').length;
  const activeProfile = profiles.find(p => p.isActive && p.status === 'ready') || profiles[0];

  return (
    <aside className="w-72 h-full bg-neutral-950 border-r border-white/10 flex flex-col justify-between select-none z-30 shrink-0">
      {/* Top Header & Brand Logo with BB Monogram */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <BBLogo size="md" showText={true} />
        </div>

        {/* New Chat / Project Button (ChatGPT / Claude Style) */}
        <button
          onClick={onCreateProject}
          className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all active:scale-98 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-black stroke-[3]" />
          <span>Новый диалог / проект</span>
        </button>
      </div>

      {/* Middle Scrollable Section */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Projects / Dialogs List (ChatGPT / Claude Style) */}
        <div>
          <div className="px-3 pb-2 text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
            <span>Проекты (Загрузка)</span>
            <span className="font-mono text-[10px] text-neutral-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
              {projects.length}
            </span>
          </div>

          <div className="space-y-1">
            {projects.map((p) => {
              const isSelected = p.id === currentProject?.id;
              const folderName = p.folderName || p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProject(p)}
                  className={`group relative w-full text-left px-3 py-2.5 rounded-2xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-neutral-900 text-white font-medium border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                    <Folder className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'}`} />
                    <div className="truncate flex-1">
                      <div className={`truncate text-xs ${isSelected ? 'font-bold text-white' : 'text-neutral-300'}`}>
                        {p.name}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-500 truncate">
                        ~/Downloads/{folderName}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Selected Indicator */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {onDeleteProject && projects.length > 1 && (
                      <button
                        onClick={(e) => onDeleteProject(p.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-all cursor-pointer"
                        title="Удалить проект"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tools & Resources */}
        <div>
          <div className="px-3 pb-2 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            Инструменты
          </div>

          <div className="space-y-1">
            {/* Project Files Drawer Toggle */}
            <button
              onClick={onOpenFilesDrawer}
              className="w-full text-left px-3 py-2 rounded-2xl flex items-center justify-between text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Files className="w-3.5 h-3.5 text-neutral-400" />
                <span>Файлы проекта</span>
              </div>
              <span className="font-mono text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-neutral-300 border border-white/10">
                {filesCount || 0}
              </span>
            </button>

            {/* GitHub Sync */}
            <button
              onClick={onOpenGitModal}
              className="w-full text-left px-3 py-2 rounded-2xl flex items-center justify-between text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <GitBranch className="w-3.5 h-3.5 text-neutral-400" />
                <span>GitHub Репозиторий</span>
              </div>
              <ChevronRight className="w-3 h-3 text-neutral-600" />
            </button>

            {/* External App Preview link */}
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full text-left px-3 py-2 rounded-2xl flex items-center justify-between text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Открыть сайт в новой вкладке</span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Profile & Google Account Pool Status */}
      <div className="p-3 border-t border-white/10 bg-black/40">
        <button
          onClick={onOpenPoolModal}
          className="w-full p-3 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-white/15 hover:border-white/30 text-left transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-bold text-white">Google AI Pool</span>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {activeCount}/5
            </span>
          </div>

          <div className="text-[11px] text-neutral-400 font-mono truncate flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-neutral-500 shrink-0" />
            <span className="truncate">{activeProfile?.email || '5 Google Accounts Ready'}</span>
          </div>

          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-400 group-hover:text-neutral-200 transition-colors">
            <span>Настройки пула и квот</span>
            <Settings className="w-3 h-3 text-neutral-500 group-hover:text-white transition-colors" />
          </div>
        </button>
      </div>
    </aside>
  );
}
