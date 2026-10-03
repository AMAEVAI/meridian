import React, { useState } from 'react';
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
  Save
} from 'lucide-react';

export function AccountPoolModal({
  isOpen,
  onClose,
  profiles,
  onToggleProfile,
  onUpdateProfile,
  onResetProfile
}) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', apiKey: '', authType: 'api_key' });
  const [testingId, setTestingId] = useState(null);
  const [feedback, setFeedback] = useState({ id: null, type: '', message: '' });

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const startEditing = (p) => {
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

  const handleSave = async (id) => {
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
        }, 1500);
      } else {
        setFeedback({ id, type: 'error', message: data.error || 'Ошибка при сохранении' });
      }
    } catch (err: any) {
      setFeedback({ id, type: 'error', message: err.message });
    } finally {
      setTestingId(null);
    }
  };

  const handleReset = async (id) => {
    if (!confirm('Вы уверены, что хотите сбросить настройки этого слота?')) return;
    try {
      await fetch(`/api/profiles/${id}/reset`, { method: 'POST' });
      if (onResetProfile) onResetProfile();
      setEditingId(null);
    } catch (err: any) {
      alert('Ошибка при сбросе: ' + err.message);
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-950 border border-white/15 w-full max-w-3xl rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden flex flex-col max-h-[92vh] cursor-default"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-950 border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Управление пулом Google AI аккаунтов
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20 font-mono">
                  5 Профилей
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                5 подключенных аккаунтов Google с автоматическим 5-часовым failover переключением.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick .env tip banner */}
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-neutral-900/90 border border-white/15 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-xs text-neutral-300">
            <Key className="w-4 h-4 text-white shrink-0" />
            <span>
              Ключи можно указать сразу для всех 5 аккаунтов в файле <code className="px-1.5 py-0.5 rounded bg-black border border-white/20 text-white font-mono font-medium">.env</code> в корне проекта.
            </span>
          </div>
          <span className="text-[10px] font-mono text-neutral-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded whitespace-nowrap">
            GOOGLE_API_KEY_1...5
          </span>
        </div>

        {/* Profiles List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {profiles.map((profile, idx) => {
            const quota5h = Math.round((profile.quota?.gemini5h || 0) * 100);
            const quotaWeekly = Math.round((profile.quota?.geminiWeekly || 0) * 100);
            const isReady = profile.status === 'ready' || profile.isPrimary || profile.hasApiKey;
            const isEditing = editingId === profile.id;

            return (
              <div 
                key={profile.id}
                className={`p-4 rounded-2xl border transition-all ${
                  profile.isActive 
                    ? 'bg-gradient-to-b from-neutral-900/80 to-neutral-950 border-white/15 hover:border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' 
                    : 'bg-neutral-950/40 border-white/5 opacity-50'
                }`}
              >
                {/* Main Card Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-white/15 flex items-center justify-center text-xs font-mono font-bold text-white shadow-inner">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        {profile.name}
                        {profile.isCoolingDown ? (
                          <span className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                            <Clock className="w-3.5 h-3.5 animate-pulse" /> Лимит 5ч (Кулдаун)
                          </span>
                        ) : isReady ? (
                          <span className="flex items-center gap-1.5 text-[11px] text-neutral-200 bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Подключен
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[11px] text-neutral-500 border border-white/10 px-2 py-0.5 rounded-full font-medium">
                            <AlertCircle className="w-3.5 h-3.5" /> Не настроен
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
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
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

                {/* Quota Meters if configured */}
                {isReady && (
                  <div className="pt-3 mt-2 border-t border-white/10 space-y-2">
                    {profile.isCoolingDown && (
                      <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
                        <span className="flex items-center gap-2 font-medium">
                          <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          5-часовой лимит исчерпан. Автоматически переключено на следующий аккаунт.
                        </span>
                        <span className="font-mono text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-100 uppercase font-bold tracking-wider">
                          Кулдаун 5ч
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-[11px] font-medium mb-1.5">
                          <span className="text-neutral-400 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-neutral-400" /> 5-часовая квота
                          </span>
                          <span className="text-neutral-200 font-mono font-bold">{quota5h}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-900 border border-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${profile.isCoolingDown ? 'bg-amber-400' : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]'}`}
                            style={{ width: `${Math.min(quota5h, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-medium mb-1.5">
                          <span className="text-neutral-400 flex items-center gap-1.5">
                            <Flame className="w-3 h-3 text-neutral-400" /> Недельная квота
                          </span>
                          <span className="text-neutral-200 font-mono font-bold">{quotaWeekly}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-900 border border-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-neutral-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                            style={{ width: `${Math.min(quotaWeekly, 100)}%` }}
                          />
                        </div>
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
            <span className="text-neutral-300">Пул автоматически распределяет нагрузку между 5 подключенными Google-аккаунтами.</span>
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
