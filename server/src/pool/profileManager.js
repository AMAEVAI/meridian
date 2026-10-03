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

    // Ensure settings.json prevents accidental paid overage
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

    // Ensure metadata.json
    const metaPath = path.join(profileDir, 'metadata.json');
    if (!fs.existsSync(metaPath)) {
      const defaultMeta = {
        id,
        index,
        name: `Google Account #${index}`,
        email: null,
        isActive: true,
        status: index === 1 ? 'ready' : 'unconfigured',
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
          list.push({ ...meta, path: profileDir });
        } catch {
          list.push({ id, index: i, name: `Account #${i}`, isActive: true, status: 'error', path: profileDir });
        }
      }
    }
    return list;
  }

  getProfile(id) {
    return this.listProfiles().find(p => p.id === id) || null;
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
    fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  }

  getEnv(id) {
    const profile = this.getProfile(id);
    if (!profile) throw new Error(`Profile ${id} not found`);
    return {
      ...process.env,
      HOME: profile.path,
      AGY_HOME: profile.path,
      GEMINI_CLI_HOME: profile.path
    };
  }
}
