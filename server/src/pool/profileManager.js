import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PROFILES_DIR, NUM_SLOTS, loadEnvFile } from '../config.js';

const DEFAULT_EMAILS = [
  'djislam095@gmail.com',
  'amaievislam91@gmail.com',
  'amaev.pro@gmail.com',
  'chechenstrike@gmail.com',
  'contact.suppressed@gmail.com'
];

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

    this.syncFromEnv();
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
    const defaultEmail = DEFAULT_EMAILS[index - 1] || '';

    if (!fs.existsSync(metaPath)) {
      const defaultMeta = {
        id,
        index,
        name: `Google Аккаунт #${index}`,
        email: defaultEmail,
        authType: 'api_key',
        apiKey: '',
        isActive: true,
        status: 'unconfigured',
        isPrimary: index === 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(metaPath, JSON.stringify(defaultMeta, null, 2), 'utf8');
    }
  }

  syncFromEnv() {
    const { parsed } = loadEnvFile();

    for (let i = 1; i <= this.numSlots; i++) {
      const id = `profile_${i}`;
      const profileDir = path.join(this.baseDir, id);
      const metaPath = path.join(profileDir, 'metadata.json');

      const envKey = parsed[`GOOGLE_API_KEY_${i}`] || 
                     parsed[`GEMINI_API_KEY_${i}`] ||
                     (i === 1 ? (parsed['GOOGLE_API_KEY'] || parsed['GEMINI_API_KEY']) : '');

      const envEmail = parsed[`GOOGLE_ACCOUNT_EMAIL_${i}`] || 
                       parsed[`GEMINI_ACCOUNT_EMAIL_${i}`] || 
                       DEFAULT_EMAILS[i - 1];

      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          let modified = false;

          if (envEmail && meta.email !== envEmail) {
            meta.email = envEmail;
            modified = true;
          }

          if (envKey && envKey.trim()) {
            const trimmedKey = envKey.trim();
            if (meta.apiKey !== trimmedKey) {
              meta.apiKey = trimmedKey;
              meta.authType = 'api_key';
              meta.status = 'ready';
              meta.isActive = true;
              modified = true;
            }
          }

          if (modified) {
            meta.updatedAt = new Date().toISOString();
            fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
          }
        } catch (e) {
          console.warn(`[ProfileManager] Failed syncing profile_${i} from .env:`, e.message);
        }
      }
    }
  }

  listProfiles() {
    // Dynamic refresh from .env on list
    this.syncFromEnv();

    const list = [];
    for (let i = 1; i <= this.numSlots; i++) {
      const id = `profile_${i}`;
      const profileDir = path.join(this.baseDir, id);
      const metaPath = path.join(profileDir, 'metadata.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          const { apiKey, ...safeMeta } = meta;
          const maskedKey = apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '';
          list.push({ 
            ...safeMeta, 
            hasApiKey: Boolean(apiKey),
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

    if (updated.apiKey) {
      updated.authType = 'api_key';
      updated.status = 'ready';
    }

    fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  }

  resetProfile(id) {
    const profile = this.getProfile(id);
    if (!profile) return false;

    return this.updateProfile(id, {
      name: `Google Аккаунт #${profile.index}`,
      email: DEFAULT_EMAILS[profile.index - 1] || '',
      authType: 'api_key',
      apiKey: '',
      status: 'unconfigured',
      isActive: true
    });
  }

  getEnv(id) {
    const profile = this.getProfile(id);
    if (!profile) throw new Error(`Profile ${id} not found`);

    // IMPORTANT: Always preserve system HOME so agy has full access to credentials/keyring
    const env = {
      ...process.env,
      HOME: process.env.HOME || os.homedir()
    };

    if (profile.apiKey) {
      env.GEMINI_API_KEY = profile.apiKey;
      env.GOOGLE_API_KEY = profile.apiKey;
    }

    return env;
  }
}
