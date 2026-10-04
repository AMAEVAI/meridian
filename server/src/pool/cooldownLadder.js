/**
 * CooldownLadder — FreeLLMAPI progressive cooldown engine.
 * Instead of naive binary cooldowns, tracks consecutive 429 failures per key/provider
 * and applies progressive backoff: 60s -> 5m -> 30m -> 5h.
 */
export class CooldownLadder {
  constructor() {
    this.coolDowns = new Map(); // entityId -> { until: timestamp, consecutiveCount: number, reason: string }
  }

  isCoolingDown(entityId) {
    const record = this.coolDowns.get(entityId);
    if (!record) return false;
    if (Date.now() > record.until) {
      // Cooldown expired
      this.coolDowns.delete(entityId);
      return false;
    }
    return true;
  }

  getCooldownRemainingMs(entityId) {
    const record = this.coolDowns.get(entityId);
    if (!record) return 0;
    const diff = record.until - Date.now();
    if (diff <= 0) {
      this.coolDowns.delete(entityId);
      return 0;
    }
    return diff;
  }

  /**
   * Register a 429 rate limit or quota exhaustion.
   * @param {string} entityId - profile or provider id
   * @param {object} options - { is5HourLimit, customDurationMs, reason }
   */
  recordFailure(entityId, options = {}) {
    const current = this.coolDowns.get(entityId) || { consecutiveCount: 0 };
    const count = (current.consecutiveCount || 0) + 1;

    let durationMs = 60 * 1000; // Step 1: 60s
    if (options.is5HourLimit) {
      durationMs = 5 * 60 * 60 * 1000; // 5 hours for Google 5h quota
    } else if (options.customDurationMs) {
      durationMs = options.customDurationMs;
    } else if (count === 2) {
      durationMs = 5 * 60 * 1000; // Step 2: 5m
    } else if (count === 3) {
      durationMs = 30 * 60 * 1000; // Step 3: 30m
    } else if (count >= 4) {
      durationMs = 5 * 60 * 60 * 1000; // Step 4: 5h
    }

    const until = Date.now() + durationMs;
    this.coolDowns.set(entityId, {
      until,
      consecutiveCount: count,
      reason: options.reason || 'Rate limit / Quota reached',
      lastFailure: Date.now()
    });

    return { durationMs, until, count };
  }

  recordSuccess(entityId) {
    const record = this.coolDowns.get(entityId);
    if (record) {
      // Clear or decay failure count on solid success
      this.coolDowns.delete(entityId);
    }
  }

  getAllCooldowns() {
    const now = Date.now();
    const result = {};
    for (const [id, rec] of this.coolDowns.entries()) {
      if (rec.until > now) {
        result[id] = {
          remainingMs: rec.until - now,
          until: rec.until,
          count: rec.consecutiveCount,
          reason: rec.reason
        };
      } else {
        this.coolDowns.delete(id);
      }
    }
    return result;
  }
}
