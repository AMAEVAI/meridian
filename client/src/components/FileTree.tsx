import React from 'react';
import { File, Folder, FileCode, FileText, FileJson } from 'lucide-react';

export function FileTree({ files, selectedFile, onSelectFile }) {
  const getIcon = (filePath, isDir) => {
    if (isDir) return <Folder className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      return <FileCode className="w-3.5 h-3.5 text-neutral-300 shrink-0" />;
    }
    if (filePath.endsWith('.json')) {
      return <FileJson className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
    }
    if (filePath.endsWith('.html') || filePath.endsWith('.css')) {
      return <FileText className="w-3.5 h-3.5 text-neutral-200 shrink-0" />;
    }
    return <File className="w-3.5 h-3.5 text-neutral-500 shrink-0" />;
  };

  return (
    <div className="p-2 space-y-1 font-mono text-xs select-none">
      {files.map((file) => (
        <button
          key={file.path}
          onClick={() => !file.isDir && onSelectFile(file.path)}
          className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
            selectedFile === file.path 
              ? 'bg-white/10 text-white font-semibold border border-white/20 shadow-sm' 
              : 'text-neutral-400 hover:bg-white/5 hover:text-white'
          } ${file.isDir ? 'cursor-default font-bold text-neutral-300' : ''}`}
        >
          {getIcon(file.path, file.isDir)}
          <span className="truncate">{file.name}</span>
        </button>
      ))}
    </div>
  );
}
