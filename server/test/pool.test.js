import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { ProfileManager } from '../src/pool/profileManager.js';
import { AccountRouter } from '../src/pool/accountRouter.js';

test('ProfileManager initializes 5 isolated profile slots', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-test-'));
  try {
    const manager = new ProfileManager({ baseDir: tmpDir, numSlots: 5 });
    const profiles = manager.listProfiles();
    
    assert.equal(profiles.length, 5);
    assert.equal(profiles[0].id, 'profile_1');
    assert.equal(profiles[4].id, 'profile_5');

    // Verify settings.json exists with useAiCredits: false
    for (let i = 1; i <= 5; i++) {
      const pDir = path.join(tmpDir, `profile_${i}`);
      assert.ok(fs.existsSync(pDir), `Directory profile_${i} must exist`);
      
      const settingsPath = path.join(pDir, 'antigravity-cli', 'settings.json');
      assert.ok(fs.existsSync(settingsPath), 'settings.json must exist');
      
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.equal(settings.useG1Credits, false);
      assert.equal(settings.useAiCredits, false);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('AccountRouter selects active profile with lowest 5h quota utilization', () => {
  const profiles = [
    { id: 'profile_1', isActive: true, status: 'ready' },
    { id: 'profile_2', isActive: true, status: 'ready' },
    { id: 'profile_3', isActive: false, status: 'paused' },
    { id: 'profile_4', isActive: true, status: 'ready' },
    { id: 'profile_5', isActive: true, status: 'ready' }
  ];

  const quotas = {
    profile_1: { gemini5h: 0.85, geminiWeekly: 0.50 },
    profile_2: { gemini5h: 0.20, geminiWeekly: 0.30 }, // lowest active
    profile_3: { gemini5h: 0.05, geminiWeekly: 0.10 }, // paused, should be skipped
    profile_4: { gemini5h: 0.45, geminiWeekly: 0.20 },
    profile_5: { gemini5h: 0.95, geminiWeekly: 0.90 }
  };

  const router = new AccountRouter();
  const selected = router.selectBestProfile(profiles, quotas);
  assert.equal(selected.id, 'profile_2');
});

test('AccountRouter handles failover when primary profile hits rate limit', async () => {
  const profiles = [
    { id: 'profile_1', isActive: true, status: 'ready' },
    { id: 'profile_2', isActive: true, status: 'ready' }
  ];

  const quotas = {
    profile_1: { gemini5h: 0.10 },
    profile_2: { gemini5h: 0.50 }
  };

  const router = new AccountRouter();
  let attempts = [];

  // Mock runner that fails on profile_1 with 429 and succeeds on profile_2
  const mockRunner = async (profile) => {
    attempts.push(profile.id);
    if (profile.id === 'profile_1') {
      const err = new Error('Rate limit exceeded: 429 RESOURCE_EXHAUSTED');
      err.status = 429;
      throw err;
    }
    return { success: true, result: 'Hello from profile_2' };
  };

  const result = await router.executeWithFailover({
    profiles,
    quotas,
    runner: mockRunner
  });

  assert.equal(result.success, true);
  assert.equal(result.result, 'Hello from profile_2');
  assert.deepEqual(attempts, ['profile_1', 'profile_2']);
});
