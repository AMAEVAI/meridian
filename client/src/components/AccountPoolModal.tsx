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
        authType: p.isPrimary ? 'system' : (p.authType || 'api_key')
      });
      setFeedback({ id: null, type: '', message: '' });
    }
  };

  const handleSave = async (id) => {
    setTestingId(id);
    setFeedback({ id, type: 'info', message: 'Сохраняем и проверяем подключение...' });
    try {
      const res = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ id, type: 'success', message: 'Аккаунт успешно сохранен и подключен!' });
        if (onUpdateProfile) onUpdateProfile();
        setTimeout(() => {
          setEditingId(null);
          setFeedback({ id: null, type: '', message: '' });
        }, 1500);
      } else {
        setFeedback({ id, type: 'error', message: data.error || 'Ошибка при сохранении' });
      }
    } catch (err) {
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
    } catch (err) {
      alert('Ошибка при сбросе: ' + err.message);
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] cursor-default"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Управление пулом Google AI аккаунтов
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  5 Профилей
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Добавьте ваши реальные Google аккаунты для одновременной работы и автоматической ротации квот.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
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
                className={`p-4 rounded-xl border transition-all ${
                  profile.isActive 
                    ? 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700' 
                    : 'bg-slate-950/30 border-slate-800/40 opacity-60'
                }`}
              >
                {/* Main Card Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-300">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                        {profile.name}
                        {isReady ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Подключен
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" /> Не настроен
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                        {profile.email ? (
                          <span className="text-indigo-300 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {profile.email}
                          </span>
                        ) : (
                          <span className="text-slate-500">Email не указан</span>
                        )}
                        {profile.isPrimary && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Основной системный
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditing(profile)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isEditing 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-slate-800 hover:bg-slate-700 text-indigo-300'
                      }`}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>{isEditing ? 'Закрыть' : 'Настроить'}</span>
                    </button>

                    {!profile.isPrimary && (
                      <button
                        onClick={() => onToggleProfile(profile.id)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          profile.isActive 
                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' 
                            : 'border-slate-800 text-slate-500 hover:text-slate-400'
                        }`}
                        title={profile.isActive ? 'Приостановить' : 'Активировать'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quota Meters if configured */}
                {isReady && (
                  <div className="grid grid-cols-2 gap-3 pt-3 mt-2 border-t border-slate-800/60">
                    <div>
                      <div className="flex justify-between text-[11px] font-medium mb-1">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-400" /> 5-часовая квота
                        </span>
                        <span className="text-slate-300 font-mono">{quota5h}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(quota5h, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-medium mb-1">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-purple-400" /> Недельная квота
                        </span>
                        <span className="text-slate-300 font-mono">{quotaWeekly}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(quotaWeekly, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Expandable Configuration Drawer */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 bg-slate-900/60 p-4 rounded-xl">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Название профиля
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="например: Google Рабочий"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Email аккаунта Google
                        </label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="example@gmail.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {!profile.isPrimary && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Gemini API Key для этого аккаунта</span>
                          </label>
                          <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <span>Получить бесплатный ключ</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <input
                          type="password"
                          value={editForm.apiKey}
                          onChange={(e) => setEditForm(prev => ({ ...prev, apiKey: e.target.value }))}
                          placeholder={profile.hasApiKey ? 'Ключ уже установлен (введите новый для замены)' : 'AIzaSy...'}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          💡 В Google AI Studio каждый ваш аккаунт Gmail может бесплатно получить собственный API Key с полноценными лимитами Gemini.
                        </p>
                      </div>
                    )}

                    {/* Feedback message */}
                    {feedback.id === profile.id && feedback.message && (
                      <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                        feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
                        feedback.type === 'error' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' :
                        'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                      }`}>
                        {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {feedback.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                        {feedback.type === 'info' && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />}
                        <span>{feedback.message}</span>
                      </div>
                    )}

                    {/* Drawer Buttons */}
                    <div className="flex items-center justify-between pt-2">
                      {!profile.isPrimary ? (
                        <button
                          onClick={() => handleReset(profile.id)}
                          className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Сбросить слот</span>
                        </button>
                      ) : <div />}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => handleSave(profile.id)}
                          disabled={testingId === profile.id}
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                        >
                          {testingId === profile.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
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
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Пул автоматически распределяет нагрузку между подключенными аккаунтами.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            Перейти в студию →
          </button>
        </div>
      </div>
    </div>
  );
}
