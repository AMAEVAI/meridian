import fs from 'node:fs';
import path from 'node:path';
import { STUDIO_ROOT, loadEnvFile } from '../config.js';

export const KNOWN_EXTERNAL_PROVIDERS = [
  {
    id: 'groq',
    name: 'Groq Cloud',
    description: 'Сверхбыстрый свободный инференс LPU (~300 токенов/сек)',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', tier: 'Large', intel: 0.88, speed: 0.98 },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', tier: 'Small', intel: 0.65, speed: 1.0 },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', tier: 'Large', intel: 0.92, speed: 0.94 }
    ],
    getKeyUrl: 'https://console.groq.com/keys',
    freeRpd: 14400,
    freeRpm: 30
  },
  {
    id: 'openrouter',
    name: 'OpenRouter Free Pool',
    description: 'Десятки бесплатных открытых моделей (:free) без кредитной карты',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', tier: 'Frontier', intel: 0.97, speed: 0.75 },
      { id: 'deepseek/deepseek-chat:free', name: 'DeepSeek V3 (Free)', tier: 'Frontier', intel: 0.95, speed: 0.80 },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', tier: 'Large', intel: 0.88, speed: 0.85 },
      { id: 'mistralai/mistral-nemo:free', name: 'Mistral Nemo 12B (Free)', tier: 'Medium', intel: 0.78, speed: 0.90 }
    ],
    getKeyUrl: 'https://openrouter.ai/keys',
    freeRpd: 2000,
    freeRpm: 20
  },
  {
    id: 'cerebras',
    name: 'Cerebras Wafer-Scale',
    description: 'Ультра-скоростной инференс Wafer-Scale Engine (~1000 токенов/сек)',
    baseUrl: 'https://api.cerebras.ai/v1',
    models: [
      { id: 'llama3.3-70b', name: 'Cerebras Llama 3.3 70B', tier: 'Large', intel: 0.88, speed: 1.0 }
    ],
    getKeyUrl: 'https://cloud.cerebras.ai',
    freeRpd: 1000,
    freeRpm: 30
  },
  {
    id: 'custom',
    name: 'Custom / Local (Ollama, LM Studio, vLLM)',
    description: 'Любой совместимый OpenAI-эндпоинт (локальный или удалённый)',
    baseUrl: 'http://localhost:11434/v1',
    models: [
      { id: 'custom-model', name: 'Локальная модель (Default)', tier: 'Custom', intel: 0.80, speed: 0.85 }
    ],
    getKeyUrl: '',
    freeRpd: 999999,
    freeRpm: 999
  }
];

export class ProviderManager {
  constructor(options = {}) {
    this.storePath = path.join(STUDIO_ROOT, 'providers.json');
    this.providers = this.load();
    this.syncFromEnv();
  }

  load() {
    try {
      if (fs.existsSync(this.storePath)) {
        return JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
      }
    } catch (e) {
      console.warn('[ProviderManager] Failed loading providers:', e.message);
    }

    // Default configuration with known templates
    const initial = {};
    for (const p of KNOWN_EXTERNAL_PROVIDERS) {
      initial[p.id] = {
        id: p.id,
        name: p.name,
        description: p.description,
        baseUrl: p.baseUrl,
        apiKey: '',
        isEnabled: false,
        models: p.models,
        freeRpd: p.freeRpd,
        freeRpm: p.freeRpm,
        getKeyUrl: p.getKeyUrl,
        latencyMs: null,
        status: 'unconfigured'
      };
    }
    return initial;
  }

  save() {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storePath, JSON.stringify(this.providers, null, 2), 'utf8');
    } catch (e) {
      console.warn('[ProviderManager] Failed saving providers:', e.message);
    }
  }

  syncFromEnv() {
    const { parsed } = loadEnvFile();
    let changed = false;

    // Groq
    const groqKey = parsed['GROQ_API_KEY'] || process.env.GROQ_API_KEY;
    if (groqKey && (!this.providers['groq']?.apiKey || this.providers['groq'].apiKey !== groqKey)) {
      if (!this.providers['groq']) this.providers['groq'] = { id: 'groq', name: 'Groq Cloud', models: KNOWN_EXTERNAL_PROVIDERS[0].models };
      this.providers['groq'].apiKey = groqKey.trim();
      this.providers['groq'].isEnabled = true;
      this.providers['groq'].status = 'ready';
      changed = true;
    }

    // OpenRouter
    const openrouterKey = parsed['OPENROUTER_API_KEY'] || process.env.OPENROUTER_API_KEY;
    if (openrouterKey && (!this.providers['openrouter']?.apiKey || this.providers['openrouter'].apiKey !== openrouterKey)) {
      if (!this.providers['openrouter']) this.providers['openrouter'] = { id: 'openrouter', name: 'OpenRouter Free Pool', models: KNOWN_EXTERNAL_PROVIDERS[1].models };
      this.providers['openrouter'].apiKey = openrouterKey.trim();
      this.providers['openrouter'].isEnabled = true;
      this.providers['openrouter'].status = 'ready';
      changed = true;
    }

    // Cerebras
    const cerebrasKey = parsed['CEREBRAS_API_KEY'] || process.env.CEREBRAS_API_KEY;
    if (cerebrasKey && (!this.providers['cerebras']?.apiKey || this.providers['cerebras'].apiKey !== cerebrasKey)) {
      if (!this.providers['cerebras']) this.providers['cerebras'] = { id: 'cerebras', name: 'Cerebras Wafer-Scale', models: KNOWN_EXTERNAL_PROVIDERS[2].models };
      this.providers['cerebras'].apiKey = cerebrasKey.trim();
      this.providers['cerebras'].isEnabled = true;
      this.providers['cerebras'].status = 'ready';
      changed = true;
    }

    // Custom
    const customUrl = parsed['CUSTOM_OPENAI_BASE_URL'] || process.env.CUSTOM_OPENAI_BASE_URL;
    const customKey = parsed['CUSTOM_OPENAI_API_KEY'] || process.env.CUSTOM_OPENAI_API_KEY;
    if (customUrl) {
      if (!this.providers['custom']) this.providers['custom'] = { id: 'custom', name: 'Custom / Local', models: KNOWN_EXTERNAL_PROVIDERS[3].models };
      this.providers['custom'].baseUrl = customUrl.trim();
      if (customKey) this.providers['custom'].apiKey = customKey.trim();
      this.providers['custom'].isEnabled = true;
      this.providers['custom'].status = 'ready';
      changed = true;
    }

    if (changed) this.save();
  }

  getProviders() {
    this.syncFromEnv();
    const result = [];
    for (const p of KNOWN_EXTERNAL_PROVIDERS) {
      const stored = this.providers[p.id] || {};
      const hasKey = Boolean(stored.apiKey && stored.apiKey.length > 5);
      const masked = hasKey ? `${stored.apiKey.slice(0, 4)}...${stored.apiKey.slice(-4)}` : '';
      result.push({
        ...p,
        ...stored,
        apiKey: undefined, // Never leak full key to client
        hasApiKey: hasKey,
        apiKeyMasked: masked,
        isEnabled: Boolean(stored.isEnabled && hasKey)
      });
    }
    return result;
  }

  getProvider(id) {
    return this.providers[id] || null;
  }

  updateProvider(id, updates) {
    if (!this.providers[id]) {
      const template = KNOWN_EXTERNAL_PROVIDERS.find(k => k.id === id);
      if (!template) throw new Error(`Unknown provider: ${id}`);
      this.providers[id] = { ...template };
    }

    if (updates.apiKey !== undefined && typeof updates.apiKey === 'string') {
      const trimmed = updates.apiKey.trim();
      this.providers[id].apiKey = trimmed;
      if (trimmed) {
        this.providers[id].hasApiKey = true;
        this.providers[id].isEnabled = updates.isEnabled !== undefined ? updates.isEnabled : true;
        this.providers[id].status = 'ready';
      } else {
        this.providers[id].hasApiKey = false;
        this.providers[id].isEnabled = false;
        this.providers[id].status = 'unconfigured';
      }
    }

    if (updates.isEnabled !== undefined) {
      this.providers[id].isEnabled = Boolean(updates.isEnabled);
    }
    if (updates.baseUrl !== undefined) {
      this.providers[id].baseUrl = updates.baseUrl.trim();
    }
    if (updates.status !== undefined) {
      this.providers[id].status = updates.status;
    }
    if (updates.latencyMs !== undefined) {
      this.providers[id].latencyMs = updates.latencyMs;
    }

    this.save();
    return this.getProvider(id);
  }

  async testProvider(id) {
    const p = this.getProvider(id);
    if (!p) throw new Error(`Provider ${id} not found`);
    if (!p.apiKey && id !== 'custom') throw new Error(`No API key set for ${p.name}`);

    const t0 = Date.now();
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (p.apiKey) {
        headers['Authorization'] = `Bearer ${p.apiKey}`;
      }

      // Quick test call to /models endpoint
      const res = await fetch(`${p.baseUrl.replace(/\/$/, '')}/models`, {
        method: 'GET',
        headers
      });

      const latency = Date.now() - t0;
      if (res.ok) {
        this.updateProvider(id, { status: 'ready', latencyMs: latency });
        return { success: true, latency, message: `${p.name} онлайн (${latency}ms)` };
      } else {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson?.error?.message || `HTTP ${res.status}`;
        this.updateProvider(id, { status: 'error', latencyMs: latency });
        return { success: false, latency, error: msg };
      }
    } catch (err) {
      this.updateProvider(id, { status: 'error' });
      return { success: false, error: err.message };
    }
  }
}
