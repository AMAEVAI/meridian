import { CooldownLadder } from './cooldownLadder.js';

export const ROUTING_STRATEGIES = {
  balanced: {
    id: 'balanced',
    name: 'Сбалансированная',
    desc: 'Оптимальный баланс надежности (50%), скорости (25%) и интеллекта (25%) с защитой квот.',
    weights: { reliability: 0.50, speed: 0.25, intelligence: 0.25 }
  },
  fastest: {
    id: 'fastest',
    name: 'Максимальная скорость',
    desc: 'Приоритет моделям с наименьшим TTFB и временем ответа (Gemini Flash, Groq, Cerebras).',
    weights: { reliability: 0.30, speed: 0.60, intelligence: 0.10 }
  },
  smartest: {
    id: 'smartest',
    name: 'Глубокий интеллект',
    desc: 'Приоритет сильнейшим моделям рассуждения (Gemini Pro, DeepSeek R1/V3, Llama 70B).',
    weights: { reliability: 0.30, speed: 0.10, intelligence: 0.60 }
  },
  least_exhausted: {
    id: 'least_exhausted',
    name: 'Защита квот (Headroom)',
    desc: 'Ротация в сторону аккаунтов с максимальным запасом свободных запросов.',
    weights: { reliability: 0.40, speed: 0.10, intelligence: 0.10 }
  },
  fusion: {
    id: 'fusion',
    name: 'Fusion (Синтез моделей)',
    desc: 'Параллельный опрос моделей с объединением ответов.',
    weights: { reliability: 0.50, speed: 0.25, intelligence: 0.25 }
  }
};

export class RouterEngine {
  constructor(options = {}) {
    this.profileManager = options.profileManager;
    this.providerManager = options.providerManager;
    this.usageTracker = options.usageTracker;
    this.cooldownLadder = options.cooldownLadder || new CooldownLadder();
    this.strategy = options.strategy || 'balanced';
    this.sessions = new Map(); // sessionId -> { profileId, lastActive }
    this.reliabilityScores = new Map(); // entityId -> { successes, failures }
  }

  setStrategy(strategyId) {
    if (ROUTING_STRATEGIES[strategyId]) {
      this.strategy = strategyId;
      return true;
    }
    return false;
  }

  getStrategy() {
    return this.strategy;
  }

  getStrategyConfig() {
    return ROUTING_STRATEGIES[this.strategy] || ROUTING_STRATEGIES.balanced;
  }

  recordOutcome(entityId, isSuccess) {
    const current = this.reliabilityScores.get(entityId) || { successes: 10, failures: 0 };
    if (isSuccess) {
      current.successes += 1;
      this.cooldownLadder.recordSuccess(entityId);
    } else {
      current.failures += 1;
    }
    this.reliabilityScores.set(entityId, current);
  }

  getReliability(entityId) {
    const rec = this.reliabilityScores.get(entityId);
    if (!rec) return 0.98; // Optimistic prior for new accounts
    const total = rec.successes + rec.failures;
    return total > 0 ? (rec.successes + 1) / (total + 2) : 0.98;
  }

  /**
   * Build unified list of all candidate targets (Google Accounts + External Providers)
   */
  getCandidates() {
    const candidates = [];

    // 1. Google Accounts from ProfileManager
    if (this.profileManager) {
      const profiles = this.profileManager.listProfiles();
      const profileIds = profiles.map(p => p.id);
      const usageMap = this.usageTracker ? this.usageTracker.getAllUsage(profileIds) : {};

      for (const p of profiles) {
        if (!p.isActive) continue;
        const usage = usageMap[p.id] || {};
        const req5h = usage.requestsLast5h || 0;
        const limit5h = 312;
        const headroom = Math.max(0, 1 - (req5h / limit5h));

        candidates.push({
          type: 'google_account',
          id: p.id,
          name: p.name,
          email: p.email,
          provider: 'google',
          modelId: 'gemini-3.8-flash',
          modelName: 'Gemini 3.8 Flash',
          apiKey: p.apiKey,
          hasApiKey: p.hasApiKey,
          isPrimary: p.isPrimary,
          latencyMs: p.latencyMs || 100,
          intelScore: 0.88,
          speedScore: Math.max(0.2, 1 - (p.latencyMs ? p.latencyMs / 1000 : 0.1)),
          headroom,
          requestsLast5h: req5h,
          requestsLast24h: usage.requestsLast24h || 0,
          isCoolingDown: this.cooldownLadder.isCoolingDown(p.id),
          cooldownRemainingMs: this.cooldownLadder.getCooldownRemainingMs(p.id)
        });
      }
    }

    // 2. External Providers from ProviderManager (Groq, OpenRouter, Cerebras, Custom)
    if (this.providerManager) {
      const providers = this.providerManager.getProviders();
      for (const prv of providers) {
        if (!prv.isEnabled || !prv.hasApiKey && prv.id !== 'custom') continue;
        const rawPrv = this.providerManager.getProvider(prv.id);

        for (const m of (prv.models || [])) {
          const candidateId = `ext_${prv.id}_${m.id}`;
          candidates.push({
            type: 'external_provider',
            id: candidateId,
            providerId: prv.id,
            name: `${prv.name} (${m.name})`,
            provider: prv.id,
            baseUrl: prv.baseUrl,
            apiKey: rawPrv?.apiKey || '',
            modelId: m.id,
            modelName: m.name,
            tier: m.tier,
            latencyMs: prv.latencyMs || 150,
            intelScore: m.intel || 0.85,
            speedScore: m.speed || 0.85,
            headroom: 0.95, // External free tier
            requestsLast5h: 0,
            requestsLast24h: 0,
            isCoolingDown: this.cooldownLadder.isCoolingDown(candidateId),
            cooldownRemainingMs: this.cooldownLadder.getCooldownRemainingMs(candidateId)
          });
        }
      }
    }

    return candidates;
  }

  /**
   * Score candidates using FreeLLMAPI multi-axis bandit formula:
   * base = w_rel*reliability + w_speed*speed + w_intel*intel
   * effective = base * headroomFactor * (coolingDown ? 0.01 : 1.0)
   */
  scoreCandidate(c) {
    const strategy = this.getStrategyConfig();
    const w = strategy.weights;

    const reliability = this.getReliability(c.id);
    const speed = c.speedScore || 0.8;
    const intelligence = c.intelScore || 0.85;
    const headroom = Math.max(0.05, c.headroom ?? 1.0);

    let baseScore = (w.reliability * reliability) + (w.speed * speed) + (w.intelligence * intelligence);

    if (this.strategy === 'least_exhausted') {
      // Headroom dominates completely
      baseScore = headroom * 0.8 + reliability * 0.2;
    }

    // Cooling down heavily penalizes the score
    const cooldownMultiplier = c.isCoolingDown ? 0.001 : 1.0;

    return baseScore * headroom * cooldownMultiplier;
  }

  /**
   * Get sorted fallback chain according to active routing strategy
   */
  getRankedChain(preferredModel = null) {
    const candidates = this.getCandidates();
    if (candidates.length === 0) return [];

    return candidates
      .map(c => {
        let score = this.scoreCandidate(c);
        // If a specific model was requested (e.g. gemini-3.8-flash, groq, etc.)
        if (preferredModel && preferredModel !== 'auto' && preferredModel !== 'fusion') {
          if (c.modelId === preferredModel || c.id === preferredModel || c.provider === preferredModel) {
            score += 2.0; // Preference boost
          }
        }
        return { ...c, computedScore: score };
      })
      .sort((a, b) => b.computedScore - a.computedScore);
  }

  /**
   * Execute task with resilient FreeLLMAPI-style failover ladder
   */
  async executeWithFailover({ prompt, preferredModel, runner, onFailover, onStatus }) {
    const chain = this.getRankedChain(preferredModel);
    if (chain.length === 0) {
      throw new Error('Нет доступных настроенных провайдеров или аккаунтов в пуле.');
    }

    let lastError = null;

    for (let i = 0; i < chain.length; i++) {
      const candidate = chain[i];

      // If candidate is cooling down and we have healthy non-cooling candidates, skip
      if (candidate.isCoolingDown && i < chain.length - 1) {
        continue;
      }

      if (onStatus) {
        onStatus({
          type: 'status',
          message: `Запрос через ${candidate.name} (${candidate.modelName})...`,
          candidateId: candidate.id,
          provider: candidate.provider,
          model: candidate.modelId
        });
      }

      try {
        const result = await runner(candidate);
        this.recordOutcome(candidate.id, true);
        return {
          ...result,
          usedCandidate: candidate
        };
      } catch (err) {
        lastError = err;
        this.recordOutcome(candidate.id, false);

        const msg = String(err.message || err).toLowerCase();
        const isQuotaExhausted = msg.includes('429') || 
                                 msg.includes('resource_exhausted') || 
                                 msg.includes('quota') || 
                                 msg.includes('rate limit') ||
                                 msg.includes('exhausted') ||
                                 msg.includes('too many requests') ||
                                 err.status === 429;

        const is5HourLimit = msg.includes('5-hour') || msg.includes('5h') || msg.includes('limit: 5');

        this.cooldownLadder.recordFailure(candidate.id, {
          is5HourLimit,
          reason: isQuotaExhausted ? 'Rate limit 429' : 'API error'
        });

        const nextCandidate = chain[i + 1];
        if (onFailover && nextCandidate) {
          onFailover({
            exhaustedCandidate: candidate,
            nextCandidate: nextCandidate,
            message: `⚠️ Лимит исчерпан на ${candidate.name}. Автоматическое переключение на ${nextCandidate.name}...`
          });
        }
      }
    }

    throw lastError || new Error('Все доступные модели и аккаунты в пуле временно исчерпали квоты.');
  }
}
