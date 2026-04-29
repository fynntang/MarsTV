// ============================================================================
// CMS source loader — read from env CMS_SOURCES_JSON at runtime.
// Format: JSON array of CmsSource. Empty/invalid → empty array (API returns []).
// Intentionally NO bundled sources to match project compliance stance.
// ============================================================================

import type { CmsSource } from '@marstv/core';

let cached: CmsSource[] | null = null;

export function loadSources(): CmsSource[] {
  if (cached) return cached;

  const raw = process.env.CMS_SOURCES_JSON;
  if (!raw) {
    cached = [];
    return cached;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('[MarsTV] CMS_SOURCES_JSON is not an array, ignoring');
      cached = [];
      return cached;
    }
    cached = parsed.filter(isValidSource);
    return cached;
  } catch (err) {
    console.warn('[MarsTV] Failed to parse CMS_SOURCES_JSON:', err);
    cached = [];
    return cached;
  }
}

function isValidSource(value: unknown): value is CmsSource {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return typeof s.key === 'string' && typeof s.name === 'string' && typeof s.api === 'string';
}

export function findSource(key: string): CmsSource | undefined {
  return loadSources().find((s) => s.key === key);
}
