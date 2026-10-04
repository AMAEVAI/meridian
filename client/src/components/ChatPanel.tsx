import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
  Copy,
  Check,
  Layout,
  Code,
  Terminal,
  Zap,
  ChevronUp,
  Globe
} from 'lucide-react';

const AVAILABLE_MODELS = [
  { id: 'auto:balanced', label: 'Auto: Сбалансированный', desc: 'Умный роутер: Google + Groq + OpenRouter', icon: '⚡', group: 'Умный роутер (FreeLLMAPI)' },
  { id: 'auto:fastest', label: 'Auto: Макс. скорость', desc: 'Приоритет Groq LPU и Gemini Flash', icon: '🚀', group: 'Умный роутер (FreeLLMAPI)' },
  { id: 'auto:smartest', label: 'Auto: Глубокий интеллект', desc: 'Приоритет DeepSeek R1 и Gemini Pro', icon: '🧠', group: 'Умный роутер (FreeLLMAPI)' },
  { id: 'auto:least_exhausted', label: 'Auto: Защита квот', desc: 'Ротация по максимальному запасу квоты', icon: '🛡️', group: 'Умный роутер (FreeLLMAPI)' },
  { id: 'auto:fusion', label: 'Fusion: Синтез моделей', desc: 'Консилиум и параллельный опрос моделей', icon: '🔮', group: 'Умный роутер (FreeLLMAPI)' },

  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', desc: 'Пул из 5 Google аккаунтов (7 500 RPD)', icon: '💎', group: 'Google AI Studio Pool' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', desc: 'Экспериментальная модель Google AI', icon: '🧪', group: 'Google AI Studio Pool' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Быстрая и стабильная генерация', icon: '⚡', group: 'Google AI Studio Pool' },

  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)', desc: 'Сверхбыстрый инференс LPU (~300 tok/s)', icon: '🦙', group: 'Free Провайдеры' },
  { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (OpenRouter)', desc: 'Бесплатные рассуждения (Reasoning)', icon: '🐋', group: 'Free Провайдеры' },
];

// Code block with copy button
function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden border border-white/10 my-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/80 border-b border-white/10">
        <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-white/10"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Скопировано</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Копировать</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem 1.25rem',
          background: '#0a0a0a',
          fontSize: '12px',
          lineHeight: '1.6',
          borderRadius: 0,
        }}
        showLineNumbers={children.split('\n').length > 5}
        lineNumberStyle={{ color: '#333', fontSize: '10px', paddingRight: '1rem' }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

// Inline code
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/10 text-[12px] font-mono text-emerald-300">
      {children}
    </code>
  );
}

// Markdown components mapping
const markdownComponents = {
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    // If it's a code block (has language class or multiline)
    if (match || codeString.includes('\n')) {
      return <CodeBlock language={match?.[1] || ''}>{codeString}</CodeBlock>;
    }

    // Inline code
    return <InlineCode>{children}</InlineCode>;
  },
  pre({ children }: any) {
    // Let the code component handle rendering
    return <>{children}</>;
  },
  p({ children }: any) {
    return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
  },
  h1({ children }: any) {
    return <h1 className="text-xl font-black text-white mt-5 mb-3 tracking-tight">{children}</h1>;
  },
  h2({ children }: any) {
    return <h2 className="text-lg font-bold text-white mt-4 mb-2 tracking-tight">{children}</h2>;
  },
  h3({ children }: any) {
    return <h3 className="text-base font-bold text-white mt-3 mb-2">{children}</h3>;
  },
  ul({ children }: any) {
    return <ul className="list-disc list-inside space-y-1 mb-3 text-neutral-200 ml-1">{children}</ul>;
  },
  ol({ children }: any) {
    return <ol className="list-decimal list-inside space-y-1 mb-3 text-neutral-200 ml-1">{children}</ol>;
  },
  li({ children }: any) {
    return <li className="text-sm leading-relaxed">{children}</li>;
  },
  blockquote({ children }: any) {
    return (
      <blockquote className="border-l-2 border-white/30 pl-4 my-3 text-neutral-300 italic">
        {children}
      </blockquote>
    );
  },
  a({ href, children }: any) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/40 underline-offset-2 transition-colors">
        {children}
      </a>
    );
  },
  table({ children }: any) {
    return (
      <div className="overflow-x-auto my-3 rounded-xl border border-white/10">
        <table className="w-full text-xs">{children}</table>
      </div>
    );
  },
  thead({ children }: any) {
    return <thead className="bg-neutral-900/80 text-neutral-300">{children}</thead>;
  },
  th({ children }: any) {
    return <th className="px-3 py-2 text-left font-semibold text-neutral-200 border-b border-white/10">{children}</th>;
  },
  td({ children }: any) {
    return <td className="px-3 py-2 border-b border-white/5 text-neutral-300">{children}</td>;
  },
  hr() {
    return <hr className="border-white/10 my-4" />;
  },
  strong({ children }: any) {
    return <strong className="font-bold text-white">{children}</strong>;
  },
  em({ children }: any) {
    return <em className="italic text-neutral-200">{children}</em>;
  }
};

interface ChatPanelProps {
  messages: any[];
  onSendMessage: (text: string) => void;
  isGenerating: boolean;
  activeAccountNotice?: string;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export function ChatPanel({
  messages,
  onSendMessage,
  isGenerating,
  activeAccountNotice,
  selectedModel = 'gemini-3.8-flash',
  onModelChange
}: ChatPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [prompt]);

  // Close model dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onSendMessage(prompt);
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const toggleTool = (idx: string) => {
    setExpandedTools(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Strip tool blocks from display text
  const cleanDisplayText = (text: string) => {
    if (!text) return '';
    return text
      .replace(/<<<TOOL:WRITE_FILE\s+path=["'][^"']+["']>>>[\s\S]*?<<<END_TOOL>>>/gi, '')
      .replace(/<<<TOOL:COMMAND>>>[\s\S]*?<<<END_TOOL>>>/gi, '')
      .trim();
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
                Автономная ИИ-студия на базе <span className="text-white font-medium">Gemini</span> с пулом из 5 Google-аккаунтов и бесшовным автопереключением.
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

                <div className={`space-y-1 ${
                  msg.role === 'user' 
                    ? 'bg-white text-black font-semibold rounded-3xl rounded-tr-md px-5 py-3.5 shadow-[0_4px_25px_rgba(255,255,255,0.18)] max-w-[85%] text-sm' 
                    : 'text-neutral-100 max-w-[90%] text-sm'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <>
                      {/* Rendered Markdown Content — only if there's text after stripping tool blocks */}
                      {cleanDisplayText(msg.content).length > 0 && (
                        <div className="prose-bb leading-relaxed">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {cleanDisplayText(msg.content)}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Tool Executions (File writes & commands) */}
                      {msg.tools && msg.tools.length > 0 && (
                        <div className="space-y-2">
                          {cleanDisplayText(msg.content).length === 0 && (
                            <p className="text-xs text-neutral-400 mb-1">Файлы обновлены:</p>
                          )}
                          {msg.tools.map((t: any, tIdx: number) => {
                            const toolKey = `${idx}-${tIdx}`;
                            const isExp = expandedTools[toolKey];
                            return (
                              <div key={tIdx} className="rounded-2xl bg-neutral-950 border border-white/15 overflow-hidden text-xs shadow-sm">
                                <button
                                  onClick={() => toggleTool(toolKey)}
                                  className="w-full px-4 py-2.5 flex items-center justify-between bg-neutral-900/60 hover:bg-neutral-900 text-neutral-300 font-mono text-[11px] transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <FileCode className="w-4 h-4 text-neutral-400" />
                                    <span className="font-semibold text-white">{t.path || t.command}</span>
                                    <span className="text-neutral-400 flex items-center gap-1 text-[10px]">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      {t.path ? 'обновлен' : 'выполнено'}
                                    </span>
                                  </div>
                                  {isExp ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
                                </button>

                                {isExp && (
                                  <div className="p-4 bg-black font-mono text-[11px] max-h-72 overflow-y-auto border-t border-white/10">
                                    <pre className="text-neutral-300 whitespace-pre-wrap">{t.updated || t.content || t.output || t.error}</pre>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Truly empty response fallback */}
                      {cleanDisplayText(msg.content).length === 0 && (!msg.tools || msg.tools.length === 0) && (
                        <p className="text-xs text-neutral-500 italic">Ответ пуст</p>
                      )}
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
              <div className="flex items-center gap-2">
                <span className="animate-pulse">BLACKBORZ AI генерирует ответ</span>
                <span className="flex gap-1">
                  <span className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <span className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </span>
              </div>
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
              {/* Model Selector Dropdown */}
              <div className="relative" ref={modelDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(prev => !prev)}
                  className="flex items-center gap-1.5 bg-neutral-900 border border-white/10 hover:border-white/25 px-3 py-1 rounded-full text-[11px] text-neutral-300 hover:text-white transition-all cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{currentModel.icon} {currentModel.label}</span>
                  <ChevronUp className={`w-3 h-3 transition-transform ${isModelDropdownOpen ? '' : 'rotate-180'}`} />
                </button>

                {isModelDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 bg-neutral-950 border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden z-50 max-h-96 overflow-y-auto">
                    <div className="px-3.5 py-2.5 border-b border-white/10 bg-black/60 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        Выбор модели & роутера
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                        FreeLLMAPI Active
                      </span>
                    </div>

                    {['Умный роутер (FreeLLMAPI)', 'Google AI Studio Pool', 'Free Провайдеры'].map((groupName) => {
                      const groupModels = AVAILABLE_MODELS.filter(m => m.group === groupName);
                      if (groupModels.length === 0) return null;

                      return (
                        <div key={groupName} className="py-1">
                          <div className="px-3.5 py-1 text-[10px] font-mono font-semibold text-neutral-500 uppercase tracking-wider bg-white/[0.02]">
                            {groupName}
                          </div>
                          {groupModels.map((model) => (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() => {
                                if (onModelChange) onModelChange(model.id);
                                setIsModelDropdownOpen(false);
                              }}
                              className={`w-full px-3.5 py-2 flex items-center gap-3 text-left hover:bg-white/5 transition-colors cursor-pointer ${
                                selectedModel === model.id ? 'bg-white/10 border-l-2 border-emerald-400' : ''
                              }`}
                            >
                              <span className="text-base shrink-0">{model.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-white truncate">{model.label}</div>
                                <div className="text-[10px] text-neutral-400 truncate">{model.desc}</div>
                              </div>
                              {selectedModel === model.id && (
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
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
            BLACKBORZ AI • {currentModel.label} • 5 Google Accounts Pool с автоматической сменой 5ч квот
          </div>
        </form>
      </div>
    </div>
  );
}
