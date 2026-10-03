import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  FileCode, 
  Terminal, 
  ChevronRight, 
  ChevronDown, 
  Cpu, 
  Bot, 
  User, 
  Loader2,
  CheckCircle2
} from 'lucide-react';

export function ChatPanel({
  messages,
  onSendMessage,
  isGenerating,
  activeAccountNotice,
  selectedModel,
  onSelectModel
}) {
  const [prompt, setPrompt] = useState('');
  const [expandedTools, setExpandedTools] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onSendMessage(prompt);
    setPrompt('');
  };

  const toggleTool = (idx) => {
    setExpandedTools(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800/80">
      {/* Top Bar / Model Selector & Execution Status */}
      <div className="h-10 px-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-950/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Model:</span>
          <select 
            value={selectedModel} 
            onChange={(e) => onSelectModel(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="gemini-3.8-flash-high">Gemini 3.8 Flash (High)</option>
            <option value="gemini-3.7-flash-high">Gemini 3.7 Flash (High)</option>
            <option value="gemini-3.1-pro-high">Gemini 3.1 Pro (High)</option>
            <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (via Antigravity)</option>
            <option value="claude-opus-4-6-thinking">Claude Opus 4.6 Thinking</option>
          </select>
        </div>

        {activeAccountNotice && (
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            <Cpu className="w-3 h-3 text-indigo-400 animate-pulse" />
            <span className="truncate max-w-[200px]">{activeAccountNotice}</span>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">What are we vibe-coding today?</h3>
            <p className="text-xs max-w-xs text-slate-400">
              Describe your idea, UI component, or feature. The agent will write code, run dev servers, and live preview it.
            </p>

            <div className="grid grid-cols-1 gap-2 w-full max-w-xs mt-6 text-left">
              {[
                'Сделай темный лендинг с неоновыми градиентами',
                'Добавь фильтр поиска и карточки товаров',
                'Создай интерактивный калькулятор с анимацией'
              ].map((sample, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(sample)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 text-xs text-slate-300 transition-colors text-left"
                >
                  ✨ {sample}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 text-xs leading-relaxed ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div className={`max-w-[88%] space-y-2 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-md shadow-indigo-600/10 font-medium' : 'text-slate-200'}`}>
              {msg.role === 'user' ? (
                <p>{msg.content}</p>
              ) : (
                <>
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                  {/* Render Tool blocks if present */}
                  {msg.tools && msg.tools.map((t, tIdx) => {
                    const isExp = expandedTools[`${idx}-${tIdx}`];
                    return (
                      <div key={tIdx} className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden text-xs">
                        <button
                          onClick={() => toggleTool(`${idx}-${tIdx}`)}
                          className="w-full px-3 py-2 flex items-center justify-between bg-slate-950/60 hover:bg-slate-950 text-slate-300 font-mono text-[11px] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="font-semibold text-slate-100">{t.path}</span>
                            <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> updated
                            </span>
                          </div>
                          {isExp ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                        </button>

                        {isExp && (
                          <div className="p-3 bg-slate-950 font-mono text-[11px] max-h-60 overflow-y-auto border-t border-slate-800/80">
                            <pre className="text-slate-300">{t.updated || t.content}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isGenerating && (
          <div className="flex gap-3 text-xs items-center text-indigo-400 font-mono">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <span>Vibe coding in progress...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Prompt Input Box */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950/90">
        <div className="relative rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-lg shadow-black/40">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Опишите задачу или попросите изменить интерфейс..."
            rows={2}
            className="w-full bg-transparent px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
          />

          <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-slate-800/40">
            <span className="text-[10px] text-slate-500 font-mono">Enter to send, Shift+Enter for newline</span>
            <button
              type="submit"
              disabled={!prompt.trim() || isGenerating}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <span>Vibe</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
