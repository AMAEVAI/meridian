import path from 'node:path';
import os from 'node:os';

const HOME = os.homedir();
export const STUDIO_ROOT = process.env.MERIDIAN_STUDIO_HOME || path.join(HOME, '.meridian-studio');
export const PROFILES_DIR = path.join(STUDIO_ROOT, 'profiles');
export const WORKSPACES_DIR = process.env.MERIDIAN_WORKSPACES || path.join(HOME, 'meridian-studio', 'workspaces');
export const AGY_BIN = process.env.MERIDIAN_AGY_PATH || '/Users/blackborz/.local/bin/agy';
export const NUM_SLOTS = 5;
export const SERVER_PORT = parseInt(process.env.PORT || '4000', 10);
