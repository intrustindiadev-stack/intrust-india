/**
 * DEPRECATED — this file is no longer the canonical Next.js config.
 *
 * All settings have been merged into next.config.mjs, which is the single
 * source of truth used by both local development and the VPS deploy pipeline
 * (deploy_vps.py packs next.config.mjs into every build artifact).
 *
 * This file is kept to avoid breaking any legacy references. It simply
 * re-exports the canonical config unchanged.
 */

// eslint-disable-next-line import/no-unresolved
export { default } from './next.config.mjs';
