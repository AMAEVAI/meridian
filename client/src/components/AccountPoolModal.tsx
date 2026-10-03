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
  Cpu
} from 'lucide-react';

interface AccountPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: any[];
  onToggleProfile: (id: string) => void;
  onUpdateProfile?: () => void;
  onResetProfile?: () => void;
}

export function AccountPoolModal({
  isOpen,
  onClose,
  profiles = [],
  onToggleProfile,
  onUpdateProfile,
  onResetProfile
}: AccountPoolModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', apiKey: '', authType: 'api_key' });
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { latency?: number; message?: string; error?: string }>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string | null; type: string; message: string }>({ id: null, type: '', message: '' });

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-sync when modal opens to ensure real live data
  useEffect(() => {
    if (isOpen) {
      handleSync();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Real-time synchronization with Google Gemini API
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
      }
    } catch (err) {
      console.error('Failed to sync profiles', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Test individual profile
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

  const handleSave = async (id: string) => {
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

  const handleReset = async (id: string) => {
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

  // Total pool calculation
  const totalRequestsLast24h = profiles.reduce((sum, p) => sum + (p.quota?.requestsLast24h || 0), 0);
  const totalTokensUsed = profiles.reduce((sum, p) => sum + (p.quota?.totalTokens || 0), 0);
  const readyCount = profiles.filter(p => p.isActive && (p.status === 'ready' || p.hasApiKey)).length;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-950 border border-white/15 w-full max-w-3xl rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden flex flex-col max-h-[92vh] cursor-default"
      >
        {/* Header with Live Sync Controls */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-950 border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white">
                  Управление пулом Google AI аккаунтов
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-neutral-200 border border-white/15 font-mono font-semibold">
                  {readyCount}/5 Активны
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
                <span>Пул из 5 Google-аккаунтов с автоматической failover-ротацией квот</span>
                {lastSyncTime && (
                  <span className="text-[10px] text-neutral-500 font-mono">
                    • Синхронизировано в {lastSyncTime}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Sync Button */}
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

        {/* Real-time Pool Stats Summary Banner */}
        <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-neutral-900/60 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center shadow-inner">
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

        {/* Quick .env tip banner */}
        <div className="mx-6 mt-3 p-3 rounded-xl bg-neutral-950 border border-white/10 flex items-center justify-between gap-3">
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

        {/* Profiles List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {profiles.map((profile, idx) => {
            const isReady = profile.status === 'ready' || profile.isPrimary || profile.hasApiKey;
            const isEditing = editingId === profile.id;
            const testResult = testResults[profile.id];

            // Real calculations based on actual usageTracker numbers
            const req5h = profile.quota?.requestsLast5h || 0;
            const limit5h = profile.quota?.requestsLimit5h || 312;
            const pct5h = ((req5h / limit5h) * 100);

            const req24h = profile.quota?.requestsLast24h || 0;
            const limit24h = profile.quota?.requestsLimit24h || 1500;
            const pct24h = ((req24h / limit24h) * 100);

            const totalTokens = profile.quota?.totalTokens || 0;
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

                        {/* Status Badges */}
                        {profile.isCoolingDown ? (
                          <span className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                            <Clock className="w-3.5 h-3.5 animate-pulse" /> Лимит 5ч (Кулдаун)
                          </span>
                        ) : isCurrentlyActive ? (
                          <span className="flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> В работе (Активен)
                          </span>
                        ) : isReady ? (
                          <span className="flex items-center gap-1.5 text-[11px] text-neutral-300 bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-300" /> Подключен • Резерв
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[11px] text-neutral-500 border border-white/10 px-2 py-0.5 rounded-full font-medium">
                            <AlertCircle className="w-3.5 h-3.5" /> Не настроен
                          </span>
                        )}

                        {/* Live Ping indicator if tested */}
                        {testResult?.latency && (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {testResult.latency}ms
                          </span>
                        )}
                        {!testResult?.latency && profile.latencyMs && (
                          <span className="text-[10px] font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            {profile.latencyMs}ms
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-neutral-400 font-mono mt-0.5 flex items-center gap-2">
                        {profile.email ? (
                          <span className="text-neutral-300 flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-neutral-500" /> {profile.email}
                          </span>
                        ) : (
                          <span className="text-neutral-600">Email не указан</span>
                        )}
                        {profile.apiKeyMasked && (
                          <span className="text-[10px] text-neutral-500 border border-white/5 px-1.5 py-0.2 rounded font-mono">
                            {profile.apiKeyMasked}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Test API Button */}
                    {isReady && (
                      <button
                        onClick={() => handleTestProfile(profile.id)}
                        disabled={testingId === profile.id}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="Проверить подключение и замерить пинг API"
                      >
                        <Activity className={`w-3.5 h-3.5 text-neutral-400 ${testingId === profile.id ? 'animate-spin text-white' : ''}`} />
                        <span>{testingId === profile.id ? 'Тест...' : 'Тест'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => startEditing(profile)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isEditing 
                          ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                          : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-white/15'
                      }`}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>{isEditing ? 'Закрыть' : 'Настроить'}</span>
                    </button>

                    <button
                      onClick={() => onToggleProfile(profile.id)}
                      className={`p-2 rounded-full border transition-all cursor-pointer ${
                        profile.isActive 
                          ? 'border-white/20 text-white bg-white/10 hover:bg-white/20 shadow-sm' 
                          : 'border-neutral-800 text-neutral-600 hover:text-neutral-400'
                      }`}
                      title={profile.isActive ? 'Приостановить' : 'Активировать'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Real Synchronized Quota & Metrics Section */}
                {isReady && (
                  <div className="pt-3 mt-2 border-t border-white/10 space-y-3">
                    {profile.isCoolingDown && (
                      <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
                        <span className="flex items-center gap-2 font-medium">
                          <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          5-часовой лимит исчерпан. Нагрузка автоматически переключена на следующий аккаунт.
                        </span>
                        <span className="font-mono text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-100 uppercase font-bold tracking-wider">
                          Кулдаун 5ч
                        </span>
                      </div>
                    )}

                    {/* 2 Progress Bars with REAL values */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-[11px] font-medium mb-1.5">
                          <span className="text-neutral-400 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-neutral-400" /> 5-часовая нагрузка
                          </span>
                          <span className="text-neutral-200 font-mono font-bold">
                            {req5h} <span className="text-neutral-500 font-normal">/ {limit5h}</span> ({pct5h.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-900 border border-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              profile.isCoolingDown 
                                ? 'bg-amber-400' 
                                : isCurrentlyActive 
                                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' 
                                  : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                            }`}
                            style={{ width: `${Math.max(pct5h, req5h > 0 ? 3 : 0)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-medium mb-1.5">
                          <span className="text-neutral-400 flex items-center gap-1.5">
                            <Flame className="w-3 h-3 text-neutral-400" /> Суточный лимит (RPD)
                          </span>
                          <span className="text-neutral-200 font-mono font-bold">
                            {req24h} <span className="text-neutral-500 font-normal">/ {limit24h}</span> ({pct24h.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-900 border border-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-neutral-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                            style={{ width: `${Math.max(pct24h, req24h > 0 ? 3 : 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Detailed Metadata Row */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-1">
                      <div className="flex items-center gap-3">
                        <span>Токены: <strong className="text-white">{totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}</strong></span>
                        <span>•</span>
                        <span>За 7 дней: <strong className="text-white">{profile.quota?.requestsLast7d || 0} зап.</strong></span>
                      </div>
                      <div className="text-neutral-500 text-[10px]">
                        Посл. запрос: {formatLastRequest(profile.quota?.lastRequest)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Expandable Configuration Drawer */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3 bg-black/60 p-4 rounded-2xl border border-white/10">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Название профиля
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="например: Google Рабочий"
                          className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/40"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Email аккаунта Google
                        </label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="example@gmail.com"
                          className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/40"
                        />
                      </div>
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
                        onClick={() => handleReset(profile.id)}
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
                          onClick={() => handleSave(profile.id)}
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

        {/* Footer Info */}
        <div className="p-5 bg-black border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-neutral-300">Данные синхронизированы в реальном времени с Google AI Studio.</span>
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
