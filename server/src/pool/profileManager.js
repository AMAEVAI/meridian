import fs from 'node:fs';
import path from 'node:path';
import { PROFILES_DIR, NUM_SLOTS } from '../config.js';

export class ProfileManager {
  constructor(options = {}) {
    this.baseDir = options.baseDir || PROFILES_DIR;
    this.numSlots = options.numSlots || NUM_SLOTS;
    this.init();
  }

  init() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }

    for (let i = 1; i <= this.numSlots; i++) {
      this.ensureProfileSlot(i);
    }
  }

  ensureProfileSlot(index) {
    const id = `profile_${index}`;
    const profileDir = path.join(this.baseDir, id);
    const cliDir = path.join(profileDir, 'antigravity-cli');
    const configDir = path.join(profileDir, 'config');

    if (!fs.existsSync(cliDir)) {
      fs.mkdirSync(cliDir, { recursive: true });
    }
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Default settings.json
    const settingsPath = path.join(cliDir, 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      const defaultSettings = {
        useG1Credits: false,
        useAiCredits: false,
        artifactReviewPolicy: 'auto',
        toolPermission: 'auto'
      };
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf8');
    }

    // Default metadata.json
    const metaPath = path.join(profileDir, 'metadata.json');
    if (!fs.existsSync(metaPath)) {
      const isPrimary = index === 1;
      const defaultMeta = {
        id,
        index,
        name: isPrimary ? 'Основной аккаунт' : `Google Аккаунт #${index}`,
        email: isPrimary ? 'yataev91@gmail.com' : '',
        authType: isPrimary ? 'system' : 'api_key', // 'system' | 'api_key' | 'oauth'
        apiKey: '',
        isActive: true,
        status: isPrimary ? 'ready' : 'unconfigured',
        isPrimary,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(metaPath, JSON.stringify(defaultMeta, null, 2), 'utf8');
    }
  }

  listProfiles() {
    const list = [];
    for (let i = 1; i <= this.numSlots; i++) {
      const id = `profile_${i}`;
      const profileDir = path.join(this.baseDir, id);
      const metaPath = path.join(profileDir, 'metadata.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          // Mask API key in public list for security
          const maskedKey = meta.apiKey ? `${meta.apiKey.slice(0, 6)}...${meta.apiKey.slice(-4)}` : '';
          list.push({ 
            ...meta, 
            hasApiKey: Boolean(meta.apiKey),
            apiKeyMasked: maskedKey,
            path: profileDir 
          });
        } catch {
          list.push({ id, index: i, name: `Account #${i}`, isActive: true, status: 'unconfigured', path: profileDir });
        }
      }
    }
    return list;
  }

  getProfile(id) {
    const profileDir = path.join(this.baseDir, id);
    const metaPath = path.join(profileDir, 'metadata.json');
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        return { ...meta, path: profileDir };
      } catch {
        return null;
      }
    }
    return null;
  }

  updateProfile(id, updates) {
    const profileDir = path.join(this.baseDir, id);
    const metaPath = path.join(profileDir, 'metadata.json');
    if (!fs.existsSync(metaPath)) {
      throw new Error(`Profile ${id} does not exist`);
    }

    const current = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // If API key is provided, configure settings.json for gemini model provider
    const cliSettingsPath = path.join(profileDir, 'antigravity-cli', 'settings.json');
    if (updated.authType === 'api_key' && updated.apiKey) {
      updated.status = 'ready';
      if (fs.existsSync(cliSettingsPath)) {
        try {
          const s = JSON.parse(fs.readFileSync(cliSettingsPath, 'utf8'));
          s.modelProvider = 'gemini';
          fs.writeFileSync(cliSettingsPath, JSON.stringify(s, null, 2), 'utf8');
        } catch {}
      }
    } else if (updated.authType === 'system' || updated.isPrimary) {
      updated.status = 'ready';
    }

    fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  }

  resetProfile(id) {
    const profile = this.getProfile(id);
    if (!profile) return false;
    if (profile.isPrimary) return false; // don't reset primary account

    return this.updateProfile(id, {
      name: `Google Аккаунт #${profile.index}`,
      email: '',
      authType: 'api_key',
      apiKey: '',
      status: 'unconfigured',
      isActive: true
    });
  }

  getEnv(id) {
    const profile = this.getProfile(id);
    if (!profile) throw new Error(`Profile ${id} not found`);

    if (profile.isPrimary || id === 'profile_1') {
      return { ...process.env };
    }

    const env = {
      ...process.env,
      HOME: profile.path,
      AGY_HOME: profile.path,
      GEMINI_CLI_HOME: profile.path
    };

    if (profile.authType === 'api_key' && profile.apiKey) {
      env.GEMINI_API_KEY = profile.apiKey;
    }

    return env;
  }
}
