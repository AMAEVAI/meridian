import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const HOME = os.homedir();

// Auto-load .env from possible locations (root, server root, etc.)
export function loadEnvFile() {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../.env'),
    path.resolve(path.dirname(new URL(import.meta.url).pathname), '../.env')
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        const parsed = {};
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            parsed[key] = val;
            process.env[key] = val;
          }
        }
        return { envPath, parsed };
      } catch (e) {
        console.warn(`[Config] Failed reading ${envPath}:`, e.message);
      }
    }
  }
  return { envPath: null, parsed: {} };
}

// Initial load
loadEnvFile();

export const STUDIO_ROOT = process.env.MERIDIAN_STUDIO_HOME || path.join(HOME, '.meridian-studio');
export const PROFILES_DIR = path.join(STUDIO_ROOT, 'profiles');
export const WORKSPACES_DIR = process.env.MERIDIAN_WORKSPACES || path.join(HOME, 'meridian-studio', 'workspaces');
export const AGY_BIN = process.env.MERIDIAN_AGY_PATH || '/Users/blackborz/.local/bin/agy';
export const NUM_SLOTS = 5;
export const SERVER_PORT = parseInt(process.env.PORT || '4000', 10);
