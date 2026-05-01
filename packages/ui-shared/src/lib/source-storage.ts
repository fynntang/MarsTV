import type { CmsSource } from '@marstv/core';

export interface SourceStore {
  load(): Promise<CmsSource[]>;
  save(sources: CmsSource[]): Promise<void>;
}

let _sources: CmsSource[] = [];
let _initialized = false;
let _store: SourceStore | null = null;

function localStorageStore(): SourceStore {
  const key = 'marstv:cms-sources';
  return {
    async load() {
      if (typeof globalThis !== 'undefined') {
        const g = globalThis as { localStorage?: { getItem(k: string): string | null } };
        try {
          const raw = g.localStorage?.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
          }
        } catch {
          /* ignore */
        }
      }
      return [];
    },
    async save(sources: CmsSource[]) {
      if (typeof globalThis !== 'undefined') {
        const g = globalThis as { localStorage?: { setItem(k: string, v: string): void } };
        try {
          g.localStorage?.setItem(key, JSON.stringify(sources));
        } catch {
          /* quota */
        }
      }
    },
  };
}

export function setSourceStore(store: SourceStore): void {
  _store = store;
  _initialized = false;
}

function getStore(): SourceStore {
  if (_store) return _store;
  _store = localStorageStore();
  return _store;
}

export async function getSources(): Promise<CmsSource[]> {
  if (!_initialized) {
    const store = getStore();
    try {
      _sources = await store.load();
    } catch {
      _sources = [];
    }
    _initialized = true;
  }
  return [..._sources];
}

export async function setSources(sources: CmsSource[]): Promise<void> {
  const store = getStore();
  try {
    await store.save(sources);
    _sources = [...sources];
  } catch {
    console.error('[source-storage] failed to persist sources');
  }
}

export async function addSource(source: CmsSource): Promise<void> {
  const sources = await getSources();
  const idx = sources.findIndex((s) => s.key === source.key);
  if (idx >= 0) sources[idx] = source;
  else sources.push(source);
  await setSources(sources);
}

export async function removeSource(key: string): Promise<void> {
  const current = await getSources();
  const next = current.filter((s) => s.key !== key);
  if (next.length !== current.length) await setSources(next);
}
