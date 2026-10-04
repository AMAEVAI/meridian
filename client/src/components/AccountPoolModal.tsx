import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Settings2, 
  Power, 
  ShieldCheck, 
  Clock, 
  Flame, 
  Key, 
  Mail, 
  ExternalLink, 
  RefreshCw, 
  Trash2,
  Save,
  Zap,
  Activity,
  Cpu,
  Copy,
  Check,
  Sparkles,
  Server,
  Workflow,
  Boxes,
  ArrowRight,
  Sliders,
  Shield,
  Info
} from 'lucide-react';

interface AccountPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: any[];
  onToggleProfile: (id: string) => void;
  onUpdateProfile?: () => void;
  onResetProfile?: () => void;
}

interface ProviderModel {
  id: string;
  name: string;
  tier: string;
  intel: number;
  speed: number;
}

interface ExternalProvider {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  models: ProviderModel[];
  getKeyUrl: string;
  freeRpd: number;
  freeRpm: number;
  isEnabled: boolean;
  latencyMs?: number | null;
  status: string;
  hasApiKey: boolean;
  apiKeyMasked?: string;
  customModelId?: string;
}

interface ChainCandidate {
  type: string;
  id: string;
  name: string;
  email?: string;
  provider: string;
  modelId: string;
  modelName: string;
  hasApiKey: boolean;
  latencyMs: number;
  intelScore: number;
  speedScore: number;
  headroom: number;
  requestsLast5h: number;
  requestsLast24h: number;
  isCoolingDown: boolean;
  cooldownRemainingMs: number;
  computedScore: number;
}

interface StrategyInfo {
  id: string;
  name: string;
  desc: string;
  weights: {
    reliability: number;
    speed: number;
    intelligence: number;
  };
}

export function AccountPoolModal({
  isOpen,
  onClose,
  profiles = [],
  onToggleProfile,
  onUpdateProfile,
  onResetProfile
}: AccountPoolModalProps) {
  // Navigation Tabs: 'google' | 'providers' | 'router' | 'gateway'
  const [activeTab, setActiveTab] = useState<'google' | 'providers' | 'router' | 'gateway'>('google');

  // Google Profiles editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', apiKey: '', authType: 'api_key' });
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { latency?: number; message?: string; error?: string }>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string | null; type: string; message: string }>({ id: null, type: '', message: '' });

  // External Providers state
  const [providers, setProviders] = useState<ExternalProvider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [providerForms, setProviderForms] = useState<Record<string, { apiKey: string; baseUrl: string; customModelId: string }>>({});
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [providerTestResults, setProviderTestResults] = useState<Record<string, { success?: boolean; latency?: number; message?: string; error?: string }>>({});
  const [savingProviderId, setSavingProviderId] = useState<string | null>(null);

  // Router Engine state
  const [routerConfig, setRouterConfig] = useState<{
    strategy: string;
    strategies: Record<string, StrategyInfo>;
    chain: ChainCandidate[];
  } | null>(null);
  const [isLoadingRouter, setIsLoadingRouter] = useState(false);
  const [isUpdatingStrategy, setIsUpdatingStrategy] = useState(false);

  // Copy state for Gateway snippets
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load live data on open
  useEffect(() => {
    if (isOpen) {
      handleSync();
      fetchProviders();
      fetchRouterConfig();
    }
  }, [isOpen]);

  const fetchProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const res = await fetch('/api/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        // Initialize form state
        const forms: Record<string, { apiKey: string; baseUrl: string; customModelId: string }> = {};
        for (const p of data.providers || []) {
          forms[p.id] = {
            apiKey: '',
            baseUrl: p.baseUrl || '',
            customModelId: p.customModelId || p.models?.[0]?.id || ''
          };
        }
        setProviderForms(forms);
      }
    } catch (err) {
      console.error('Failed to fetch providers', err);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const fetchRouterConfig = async () => {
    setIsLoadingRouter(true);
    try {
      const res = await fetch('/api/router/config');
      if (res.ok) {
        const data = await res.json();
        setRouterConfig(data);
      }
    } catch (err) {
      console.error('Failed to fetch router config', err);
    } finally {
      setIsLoadingRouter(false);
    }
  };

  // Real-time synchronization
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/profiles/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.profiles && onUpdateProfile) {
          onUpdateProfile();
        }
        const now = new Date();
        setLastSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        fetchRouterConfig();
      }
    } catch (err) {
      console.error('Failed to sync profiles', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Test individual Google profile
  const handleTestProfile = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/profiles/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResults(prev => ({
          ...prev,
          [id]: { latency: data.latency, message: data.message || `Онлайн (${data.latency}ms)` }
        }));
        if (onUpdateProfile) onUpdateProfile();
        fetchRouterConfig();
      } else {
        setTestResults(prev => ({
          ...prev,
          [id]: { error: data.error || 'Ошибка проверки' }
        }));
      }
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [id]: { error: err.message }
      }));
    } finally {
      setTestingId(null);
    }
  };

  // Test external provider
  const handleTestProvider = async (id: string) => {
    setTestingProviderId(id);
    try {
      const res = await fetch(`/api/providers/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setProviderTestResults(prev => ({
        ...prev,
        [id]: data
      }));
      fetchProviders();
      fetchRouterConfig();
    } catch (err: any) {
      setProviderTestResults(prev => ({
        ...prev,
        [id]: { success: false, error: err.message }
      }));
    } finally {
      setTestingProviderId(null);
    }
  };

  // Toggle external provider enabled state
  const handleToggleProvider = async (provider: ExternalProvider) => {
    try {
      const res = await fetch(`/api/providers/${provider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !provider.isEnabled })
      });
      if (res.ok) {
        fetchProviders();
        fetchRouterConfig();
      }
    } catch (err) {
      console.error('Failed to toggle provider', err);
    }
  };

  // Save external provider settings
  const handleSaveProvider = async (id: string) => {
    setSavingProviderId(id);
    const form = providerForms[id] || { apiKey: '', baseUrl: '', customModelId: '' };
    try {
      const payload: any = {
        baseUrl: form.baseUrl,
        customModelId: form.customModelId
      };
      if (form.apiKey.trim()) {
        payload.apiKey = form.apiKey.trim();
        payload.isEnabled = true;
      }
      const res = await fetch(`/api/providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        // Clear entered key from field since it is now stored
        setProviderForms(prev => ({
          ...prev,
          [id]: { ...prev[id], apiKey: '' }
        }));
        await fetchProviders();
        await fetchRouterConfig();
        // Run quick ping test
        handleTestProvider(id);
      }
    } catch (err) {
      console.error('Failed to save provider', err);
    } finally {
      setSavingProviderId(null);
    }
  };

  // Select routing strategy
  const handleSelectStrategy = async (strategyKey: string) => {
    setIsUpdatingStrategy(true);
    try {
      const res = await fetch('/api/router/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: strategyKey })
      });
      if (res.ok) {
        await fetchRouterConfig();
      }
    } catch (err) {
      console.error('Failed to update strategy', err);
    } finally {
      setIsUpdatingStrategy(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const startEditing = (p: any) => {
    if (editingId === p.id) {
      setEditingId(null);
    } else {
      setEditingId(p.id);
      setEditForm({
        name: p.name || `Google Аккаунт #${p.index}`,
        email: p.email || '',
        apiKey: '',
        authType: 'api_key'
      });
      setFeedback({ id: null, type: '', message: '' });
    }
  };

  const handleSaveProfile = async (id: string) => {
    if (editForm.apiKey && editForm.apiKey.trim().startsWith('4/')) {
      setFeedback({
        id,
        type: 'error',
        message: 'Вы вставили временный код браузера (4/0...). Нужен настоящий API ключ Gemini (начинается на AQ... или AIzaSy...). Скопируйте ключ из Google AI Studio.'
      });
      return;
    }

    setTestingId(id);
    setFeedback({ id, type: 'info', message: 'Сохраняем и проверяем подключение...' });
    try {
      const res = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Ошибка сервера (${res.status})`);
      }
      if (res.ok && data.success) {
        setFeedback({ id, type: 'success', message: 'Аккаунт успешно сохранен и подключен!' });
        if (onUpdateProfile) onUpdateProfile();
        setTimeout(() => {
          setEditingId(null);
          setFeedback({ id: null, type: '', message: '' });
          handleSync();
        }, 1200);
      } else {
        setFeedback({ id, type: 'error', message: data.error || 'Ошибка при сохранении' });
      }
    } catch (err: any) {
      setFeedback({ id, type: 'error', message: err.message });
    } finally {
      setTestingId(null);
    }
  };

  const handleResetProfileSlot = async (id: string) => {
    if (!confirm('Вы уверены, что хотите сбросить настройки этого слота?')) return;
    try {
      await fetch(`/api/profiles/${id}/reset`, { method: 'POST' });
      if (onResetProfile) onResetProfile();
      setEditingId(null);
      handleSync();
    } catch (err: any) {
      alert('Ошибка при сбросе: ' + err.message);
    }
  };

  // Helper for formatting relative time
  const formatLastRequest = (ts?: number | null) => {
    if (!ts) return 'Нет недавних запросов';
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return `${diffSec} сек. назад`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} мин. назад`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} ч. назад`;
    return new Date(ts).toLocaleDateString();
  };

  // Statistics calculations
  const totalRequestsLast24h = profiles.reduce((sum, p) => sum + (p.quota?.requestsLast24h || 0), 0);
  const totalTokensUsed = profiles.reduce((sum, p) => sum + (p.quota?.totalTokens || 0), 0);
  const readyGoogleCount = profiles.filter(p => p.isActive && (p.status === 'ready' || p.hasApiKey)).length;
  const readyProvidersCount = providers.filter(p => p.isEnabled && p.hasApiKey).length;
  const currentStrategy = routerConfig?.strategy || 'balanced';

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 cursor-pointer animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-950 border border-white/15 w-full max-w-4xl rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden flex flex-col max-h-[92vh] cursor-default"
      >
        {/* Master Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/70">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-950 border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] shrink-0">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">
                  FreeLLMAPI & AI Matrix
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 font-mono font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {readyGoogleCount + readyProvidersCount} моделей онлайн
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/10 font-mono hidden sm:inline">
                  Free-tier стекирование
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
                <span>Пул из 5 Google-аккаунтов + Groq + OpenRouter + Cerebras + OpenAI Gateway</span>
                {lastSyncTime && (
                  <span className="text-[10px] text-neutral-500 font-mono hidden md:inline">
                    • Синхронизировано в {lastSyncTime}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-neutral-200 border border-white/15 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Синхронизировать квоты и проверить все API ключи"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-neutral-300 ${isSyncing ? 'animate-spin text-white' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Синхронизация...' : 'Синхронизировать'}</span>
            </button>

            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-white/10 bg-black/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('google')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'google'
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Google AI Pool</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'google' ? 'bg-black/20 text-black' : 'bg-white/10 text-neutral-300'
            }`}>
              5 слотов ({readyGoogleCount}/5)
            </span>
          </button>

          <button
            onClick={() => setActiveTab('providers')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'providers'
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Free Провайдеры</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'providers' ? 'bg-black/20 text-black' : 'bg-white/10 text-neutral-300'
            }`}>
              Groq, OpenRouter, Cerebras
            </span>
          </button>

          <button
            onClick={() => setActiveTab('router')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'router'
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Маршрутизатор & Защита квот</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold uppercase ${
              activeTab === 'router' ? 'bg-emerald-400 text-black' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}>
              {currentStrategy}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('gateway')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'gateway'
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>OpenAI API Gateway (/v1)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'gateway' ? 'bg-black/20 text-black' : 'bg-white/10 text-neutral-300'
            }`}>
              Cursor / IDE
            </span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          {/* TAB 1: GOOGLE AI POOL */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              {/* Pool Stats Summary Banner */}
              <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center shadow-inner">
                <div className="px-2 py-1">
                  <span className="block text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Суммарный лимит пула</span>
                  <span className="text-sm font-bold text-white font-mono mt-0.5 block">7 500 RPD</span>
                  <span className="text-[10px] text-neutral-400">5 акк. × 1500 зап.</span>
                </div>

                <div className="px-2 py-1 border-l border-white/5">
                  <span className="block text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Использовано за сутки</span>
                  <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                    {totalRequestsLast24h} <span className="text-[11px] text-neutral-500 font-normal">/ 7500</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {((totalRequestsLast24h / 7500) * 100).toFixed(2)}% нагрузки
                  </span>
                </div>

                <div className="px-2 py-1 border-l border-white/5">
                  <span className="block text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Всего токенов</span>
                  <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                    {totalTokensUsed > 1000 ? `${(totalTokensUsed / 1000).toFixed(1)}k` : totalTokensUsed}
                  </span>
                  <span className="text-[10px] text-neutral-400">Gemini 3.8 Flash</span>
                </div>

                <div className="px-2 py-1 border-l border-white/5">
                  <span className="block text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Статус синхронизации</span>
                  <span className="text-xs font-semibold text-emerald-300 mt-1 flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                    100% Онлайн
                  </span>
                  <span className="text-[10px] text-neutral-500">Google AI Studio</span>
                </div>
              </div>

              {/* .env tip banner */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-neutral-300">
                  <Key className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>
                    Ключи автоматически синхронизируются из файла <code className="px-1.5 py-0.5 rounded bg-black border border-white/20 text-white font-mono font-medium">.env</code> проекта.
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded whitespace-nowrap">
                  GOOGLE_API_KEY_1...5
                </span>
              </div>

              {/* Google Profiles List */}
              <div className="space-y-3.5">
                {profiles.map((profile, idx) => {
                  const isReady = profile.status === 'ready' || profile.isPrimary || profile.hasApiKey;
                  const isEditing = editingId === profile.id;
                  const testResult = testResults[profile.id];

                  const req5h = profile.quota?.requestsLast5h || 0;
                  const limit5h = profile.quota?.requestsLimit5h || 312;
                  const pct5h = Math.min(100, Math.round((req5h / limit5h) * 100));

                  const req24h = profile.quota?.requestsLast24h || 0;
                  const limit24h = profile.quota?.requestsLimit24h || 1500;
                  const pct24h = Math.min(100, Math.round((req24h / limit24h) * 100));

                  const isCurrentlyActive = profile.isCurrentlyActive || (idx === 0 && !profile.isCoolingDown);

                  return (
                    <div 
                      key={profile.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrentlyActive
                          ? 'bg-gradient-to-b from-neutral-900/90 to-neutral-950 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.08),inset_0_1px_0_rgba(255,255,255,0.08)]'
                          : profile.isActive 
                            ? 'bg-gradient-to-b from-neutral-900/80 to-neutral-950 border-white/15 hover:border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' 
                            : 'bg-neutral-950/40 border-white/5 opacity-50'
                      }`}
                    >
                      {/* Main Card Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-mono font-bold shadow-inner ${
                            isCurrentlyActive 
                              ? 'bg-neutral-900 border-emerald-500/50 text-emerald-300' 
                              : 'bg-neutral-900 border-white/15 text-white'
                          }`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white flex items-center gap-2">
                              {profile.name}

                              {isCurrentlyActive && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  ACTIVE
                                </span>
                              )}

                              {profile.isCoolingDown && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                                  КУЛДАУН ({Math.ceil((profile.cooldownRemainingMs || 0) / 1000)}с)
                                </span>
                              )}

                              {isReady ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/15">
                                  API КЛЮЧ АКТИВЕН
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  КЛЮЧ НЕ ЗАДАН
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-400 font-mono mt-0.5 flex items-center gap-2">
                              <Mail className="w-3 h-3 text-neutral-500" />
                              <span>{profile.email || `Слот #${idx + 1}`}</span>
                              <span className="text-neutral-600">•</span>
                              <span className="text-[11px] text-neutral-500">{formatLastRequest(profile.quota?.lastRequestTime)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTestProfile(profile.id)}
                            disabled={testingId === profile.id || !profile.hasApiKey}
                            className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-30 text-[11px] font-medium text-neutral-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Отправить проверочный пинг в Google Gemini API"
                          >
                            <Zap className={`w-3 h-3 ${testingId === profile.id ? 'animate-spin text-emerald-400' : 'text-neutral-400'}`} />
                            <span>{testingId === profile.id ? 'Проверка...' : 'Пинг'}</span>
                          </button>

                          <button
                            onClick={() => startEditing(profile)}
                            className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                            title="Настроить API ключ и параметры"
                          >
                            <Settings2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onToggleProfile(profile.id)}
                            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                              profile.isActive 
                                ? 'text-emerald-400 hover:bg-emerald-500/20' 
                                : 'text-neutral-600 hover:bg-white/5 hover:text-neutral-400'
                            }`}
                            title={profile.isActive ? 'Деактивировать слот' : 'Активировать слот'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Test feedback banner if any */}
                      {testResult && (
                        <div className={`mt-2 mb-2 p-2 rounded-xl text-[11px] flex items-center justify-between border ${
                          testResult.error 
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        }`}>
                          <div className="flex items-center gap-2">
                            {testResult.error ? <AlertCircle className="w-3.5 h-3.5 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                            <span>{testResult.error || testResult.message}</span>
                          </div>
                          {testResult.latency && (
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40 border border-white/10">
                              {testResult.latency} ms
                            </span>
                          )}
                        </div>
                      )}

                      {/* Quota Progress Meters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/5 text-xs">
                        {/* 5-hour Sliding Window */}
                        <div>
                          <div className="flex justify-between items-center text-[11px] mb-1">
                            <span className="text-neutral-400 flex items-center gap-1 font-medium">
                              <Flame className="w-3 h-3 text-amber-400" />
                              <span>5-часовое окно (смена при 100%)</span>
                            </span>
                            <span className="font-mono font-semibold text-neutral-200">
                              {req5h} / {limit5h} <span className="text-neutral-500">({pct5h}%)</span>
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-neutral-950 border border-white/10 overflow-hidden p-0.5">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                pct5h > 90 ? 'bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_10px_rgba(244,63,94,0.8)]' :
                                pct5h > 60 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                                'bg-gradient-to-r from-emerald-500 to-teal-400'
                              }`}
                              style={{ width: `${pct5h}%` }}
                            />
                          </div>
                        </div>

                        {/* 24-hour Limit */}
                        <div>
                          <div className="flex justify-between items-center text-[11px] mb-1">
                            <span className="text-neutral-400 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-sky-400" />
                              <span>Суточный лимит Google</span>
                            </span>
                            <span className="font-mono font-semibold text-neutral-200">
                              {req24h} / {limit24h} <span className="text-neutral-500">({pct24h}%)</span>
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-neutral-950 border border-white/10 overflow-hidden p-0.5">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-400 transition-all duration-500"
                              style={{ width: `${pct24h}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Editing Drawer */}
                      {isEditing && (
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-3 bg-black/40 p-4 rounded-xl border border-white/10">
                          <div>
                            <label className="block text-xs font-semibold text-neutral-300 mb-1">
                              Название слота
                            </label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Например: Google Account #1"
                              className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white/40"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5 text-neutral-400" />
                                <span>Gemini API Key для этого аккаунта</span>
                              </label>
                              <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                              >
                                <span>Получить бесплатный ключ</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <input
                              type="password"
                              value={editForm.apiKey}
                              onChange={(e) => setEditForm(prev => ({ ...prev, apiKey: e.target.value }))}
                              placeholder={profile.hasApiKey ? 'Ключ уже установлен (введите новый для замены)' : 'AQ... или AIzaSy...'}
                              className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-white/40"
                            />
                            <p className="text-[10px] text-neutral-500 mt-1">
                              💡 В Google AI Studio каждый ваш аккаунт Gmail может бесплатно получить собственный API Key с полноценными лимитами Gemini.
                            </p>
                          </div>

                          {/* Feedback message */}
                          {feedback.id === profile.id && feedback.message && (
                            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                              feedback.type === 'success' ? 'bg-white/10 text-white border border-white/20' :
                              feedback.type === 'error' ? 'bg-rose-500/15 text-rose-200 border border-rose-500/30' :
                              'bg-white/5 text-neutral-300 border border-white/10'
                            }`}>
                              {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                              {feedback.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                              {feedback.type === 'info' && <RefreshCw className="w-4 h-4 text-white animate-spin shrink-0" />}
                              <span>{feedback.message}</span>
                            </div>
                          )}

                          {/* Drawer Buttons */}
                          <div className="flex items-center justify-between pt-2">
                            <button
                              onClick={() => handleResetProfileSlot(profile.id)}
                              className="px-3.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Сбросить слот</span>
                            </button>

                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-4 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                              >
                                Отмена
                              </button>
                              <button
                                onClick={() => handleSaveProfile(profile.id)}
                                disabled={testingId === profile.id}
                                className="px-5 py-2 rounded-full bg-white hover:bg-neutral-200 disabled:opacity-40 text-xs font-bold text-black flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.25)] transition-all cursor-pointer"
                              >
                                {testingId === profile.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" /> : <Save className="w-3.5 h-3.5 text-black" />}
                                <span>Сохранить и подключить</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: FREE EXTERNAL PROVIDERS (Groq, OpenRouter, Cerebras, Custom) */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              {/* Concept Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-neutral-900/90 to-neutral-950 border border-white/10 flex items-start gap-3.5 shadow-inner">
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5 text-white">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white">Free-Tier Стекирование (Архитектура FreeLLMAPI)</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Объединяйте бесплатные квоты топовых провайдеров. При исчерпании лимита Google Flash система автоматически переключается на сверхбыстрый Groq (до 300 токенов/сек, 14 400 запросов/день), OpenRouter (DeepSeek R1/V3) и Cerebras без прерывания генерации.
                  </p>
                </div>
              </div>

              {/* Providers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((p) => {
                  const form = providerForms[p.id] || { apiKey: '', baseUrl: p.baseUrl, customModelId: p.customModelId || '' };
                  const testRes = providerTestResults[p.id];
                  const isSaving = savingProviderId === p.id;
                  const isTesting = testingProviderId === p.id;

                  return (
                    <div 
                      key={p.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        p.isEnabled && p.hasApiKey
                          ? 'bg-gradient-to-b from-neutral-900/90 to-neutral-950 border-emerald-500/35 shadow-[0_0_20px_rgba(16,185,129,0.06),inset_0_1px_0_rgba(255,255,255,0.08)]'
                          : 'bg-neutral-950/70 border-white/10'
                      }`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{p.name}</h4>
                              {p.isEnabled && p.hasApiKey ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
                                  АКТИВЕН
                                </span>
                              ) : p.hasApiKey ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-400 border border-white/15 font-semibold font-mono">
                                  ОТКЛЮЧЕН
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-white/5 font-semibold font-mono">
                                  НЕ НАСТРОЕН
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 mt-1">{p.description}</p>
                          </div>

                          {/* Toggle switch */}
                          <button
                            onClick={() => handleToggleProvider(p)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer ${
                              p.isEnabled 
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30' 
                                : 'bg-neutral-900 border-white/10 text-neutral-500 hover:text-neutral-300'
                            }`}
                            title={p.isEnabled ? 'Отключить провайдер' : 'Включить провайдер'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Free Quota & Models */}
                        <div className="my-3 p-2.5 rounded-xl bg-neutral-900/60 border border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-neutral-400">Бесплатный лимит:</span>
                            <span className="text-white font-semibold">{p.freeRpd.toLocaleString()} RPD / {p.freeRpm} RPM</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {p.models.map(m => (
                              <span 
                                key={m.id} 
                                className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300 font-mono"
                                title={`Интеллект: ${(m.intel * 100).toFixed(0)}%, Скорость: ${(m.speed * 100).toFixed(0)}%`}
                              >
                                {m.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Input form */}
                        <div className="space-y-2.5 mt-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1">
                                <Key className="w-3 h-3 text-neutral-400" />
                                <span>API Ключ {p.hasApiKey ? '(сохранен)' : ''}</span>
                              </label>
                              {p.getKeyUrl && (
                                <a 
                                  href={p.getKeyUrl} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
                                >
                                  <span>Получить ключ</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                            <input
                              type="password"
                              value={form.apiKey}
                              onChange={(e) => setProviderForms(prev => ({
                                ...prev,
                                [p.id]: { ...prev[p.id], apiKey: e.target.value }
                              }))}
                              placeholder={p.hasApiKey ? (p.apiKeyMasked || '••••••••••••••••') : 'Вставьте бесплатный API ключ'}
                              className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-white/40"
                            />
                          </div>

                          {/* Base URL for custom/local */}
                          {p.id === 'custom' && (
                            <div>
                              <label className="text-[11px] font-semibold text-neutral-300 mb-1 block">
                                Base URL (Ollama, LM Studio, vLLM)
                              </label>
                              <input
                                type="text"
                                value={form.baseUrl}
                                onChange={(e) => setProviderForms(prev => ({
                                  ...prev,
                                  [p.id]: { ...prev[p.id], baseUrl: e.target.value }
                                }))}
                                placeholder="http://localhost:11434/v1"
                                className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-white/40"
                              />
                            </div>
                          )}
                        </div>

                        {/* Test result status */}
                        {testRes && (
                          <div className={`mt-3 p-2 rounded-xl text-[11px] flex items-center justify-between border ${
                            testRes.success 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              {testRes.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                              <span className="truncate max-w-[200px]">{testRes.message || testRes.error || (testRes.success ? 'Пинг успешен' : 'Ошибка')}</span>
                            </div>
                            {testRes.latency && (
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                                {testRes.latency} ms
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/5">
                        <button
                          onClick={() => handleTestProvider(p.id)}
                          disabled={isTesting || (!p.hasApiKey && !form.apiKey.trim())}
                          className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-medium text-neutral-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Zap className={`w-3 h-3 ${isTesting ? 'animate-spin text-emerald-400' : 'text-neutral-400'}`} />
                          <span>{isTesting ? 'Проверка...' : 'Проверить пинг'}</span>
                        </button>

                        <button
                          onClick={() => handleSaveProvider(p.id)}
                          disabled={isSaving}
                          className="px-4 py-1.5 rounded-full bg-white hover:bg-neutral-200 disabled:opacity-40 text-xs font-bold text-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all cursor-pointer"
                        >
                          {isSaving ? <RefreshCw className="w-3 h-3 animate-spin text-black" /> : <Save className="w-3 h-3 text-black" />}
                          <span>Сохранить</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ROUTER & QUOTA GUARD (FreeLLMAPI Multi-Axis Bandit Engine) */}
          {activeTab === 'router' && (
            <div className="space-y-5">
              {/* Algorithm Explanation Card */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 flex items-start gap-3.5 shadow-inner">
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5 text-white">
                  <Workflow className="w-4 h-4 text-sky-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white">Многофакторный алгоритм маршрутизации FreeLLMAPI</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Для каждого запроса система рассчитывает взвешенный балл готовности аккаунта:
                    <br />
                    <code className="text-[11px] text-emerald-300 font-mono bg-black/60 px-2 py-0.5 rounded border border-white/10 mt-1 inline-block">
                      Score = (w_rel × Надежность + w_spd × Скорость + w_intel × Интеллект) × Headroom × CooldownLadder
                    </code>
                    <br />
                    Фактор <span className="text-neutral-200 font-medium">Headroom</span> направляет запросы на аккаунты с максимальным запасом до лимита, а <span className="text-neutral-200 font-medium">Cooldown Ladder</span> защищает от повторных 429 блокировок.
                  </p>
                </div>
              </div>

              {/* Strategy Selector Grid */}
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5">
                  Выберите стратегию маршрутизации
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {routerConfig?.strategies && Object.entries(routerConfig.strategies).map(([key, strat]) => {
                    const isSelected = routerConfig.strategy === key;
                    const iconsMap: Record<string, any> = {
                      balanced: Zap,
                      fastest: Flame,
                      smartest: Cpu,
                      least_exhausted: ShieldCheck,
                      fusion: Sparkles
                    };
                    const IconComponent = iconsMap[key] || Activity;

                    return (
                      <button
                        key={key}
                        onClick={() => handleSelectStrategy(key)}
                        disabled={isUpdatingStrategy}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-b from-neutral-900 to-neutral-950 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-emerald-500/40'
                            : 'bg-neutral-950/60 border-white/10 hover:border-white/25 hover:bg-neutral-900/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                                isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-neutral-400'
                              }`}>
                                <IconComponent className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-bold text-white">{strat.name}</span>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 leading-snug">{strat.desc}</p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-2 text-[10px] font-mono text-neutral-500">
                          <span>Надёжн: {(strat.weights.reliability * 100).toFixed(0)}%</span>
                          <span>•</span>
                          <span>Скор: {(strat.weights.speed * 100).toFixed(0)}%</span>
                          <span>•</span>
                          <span>Интел: {(strat.weights.intelligence * 100).toFixed(0)}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Fallback Chain Visualizer */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Живая цепочка переключения (Live Fallback Chain)</span>
                  </h4>
                  <span className="text-[11px] font-mono text-neutral-500">
                    При 429 переключается слева направо
                  </span>
                </div>

                <div className="space-y-2">
                  {routerConfig?.chain && routerConfig.chain.length > 0 ? (
                    routerConfig.chain.map((candidate, rankIdx) => {
                      const isTop = rankIdx === 0;
                      return (
                        <div 
                          key={candidate.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isTop
                              ? 'bg-gradient-to-r from-emerald-950/30 via-neutral-900 to-neutral-950 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.06)]'
                              : 'bg-neutral-950/80 border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                              isTop 
                                ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                                : 'bg-neutral-900 border border-white/15 text-neutral-400'
                            }`}>
                              #{rankIdx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white flex items-center gap-2 truncate">
                                <span>{candidate.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-neutral-400 font-mono">
                                  {candidate.modelName || candidate.modelId}
                                </span>
                                {isTop && (
                                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                                    CURRENT TARGET
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-500 font-mono mt-0.5 truncate">
                                {candidate.email || candidate.provider}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 sm:gap-4 shrink-0 font-mono text-[11px]">
                            {/* Headroom */}
                            <div className="text-right hidden sm:block">
                              <span className="text-[10px] text-neutral-500 block">Headroom</span>
                              <span className="text-neutral-200 font-semibold">{Math.round(candidate.headroom * 100)}%</span>
                            </div>

                            {/* Latency */}
                            <div className="text-right hidden sm:block">
                              <span className="text-[10px] text-neutral-500 block">Пинг</span>
                              <span className="text-neutral-200 font-semibold">{candidate.latencyMs}ms</span>
                            </div>

                            {/* Calculated Score */}
                            <div className="text-right">
                              <span className="text-[10px] text-neutral-500 block">Bandit Score</span>
                              <span className={`font-bold ${isTop ? 'text-emerald-300' : 'text-neutral-300'}`}>
                                {candidate.computedScore.toFixed(3)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/5 text-center text-xs text-neutral-500">
                      Нет активных моделей в цепочке. Включите хотя бы один Google-аккаунт или внешний провайдер.
                    </div>
                  )}
                </div>
              </div>

              {/* Progressive Cooldown Ladder Info */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Прогрессивная лестница кулдаунов (Cooldown Ladder)</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  В отличие от простых систем, FreeLLMAPI не блокирует аккаунт на сутки при 429 ошибке. Применяется умная лестница отката: 
                  <span className="text-neutral-200 font-mono"> 60 сек → 5 мин → 30 мин → 5 часов</span>. Как только аккаунт остывает, он немедленно возвращается в пул с наивысшим приоритетом.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: OPENAI API GATEWAY (/v1) */}
          {activeTab === 'gateway' && (
            <div className="space-y-5">
              {/* Overview Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-neutral-900/90 to-neutral-950 border border-white/10 flex items-start gap-3.5 shadow-inner">
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5 text-white">
                  <Server className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white">Единый OpenAI-совместимый API Gateway (/v1)</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    BLACKBORZ AI поднимает локальный шлюз, совместимый со спецификацией OpenAI API. Вы можете подключить весь пул моделей (с автоматической ротацией и failover) в ваши любимые инструменты: <span className="text-neutral-200 font-medium">Cursor, Claude Code, Cline, Aider, Zed, Open WebUI</span>.
                  </p>
                </div>
              </div>

              {/* Gateway Connection Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Base URL */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-white/15 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-400">OpenAI Base URL</span>
                    <button
                      onClick={() => copyToClipboard('http://localhost:4000/v1', 'base_url')}
                      className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'base_url' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Скопировано</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Копировать</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black border border-white/10 font-mono text-xs text-emerald-300 select-all">
                    http://localhost:4000/v1
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    Укажите этот адрес в настройках OpenAI API вашего редактора кода.
                  </p>
                </div>

                {/* API Key */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-white/15 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-400">API Key</span>
                    <button
                      onClick={() => copyToClipboard('sk-blackborz-free-matrix', 'api_key')}
                      className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'api_key' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Скопировано</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Копировать</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black border border-white/10 font-mono text-xs text-white select-all">
                    sk-blackborz-free-matrix
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    Любая строка или токен (авторизация не требуется, всё работает локально).
                  </p>
                </div>
              </div>

              {/* Integration Guides */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Быстрое подключение к инструментам
                </h4>

                {/* Cursor IDE */}
                <div className="p-4 rounded-2xl bg-neutral-950/80 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-bold text-white">Cursor IDE / VS Code</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500">Settings → Models → OpenAI API</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    1. Откройте <code className="text-neutral-300 font-mono">Cursor Settings → Models</code>.<br />
                    2. Включите <code className="text-neutral-300 font-mono">OpenAI API Key</code> и введите <code className="text-neutral-300 font-mono">sk-blackborz-free-matrix</code>.<br />
                    3. Нажмите <code className="text-neutral-300 font-mono">Override OpenAI Base URL</code> и введите <code className="text-emerald-300 font-mono">http://localhost:4000/v1</code>.<br />
                    4. Добавьте модель <code className="text-neutral-300 font-mono">auto</code> или <code className="text-neutral-300 font-mono">gemini-3.8-flash</code> в список доступных моделей.
                  </p>
                </div>

                {/* CLI & Terminal (Claude Code, Aider, Cline) */}
                <div className="p-4 rounded-2xl bg-neutral-950/80 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span className="text-xs font-bold text-white">Terminal CLI (Aider, Claude Code, Cline)</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard('export OPENAI_BASE_URL="http://localhost:4000/v1"\nexport OPENAI_API_KEY="sk-blackborz-free-matrix"', 'cli_snippet')}
                      className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'cli_snippet' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Скопировано</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Копировать</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-black border border-white/10 font-mono text-[11px] text-neutral-300 overflow-x-auto">
                    export OPENAI_BASE_URL="http://localhost:4000/v1"{'\n'}
                    export OPENAI_API_KEY="sk-blackborz-free-matrix"
                  </pre>
                </div>

                {/* cURL Test Command */}
                <div className="p-4 rounded-2xl bg-neutral-950/80 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-xs font-bold text-white">Проверка через cURL</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard('curl http://localhost:4000/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -d \'{"model":"auto","messages":[{"role":"user","content":"Привет!"}]}\'', 'curl_snippet')}
                      className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'curl_snippet' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Скопировано</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Копировать</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-black border border-white/10 font-mono text-[11px] text-neutral-300 overflow-x-auto whitespace-pre">
{`curl http://localhost:4000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{"model":"auto","messages":[{"role":"user","content":"Привет!"}]}'`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Master Footer */}
        <div className="p-5 bg-black border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-neutral-300">
              {activeTab === 'google' && 'Пул из 5 Google аккаунтов синхронизирован в реальном времени.'}
              {activeTab === 'providers' && 'Бесплатные провайдеры готовы к инференсу.'}
              {activeTab === 'router' && 'Многофакторный роутер FreeLLMAPI активен.'}
              {activeTab === 'gateway' && 'OpenAI-совместимый шлюз слушает порт 4000 (/v1).'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-white hover:bg-neutral-200 text-black font-bold shadow-[0_0_25px_rgba(255,255,255,0.25)] transition-all active:scale-95 cursor-pointer"
          >
            В студию →
          </button>
        </div>
      </div>
    </div>
  );
}
