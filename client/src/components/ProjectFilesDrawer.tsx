import React, { useState } from 'react';
import { X, Code2, FolderTree, Save, ExternalLink } from 'lucide-react';
import { FileTree } from './FileTree.tsx';

export function ProjectFilesDrawer({
  isOpen,
  onClose,
  files,
  selectedFile,
  onSelectFile,
  fileContent,
  onSaveFileContent,
  previewUrl
}) {
  const [editedCode, setEditedCode] = useState(fileContent);

  React.useEffect(() => {
    setEditedCode(fileContent);
  }, [fileContent]);

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end cursor-pointer animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl h-full bg-neutral-950 border-l border-white/15 shadow-2xl flex flex-col cursor-default animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-white/15 flex items-center justify-center text-white">
              <FolderTree className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Файлы проекта
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/15">
                  {files.length}
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                {selectedFile || 'Выберите файл для просмотра'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                title="Открыть сайт"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content: Split Tree & Editor */}
        <div className="flex-1 flex overflow-hidden">
          {/* File list on left */}
          <div className="w-48 border-r border-white/10 overflow-y-auto bg-black/40 p-2">
            <FileTree 
              files={files} 
              selectedFile={selectedFile} 
              onSelectFile={onSelectFile} 
            />
          </div>

          {/* Code Viewer / Editor on right */}
          <div className="flex-1 flex flex-col bg-black">
            <div className="h-9 px-3 border-b border-white/10 flex items-center justify-between bg-neutral-950 text-xs">
              <span className="font-mono text-[11px] text-neutral-400 truncate">{selectedFile}</span>
              <button
                onClick={() => onSaveFileContent(selectedFile, editedCode)}
                className="px-3 py-1 rounded-full bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                <Save className="w-3 h-3 text-black" />
                <span>Сохранить</span>
              </button>
            </div>

            <textarea
              value={editedCode}
              onChange={(e) => setEditedCode(e.target.value)}
              className="flex-1 w-full p-4 font-mono text-xs text-neutral-200 bg-transparent focus:outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
