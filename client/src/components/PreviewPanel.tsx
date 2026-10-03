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
    <div className="flex flex-col h-full bg-black">
      {/* Tab Navigation & Toolbar */}
      <div className="h-11 px-4 border-b border-white/10 flex items-center justify-between bg-black/90 backdrop-blur-md text-xs">
        {/* Left Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'preview' 
                ? 'bg-white/10 text-white font-semibold border border-white/20 shadow-sm' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'code' 
                ? 'bg-white/10 text-white font-semibold border border-white/20 shadow-sm' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'files' 
                ? 'bg-white/10 text-white font-semibold border border-white/20 shadow-sm' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
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
            <div className="flex items-center bg-neutral-950 border border-white/10 rounded-lg p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <button
                onClick={() => setViewport('desktop')}
                className={`p-1 rounded transition-colors cursor-pointer ${viewport === 'desktop' ? 'bg-white text-black font-bold shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                title="Desktop"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewport('tablet')}
                className={`p-1 rounded transition-colors cursor-pointer ${viewport === 'tablet' ? 'bg-white text-black font-bold shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                title="Tablet"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewport('mobile')}
                className={`p-1 rounded transition-colors cursor-pointer ${viewport === 'mobile' ? 'bg-white text-black font-bold shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                title="Mobile"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleReload}
              className="p-1.5 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Reload preview"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Open in new window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-neutral-400">{selectedFile || 'Select a file'}</span>
            <button
              onClick={() => onSaveFileContent(selectedFile, editedCode)}
              className="px-3.5 py-1 rounded-full bg-white hover:bg-neutral-200 text-xs font-bold text-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-black" />
              <span>Save</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-black">
        {activeTab === 'preview' && (
          previewUrl ? (
            <div 
              className="h-full bg-black transition-all duration-300 flex flex-col border-x border-white/10 shadow-2xl overflow-hidden"
              style={{ width: getViewportWidth() }}
            >
              <iframe
                key={key}
                src={previewUrl}
                title="Live App Preview"
                className="w-full h-full border-0 bg-black"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            </div>
          ) : (
            <div className="text-center p-8 max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-950 border border-white/20 flex items-center justify-center text-white mx-auto mb-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                <Play className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Preview Offline</h3>
              <p className="text-xs text-neutral-400 mb-4">
                Dev server is not running yet. Launch it to view live hot-reloading changes.
              </p>
              <button
                onClick={onStartDevServer}
                className="px-5 py-2 rounded-full bg-white hover:bg-neutral-200 text-xs font-bold text-black transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)] active:scale-95 cursor-pointer"
              >
                Launch Dev Server
              </button>
            </div>
          )
        )}

        {activeTab === 'code' && (
          <div className="w-full h-full flex flex-col bg-black">
            <textarea
              value={editedCode}
              onChange={(e) => setEditedCode(e.target.value)}
              className="flex-1 w-full p-4 font-mono text-xs text-neutral-200 bg-transparent focus:outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}

        {activeTab === 'files' && (
          <div className="w-full h-full overflow-y-auto bg-black p-3">
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
