import React from 'react';
import { 
  X, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  LogIn, 
  Power, 
  ShieldCheck, 
  Flame,
  Clock
} from 'lucide-react';

export function AccountPoolModal({
  isOpen,
  onClose,
  profiles,
  onToggleProfile,
  onAuthProfile
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Google AI Accounts Pool
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Smart Load Balancer
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pool of 5 Antigravity profiles with automatic quota failover and rate-limit mitigation.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profiles List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {profiles.map((profile, idx) => {
            const quota5h = Math.round((profile.quota?.gemini5h || 0) * 100);
            const quotaWeekly = Math.round((profile.quota?.geminiWeekly || 0) * 100);
            const isReady = profile.status === 'ready' || profile.status === 'active';

            return (
              <div 
                key={profile.id}
                className={`p-4 rounded-xl border transition-all ${
                  profile.isActive 
                    ? 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700' 
                    : 'bg-slate-950/30 border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-300">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        {profile.name}
                        {isReady ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" /> Unconfigured
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        ID: {profile.id} {profile.isCoolingDown && '• Cooling down (failover active)'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onAuthProfile(profile.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-indigo-300 flex items-center gap-1.5 transition-colors"
                      title="Authorize in Browser"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{isReady ? 'Re-Auth' : 'Sign In'}</span>
                    </button>
                    <button
                      onClick={() => onToggleProfile(profile.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        profile.isActive 
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' 
                          : 'border-slate-800 text-slate-500 hover:text-slate-400'
                      }`}
                      title={profile.isActive ? 'Pause Account' : 'Activate Account'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quota Meters */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                  <div>
                    <div className="flex justify-between text-[11px] font-medium mb-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-400" /> 5h Rolling Quota
                      </span>
                      <span className={quota5h > 80 ? 'text-amber-400 font-mono' : 'text-slate-300 font-mono'}>
                        {quota5h}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          quota5h > 85 ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(quota5h, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-medium mb-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-purple-400" /> Weekly Quota
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
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Automatic credit billing disabled (`useAiCredits: false`). 100% free subscription tier.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
