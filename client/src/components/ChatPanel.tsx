import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, 
  Sparkles, 
  FileCode, 
  ChevronRight, 
  ChevronDown, 
  Bot, 
  User, 
  Loader2,
  CheckCircle2,
  Cpu,
  Layers,
  Code,
  Layout,
  Terminal,
  Zap
} from 'lucide-react';

export function ChatPanel({
  messages,
  onSendMessage,
  isGenerating,
  activeAccountNotice
}) {
  const [prompt, setPrompt] = useState('');
  const [expandedTools, setExpandedTools] = useState({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Auto-resize textarea like ChatGPT
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [prompt]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onSendMessage(prompt);
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const toggleTool = (idx) => {
    setExpandedTools(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-black overflow-hidden relative">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full px-5 py-8 space-y-6">
          {/* Empty State / Welcome Screen */}
          {messages.length === 0 && (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center py-8">
              {/* Luxury Emblem */}
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-b from-neutral-800 to-neutral-950 border border-white/20 flex items-center justify-center text-white mb-5 shadow-[0_15px_40px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]">
                <Sparkles className="w-8 h-8 text-white" />
              </div>

              <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-2">
                BLACKBORZ AI
              </h1>
              
              <p className="text-sm text-neutral-400 max-w-md mb-4 font-normal">
                Автономная ИИ-студия на базе <span className="text-white font-medium">Gemini 3.8 Flash High</span> с пулом из 5 Google-аккаунтов и бесшовным автопереключением.
              </p>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/15 text-xs text-neutral-300 font-mono mb-10 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                <span>5x Google Account Pool • Failover Active</span>
              </div>

              {/* 4 Luxury Prompt Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full max-w-2xl text-left">
                {[
                  {
                    icon: Layout,
                    title: 'Создай темный дашборд',
                    desc: 'С аналитикой, интерактивными графиками и метриками'
                  },
                  {
                    icon: Code,
                    title: 'Полнофункциональное веб-приложение',
                    desc: 'С чистой модульной архитектурой и адаптивным дизайном'
                  },
                  {
                    icon: Zap,
                    title: 'Неоновый лендинг с анимациями',
                    desc: 'Современные карточки, стеклянный эффект и микро-интеракции'
                  },
                  {
                    icon: Terminal,
                    title: 'Архитектурный анализ кода',
                    desc: 'Проанализируй текущий проект и предложи улучшения'
                  }
                ].map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => onSendMessage(`${card.title}: ${card.desc}`)}
                      className="p-4 rounded-2xl bg-gradient-to-b from-neutral-900/90 to-neutral-950 border border-white/10 hover:border-white/30 text-left transition-all hover:scale-[1.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_25px_rgba(0,0,0,0.4)] cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-7 h-7 rounded-xl bg-neutral-800 border border-white/10 flex items-center justify-center text-neutral-300 group-hover:text-white group-hover:bg-neutral-700 transition-colors">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-white transition-colors">
                          {card.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 group-hover:text-neutral-300 transition-colors pl-10">
                        {card.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages Stream */}
          {messages.map((msg, idx) => {
            if (msg.role === 'system') {
              return (
                <div key={idx} className="w-full flex justify-center my-3">
                  <div className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/10 border border-white/25 text-white text-xs font-mono shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                    <span>{msg.content}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-white/20 flex items-center justify-center text-white shrink-0 mt-1 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`space-y-3 ${
                  msg.role === 'user' 
                    ? 'bg-white text-black font-semibold rounded-3xl rounded-tr-md px-5 py-3.5 shadow-[0_4px_25px_rgba(255,255,255,0.18)] max-w-[85%] text-sm' 
                    : 'text-neutral-100 max-w-[90%] text-sm'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap leading-relaxed font-sans">{msg.content}</div>

                      {/* Tool Executions (File writes & commands) */}
                      {msg.tools && msg.tools.map((t, tIdx) => {
                        const isExp = expandedTools[`${idx}-${tIdx}`];
                        return (
                          <div key={tIdx} className="rounded-2xl bg-neutral-950 border border-white/15 overflow-hidden text-xs shadow-sm my-2">
                            <button
                              onClick={() => toggleTool(`${idx}-${tIdx}`)}
                              className="w-full px-4 py-2.5 flex items-center justify-between bg-neutral-900/60 hover:bg-neutral-900 text-neutral-300 font-mono text-[11px] transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <FileCode className="w-4 h-4 text-neutral-400" />
                                <span className="font-semibold text-white">{t.path}</span>
                                <span className="text-neutral-400 flex items-center gap-1 text-[10px]">
                                  <CheckCircle2 className="w-3 h-3 text-white" /> обновлен
                                </span>
                              </div>
                              {isExp ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
                            </button>

                            {isExp && (
                              <div className="p-4 bg-black font-mono text-[11px] max-h-72 overflow-y-auto border-t border-white/10">
                                <pre className="text-neutral-300">{t.updated || t.content}</pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-white/20 flex items-center justify-center text-white shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isGenerating && (
            <div className="flex gap-4 items-center text-xs text-neutral-400 font-mono pl-1">
              <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-white/20 flex items-center justify-center text-white">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <span className="animate-pulse">BLACKBORZ AI генерирует ответ...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating ChatGPT-style Prompt Input Bar */}
      <div className="p-4 bg-gradient-to-t from-black via-black/95 to-transparent shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto w-full">
          <div className="relative rounded-3xl bg-neutral-950 border border-white/15 focus-within:border-white/40 focus-within:ring-1 focus-within:ring-white/20 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_15px_40px_rgba(0,0,0,0.8)] p-2">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Спросите что-нибудь у BLACKBORZ AI или опишите задачу..."
              rows={1}
              className="w-full bg-transparent px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none resize-none font-sans"
            />

            <div className="flex items-center justify-between px-3 pt-1 pb-1">
              {/* Model Tag inside input */}
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                <div className="flex items-center gap-1.5 bg-neutral-900 border border-white/10 px-2.5 py-0.5 rounded-full text-[11px] text-neutral-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Gemini 3.8 Flash High</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="w-9 h-9 rounded-full bg-white hover:bg-neutral-200 disabled:opacity-30 text-black flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.25)] transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <ArrowUp className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          <div className="text-center text-[10px] text-neutral-500 mt-2 font-mono">
            BLACKBORZ AI • Gemini 3.8 Flash High • 5 Google Accounts Pool с автоматической сменой 5ч квот
          </div>
        </form>
      </div>
    </div>
  );
}
