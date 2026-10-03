import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AGY_BIN } from '../config.js';

const execFileAsync = promisify(execFile);

export class QuotaMonitor {
  constructor(options = {}) {
    this.profileManager = options.profileManager;
    this.cache = new Map(); // profileId -> { quota, timestamp }
    this.cacheTtlMs = options.cacheTtlMs || 30000;
  }

  async fetchQuotaForProfile(profile) {
    const cached = this.cache.get(profile.id);
    const now = Date.now();
    if (cached && (now - cached.timestamp < this.cacheTtlMs)) {
      return cached.quota;
    }

    if (profile.status === 'unconfigured') {
      return {
        gemini5h: 0,
        geminiWeekly: 0,
        other5h: 0,
        otherWeekly: 0,
        status: 'unconfigured'
      };
    }

    try {
      const env = this.profileManager ? this.profileManager.getEnv(profile.id) : process.env;
      
      // Probe agy for usage in json format
      const { stdout } = await execFileAsync(AGY_BIN, ['-p', '/usage', '--output-format', 'json'], {
        env,
        timeout: 10000
      });

      const parsed = JSON.parse(stdout);
      const quota = this.parseAgyUsageJson(parsed);
      this.cache.set(profile.id, { quota, timestamp: now });
      return quota;
    } catch (err) {
      // Return fallback cached or zero quota with error status
      const fallback = cached ? cached.quota : {
        gemini5h: 0,
        geminiWeekly: 0,
        other5h: 0,
        otherWeekly: 0,
        status: 'error',
        error: err.message
      };
      return fallback;
    }
  }

  parseAgyUsageJson(json) {
    let gemini5h = 0;
    let geminiWeekly = 0;
    let other5h = 0;
    let otherWeekly = 0;

    // Standard Antigravity response structure
    const windows = json?.command?.data?.quota?.windows || json?.windows || [];
    for (const win of windows) {
      const type = win.type || '';
      const util = typeof win.utilization === 'number' ? win.utilization : 0;
      if (type.includes('gemini-5h') || type === '5h') gemini5h = util;
      else if (type.includes('gemini-weekly') || type === 'weekly') geminiWeekly = util;
      else if (type.includes('3p-5h')) other5h = util;
      else if (type.includes('3p-weekly')) otherWeekly = util;
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
