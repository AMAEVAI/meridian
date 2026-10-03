export class AccountRouter {
  constructor(options = {}) {
    this.coolDowns = new Map(); // profileId -> timestamp until which it's cooling down
    this.lastUsedProfileId = null;
  }

  getLastUsedProfileId() {
    return this.lastUsedProfileId;
  }

  isCoolingDown(profileId) {
    const until = this.coolDowns.get(profileId);
    if (!until) return false;
    if (Date.now() > until) {
      this.coolDowns.delete(profileId);
      return false;
    }
    return true;
  }

  markCoolingDown(profileId, durationMs = 60000) {
    this.coolDowns.set(profileId, Date.now() + durationMs);
  }

  getCooldownRemaining(profileId) {
    const until = this.coolDowns.get(profileId);
    if (!until) return 0;
    const diff = until - Date.now();
    if (diff <= 0) {
      this.coolDowns.delete(profileId);
      return 0;
    }
    return diff;
  }

  selectBestProfile(profiles, quotas = {}) {
    const available = profiles.filter(p => {
      if (!p.isActive) return false;
      if (p.status === 'unconfigured' || p.status === 'paused') return false;
      if (this.isCoolingDown(p.id)) return false;
      return true;
    });

    if (available.length === 0) {
      // If all are cooling down or filtered, try any active profile
      const fallback = profiles.find(p => p.isActive && p.status !== 'unconfigured');
      if (!fallback) {
        throw new Error('No available active Antigravity profiles in pool. Please authenticate at least one account.');
      }
      return fallback;
    }

    // Sort by lowest 5h quota utilization
    available.sort((a, b) => {
      const quotaA = quotas[a.id]?.gemini5h ?? 0;
      const quotaB = quotas[b.id]?.gemini5h ?? 0;
      return quotaA - quotaB;
    });

    return available[0];
  }

  getRankedProfiles(profiles, quotas = {}) {
    const candidates = profiles.filter(p => p.isActive && p.status !== 'unconfigured' && p.status !== 'paused');
    candidates.sort((a, b) => {
      const coolA = this.isCoolingDown(a.id) ? 1 : 0;
      const coolB = this.isCoolingDown(b.id) ? 1 : 0;
      if (coolA !== coolB) return coolA - coolB;

      const quotaA = quotas[a.id]?.gemini5h ?? 0;
      const quotaB = quotas[b.id]?.gemini5h ?? 0;
      return quotaA - quotaB;
    });
    return candidates;
  }

  async executeWithFailover({ profiles, quotas = {}, runner, onFailover }) {
    const ranked = this.getRankedProfiles(profiles, quotas);
    if (ranked.length === 0) {
      throw new Error('Нет доступных активных Google AI аккаунтов в пуле.');
    }

    let lastError = null;

    for (let i = 0; i < ranked.length; i++) {
      const profile = ranked[i];
      try {
        const result = await runner(profile);
        this.lastUsedProfileId = profile.id;
        return result;
      } catch (err) {
        lastError = err;
        const msg = String(err.message || err).toLowerCase();
        const isQuotaExhausted = msg.includes('429') || 
                                 msg.includes('resource_exhausted') || 
                                 msg.includes('quota') || 
                                 msg.includes('rate limit') ||
                                 msg.includes('limit') ||
                                 msg.includes('capacity') ||
                                 msg.includes('exhausted') ||
                                 msg.includes('too many requests') ||
                                 msg.includes('cooling') ||
                                 err.status === 429;

        if (isQuotaExhausted) {
          // Mark 5-hour cool down since 5h limit is reached
          this.markCoolingDown(profile.id, 5 * 60 * 60 * 1000);
          console.warn(`[AccountRouter] Profile ${profile.id} (${profile.email}) hit 5-hour limit. Failing over to next account...`);
          
          const nextProfile = ranked[i + 1];
          if (onFailover && nextProfile) {
            onFailover({
              exhaustedProfile: profile,
              nextProfile: nextProfile,
              message: `5-часовой лимит исчерпан на ${profile.email || profile.name}. Автоматически переключаюсь на следующий аккаунт: ${nextProfile.email || nextProfile.name}...`
            });
          }
          continue;
        }

        console.warn(`[AccountRouter] Profile ${profile.id} encountered error: ${msg}. Attempting next account...`);
        const nextProfile = ranked[i + 1];
        if (onFailover && nextProfile) {
          onFailover({
            exhaustedProfile: profile,
            nextProfile: nextProfile,
            message: `Ошибка на ${profile.email || profile.name}. Переключаюсь на резервный аккаунт ${nextProfile.email || nextProfile.name}...`
          });
        }
      }
    }

    throw lastError || new Error('Все 5 аккаунтов Google в пуле исчерпали квоты.');
  }
}
