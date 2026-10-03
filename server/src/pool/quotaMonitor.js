import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { AGY_BIN } from '../config.js';

const execFileAsync = promisify(execFile);

export class QuotaMonitor {
  constructor(options = {}) {
    this.profileManager = options.profileManager;
    this.cache = new Map(); // profileId -> { quota, timestamp }
    this.cacheTtlMs = options.cacheTtlMs || 60000; // 60 seconds
  }

  async fetchQuotaForProfile(profile) {
    const cached = this.cache.get(profile.id);
    const now = Date.now();
    if (cached && (now - cached.timestamp < this.cacheTtlMs)) {
      return cached.quota;
    }

    // Safety guard: only fetch quota if profile is ready/primary.
    // NEVER execute agy on unconfigured or unverified profiles to avoid triggering browser login!
    if (profile.status !== 'ready' && !profile.isPrimary && profile.id !== 'profile_1') {
      const fallback = {
        gemini5h: 0,
        geminiWeekly: 0,
        other5h: 0,
        otherWeekly: 0,
        status: 'unconfigured'
      };
      this.cache.set(profile.id, { quota: fallback, timestamp: now });
      return fallback;
    }

    try {
      const env = this.profileManager ? this.profileManager.getEnv(profile.id) : process.env;
      
      const { stdout } = await execFileAsync(AGY_BIN, ['-p', '/usage', '--output-format', 'json'], {
        env,
        timeout: 8000
      });

      const parsed = JSON.parse(stdout);
      const quota = this.parseAgyUsageJson(parsed);
      this.cache.set(profile.id, { quota, timestamp: now });
      return quota;
    } catch (err) {
      const fallback = cached ? cached.quota : {
        gemini5h: 0,
        geminiWeekly: 0,
        other5h: 0,
        otherWeekly: 0,
        status: 'error',
        error: err.message
      };
      this.cache.set(profile.id, { quota: fallback, timestamp: now });
      return fallback;
    }
  }

  parseAgyUsageJson(json) {
    let gemini5h = 0;
    let geminiWeekly = 0;
    let other5h = 0;
    let otherWeekly = 0;

    // Check command.data.groups structure
    const groups = json?.command?.data?.groups || [];
    for (const group of groups) {
      const buckets = group.buckets || [];
      for (const bucket of buckets) {
        const id = bucket.id || '';
        const remaining = typeof bucket.remaining_fraction === 'number' ? bucket.remaining_fraction : 1;
        const utilized = Math.max(0, 1 - remaining);

        if (id.includes('gemini-5h')) gemini5h = utilized;
        else if (id.includes('gemini-weekly')) geminiWeekly = utilized;
        else if (id.includes('3p-5h')) other5h = utilized;
        else if (id.includes('3p-weekly')) otherWeekly = utilized;
      }
    }

    return {
      gemini5h,
      geminiWeekly,
      other5h,
      otherWeekly,
      fetchedAt: Date.now()
    };
  }

  async getAllQuotas(profiles) {
    const results = {};
    for (const p of profiles) {
      results[p.id] = await this.fetchQuotaForProfile(p);
    }
    return results;
  }
}
