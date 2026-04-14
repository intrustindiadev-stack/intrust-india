/**
 * Shared .env.local loader for e2e tests.
 *
 * Reads .env.local from the project root (one directory above e2e_tests/)
 * and populates process.env with any missing values.
 *
 * Usage (at the top of every test file):
 *   import './load_env.mjs';
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename  = fileURLToPath(import.meta.url);
const __dirname   = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envFile     = path.join(projectRoot, '.env.local');

if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx < 0) continue;
        const key   = trimmed.slice(0, eqIdx).trim();
        let   value = trimmed.slice(eqIdx + 1).trim();
        // Strip surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!(key in process.env)) {
            process.env[key] = value;
        }
    }
    // Uncomment for debug:
    // console.log('  📂 Loaded .env.local from', envFile);
} else {
    // Silently skip — env vars may already be set in the shell
}

// Override APP_URL with E2E_APP_URL if set (allows testing against localhost)
if (process.env.E2E_APP_URL) {
    process.env.NEXT_PUBLIC_APP_URL = process.env.E2E_APP_URL;
}

