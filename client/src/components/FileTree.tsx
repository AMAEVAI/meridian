import React from 'react';
import { File, Folder, FileCode, FileText, FileJson } from 'lucide-react';

export function FileTree({ files, selectedFile, onSelectFile }) {
  const getIcon = (filePath, isDir) => {
    if (isDir) return <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      return <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (filePath.endsWith('.json')) {
      return <FileJson className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
    if (filePath.endsWith('.html') || filePath.endsWith('.css')) {
      return <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    }
    return <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  };

  return (
    <div className="p-2 space-y-0.5 font-mono text-xs select-none">
      {files.map((file) => (
        <button
          key={file.path}
          onClick={() => !file.isDir && onSelectFile(file.path)}
          className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
            selectedFile === file.path 
              ? 'bg-indigo-600/20 text-indigo-300 font-semibold' 
              : 'text-slate-300 hover:bg-slate-900'
          } ${file.isDir ? 'cursor-default font-semibold text-slate-400' : 'cursor-pointer'}`}
        >
          {getIcon(file.path, file.isDir)}
          <span className="truncate">{file.name}</span>
        </button>
      ))}
    </div>
  );
}
