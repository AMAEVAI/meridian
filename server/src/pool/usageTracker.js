import fs from 'node:fs';
import path from 'node:path';
import { PROFILES_DIR } from '../config.js';

/**
 * UsageTracker — tracks real API call counts per profile.
 * Google Gemini free tier limits:
 *  - RPM (requests per minute): 15
 *  - RPD (requests per day): 1500
 *  - TPM (tokens per minute): 1,000,000
 * 
 * We track per-profile:
 *  - requests in the last 5 hours (300 min window)
 *  - requests in the last 24 hours (daily)
 *  - requests in the last 7 days (weekly)
 *  - last request timestamp
 *  - total tokens used (estimated)
 */

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

// Google Gemini free tier daily request limit
const DAILY_REQUEST_LIMIT = 1500;
const FIVE_HOUR_REQUEST_LIMIT = Math.round(DAILY_REQUEST_LIMIT * (5 / 24)); // ~312 per 5h
const WEEKLY_REQUEST_LIMIT = DAILY_REQUEST_LIMIT * 7; // ~10500 per week

export class UsageTracker {
  constructor() {
    this.storePath = path.join(PROFILES_DIR, '_usage.json');
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.storePath)) {
        return JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
      }
    } catch {}
    return {};
  }

  save() {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.warn('[UsageTracker] Failed to save:', err.message);
    }
  }

  /**
   * Record a successful API call for a profile.
   * @param {string} profileId 
   * @param {object} meta - optional metadata { tokensUsed, model }
   */
  recordRequest(profileId, meta = {}) {
    if (!this.data[profileId]) {
      this.data[profileId] = { requests: [], totalTokens: 0 };
    }

    const entry = {
      ts: Date.now(),
      tokens: meta.tokensUsed || 0,
      model: meta.model || 'unknown'
    };

    this.data[profileId].requests.push(entry);
    this.data[profileId].totalTokens = (this.data[profileId].totalTokens || 0) + entry.tokens;
    this.data[profileId].lastRequest = entry.ts;

    // Prune entries older than 7 days to keep file small
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    this.data[profileId].requests = this.data[profileId].requests.filter(r => r.ts > cutoff);

    this.save();
  }

  /**
   * Get real usage stats for a profile.
   * Returns { requestsLast5h, requestsLast24h, requestsLast7d, 
   *           quota5h, quotaDaily, quotaWeekly, lastRequest }
   */
  getUsage(profileId) {
    const profile = this.data[profileId];
    if (!profile || !profile.requests || profile.requests.length === 0) {
      return {
        requestsLast5h: 0,
        requestsLast24h: 0,
        requestsLast7d: 0,
        quota5h: 0,
        quotaDaily: 0,
        quotaWeekly: 0,
        lastRequest: null,
        totalTokens: 0
      };
    }

    const now = Date.now();
    const reqs = profile.requests;

    const last5h = reqs.filter(r => (now - r.ts) < FIVE_HOURS_MS).length;
    const last24h = reqs.filter(r => (now - r.ts) < ONE_DAY_MS).length;
    const last7d = reqs.length;

    return {
      requestsLast5h: last5h,
      requestsLast24h: last24h,
      requestsLast7d: last7d,
      quota5h: Math.min(1, last5h / FIVE_HOUR_REQUEST_LIMIT),
      quotaDaily: Math.min(1, last24h / DAILY_REQUEST_LIMIT),
      quotaWeekly: Math.min(1, last7d / WEEKLY_REQUEST_LIMIT),
      lastRequest: profile.lastRequest || null,
      totalTokens: profile.totalTokens || 0
    };
  }

  /**
   * Get usage for all profiles.
   */
  getAllUsage(profileIds) {
    const result = {};
    for (const id of profileIds) {
      result[id] = this.getUsage(id);
    }
    return result;
  }
}
