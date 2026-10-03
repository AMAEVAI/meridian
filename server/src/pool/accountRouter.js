export class AccountRouter {
  constructor(options = {}) {
    this.coolDowns = new Map(); // profileId -> timestamp until which it's cooling down
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

  async executeWithFailover({ profiles, quotas = {}, runner }) {
    const ranked = this.getRankedProfiles(profiles, quotas);
    if (ranked.length === 0) {
      throw new Error('No active Google AI profiles available in pool.');
    }

    let lastError = null;

    for (const profile of ranked) {
      try {
        const result = await runner(profile);
        return result;
      } catch (err) {
        lastError = err;
        const msg = String(err.message || err);
        const isRateLimit = msg.includes('429') || 
                            msg.includes('RESOURCE_EXHAUSTED') || 
                            msg.includes('quota') || 
                            err.status === 429;

        if (isRateLimit) {
          // Put this profile in a 5-minute cool down and fail over to the next
          this.markCoolingDown(profile.id, 5 * 60 * 1000);
          console.warn(`[AccountRouter] Profile ${profile.id} hit rate limit. Failing over to next account...`);
          continue;
        }

        // If it's a fatal execution error not related to rate limits, still try another account or rethrow
        console.warn(`[AccountRouter] Profile ${profile.id} encountered error: ${msg}. Attempting next account...`);
      }
    }

    throw lastError || new Error('All accounts in the pool failed to execute the request.');
  }
}
