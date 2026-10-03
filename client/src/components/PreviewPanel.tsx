import React, { useState } from 'react';
import { 
  Eye, 
  Code2, 
  FolderTree, 
  RotateCw, 
  ExternalLink, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Save, 
  Play
} from 'lucide-react';
import { FileTree } from './FileTree.tsx';

export function PreviewPanel({
  previewUrl,
  onStartDevServer,
  files,
  selectedFile,
  onSelectFile,
  fileContent,
  onSaveFileContent
}) {
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'code' | 'files'
  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [editedCode, setEditedCode] = useState(fileContent);
  const [key, setKey] = useState(0);

  // Sync edited code when fileContent changes
  React.useEffect(() => {
    setEditedCode(fileContent);
  }, [fileContent]);

  const handleReload = () => {
    setKey(k => k + 1);
  };

  const getViewportWidth = () => {
    if (viewport === 'mobile') return '390px';
    if (viewport === 'tablet') return '768px';
    return '100%';
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Tab Navigation & Toolbar */}
      <div className="h-10 px-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/80 text-xs">
        {/* Left Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'preview' 
                ? 'bg-indigo-600/20 text-indigo-300 font-semibold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'code' 
                ? 'bg-indigo-600/20 text-indigo-300 font-semibold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'files' 
                ? 'bg-indigo-600/20 text-indigo-300 font-semibold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Files ({files.length})</span>
          </button>
        </div>

        {/* Right Tools */}
        {activeTab === 'preview' && (
          <div className="flex items-center gap-2">
            {/* Viewport Toggles */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewport('desktop')}
                className={`p-1 rounded ${viewport === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Desktop"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewport('tablet')}
                className={`p-1 rounded ${viewport === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Tablet"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewport('mobile')}
                className={`p-1 rounded ${viewport === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Mobile"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleReload}
              className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors"
              title="Reload preview"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors"
                title="Open in new window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">{selectedFile || 'Select a file'}</span>
            <button
              onClick={() => onSaveFileContent(selectedFile, editedCode)}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-slate-900/40">
        {activeTab === 'preview' && (
          previewUrl ? (
            <div 
              className="h-full bg-slate-950 transition-all duration-300 flex flex-col border-x border-slate-800/80 shadow-2xl overflow-hidden"
              style={{ width: getViewportWidth() }}
            >
              <iframe
                key={key}
                src={previewUrl}
                title="Live App Preview"
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            </div>
          ) : (
            <div className="text-center p-8 max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-3">
                <Play className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">Preview Offline</h3>
              <p className="text-xs text-slate-400 mb-4">
                Dev server is not running yet. Launch it to view live hot-reloading changes.
              </p>
              <button
                onClick={onStartDevServer}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-lg shadow-indigo-600/25"
              >
                Launch Dev Server
              </button>
            </div>
          )
        )}

        {activeTab === 'code' && (
          <div className="w-full h-full flex flex-col bg-slate-950">
            <textarea
              value={editedCode}
              onChange={(e) => setEditedCode(e.target.value)}
              className="flex-1 w-full p-4 font-mono text-xs text-slate-200 bg-transparent focus:outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}

        {activeTab === 'files' && (
          <div className="w-full h-full overflow-y-auto bg-slate-950 p-2">
            <FileTree 
              files={files} 
              selectedFile={selectedFile} 
              onSelectFile={(f) => {
                onSelectFile(f);
                setActiveTab('code');
              }} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
