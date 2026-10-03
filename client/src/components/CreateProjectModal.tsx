import React, { useState } from 'react';
import { FolderPlus, X, HardDrive, Sparkles } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = projectName.trim();
    if (!trimmed) {
      setError('Введите название проекта');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onCreate(trimmed);
      setProjectName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания проекта');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanFolderName = projectName.trim()
    ? projectName.trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '-')
    : 'название-проекта';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md rounded-3xl bg-neutral-950 border border-white/20 p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <FolderPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Новый проект / диалог</h2>
              <p className="text-xs text-neutral-400">Автоматическое создание папки в Загрузках</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              Название проекта
            </label>
            <input
              type="text"
              autoFocus
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (error) setError('');
              }}
              placeholder="например, my-portfolio, ai-saas, shop-vibe"
              className="w-full px-4 py-3 rounded-2xl bg-neutral-900/80 border border-white/15 focus:border-white/40 focus:ring-1 focus:ring-white/40 text-white placeholder-neutral-500 text-sm font-medium outline-none transition-all"
            />
            {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
          </div>

          {/* Location preview banner */}
          <div className="p-3.5 rounded-2xl bg-neutral-900/50 border border-white/10 flex items-start gap-3">
            <HardDrive className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <span className="font-semibold text-neutral-300 block">Локальная папка на компьютере:</span>
              <span className="font-mono text-[11px] text-neutral-400 block break-all">
                ~/Downloads/{cleanFolderName}/
              </span>
              <span className="text-[10px] text-neutral-500 block pt-1">
                Файлы index.html, style.css и script.js будут созданы автоматически.
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !projectName.trim()}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 disabled:opacity-40 text-black font-bold text-xs shadow-[0_0_20px_rgba(255,255,255,0.25)] transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>{isSubmitting ? 'Создание...' : 'Создать проект'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
