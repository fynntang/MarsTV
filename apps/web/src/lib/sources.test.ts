import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = process.env.CMS_SOURCES_JSON;

// sources.ts memoizes at module scope. Reset the module cache before each test
// so env changes take effect.
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete (process.env as Record<string, string | undefined>).CMS_SOURCES_JSON;
  } else {
    process.env.CMS_SOURCES_JSON = ORIGINAL_ENV;
  }
});

describe('loadSources', () => {
  it('returns empty array when env is unset', async () => {
    delete (process.env as Record<string, string | undefined>).CMS_SOURCES_JSON;
    const { loadSources } = await import('./sources');
    expect(loadSources()).toEqual([]);
  });

  it('parses a valid JSON array of sources', async () => {
    process.env.CMS_SOURCES_JSON = JSON.stringify([
      { key: 'a', name: 'Source A', api: 'https://a.example/api.php/provide/vod' },
      { key: 'b', name: 'Source B', api: 'https://b.example/api.php/provide/vod' },
    ]);
    const { loadSources } = await import('./sources');
    const out = loadSources();
    expect(out).toHaveLength(2);
    expect(out[0]?.key).toBe('a');
  });

  it('filters out entries missing required fields', async () => {
    process.env.CMS_SOURCES_JSON = JSON.stringify([
      { key: 'good', name: 'OK', api: 'https://ok.example/api' },
      { key: 'no-api', name: 'Missing API' },
      { name: 'no-key', api: 'https://x/y' },
      'not-an-object',
      null,
    ]);
    const { loadSources } = await import('./sources');
    const out = loadSources();
    expect(out).toHaveLength(1);
    expect(out[0]?.key).toBe('good');
  });

  it('returns empty on malformed JSON', async () => {
    process.env.CMS_SOURCES_JSON = '{this is not json';
    const { loadSources } = await import('./sources');
    expect(loadSources()).toEqual([]);
  });

  it('returns empty when JSON root is not an array', async () => {
    process.env.CMS_SOURCES_JSON = JSON.stringify({ key: 'a', name: 'A', api: 'https://x' });
    const { loadSources } = await import('./sources');
    expect(loadSources()).toEqual([]);
  });

  it('caches the parsed result across calls within the same module load', async () => {
    process.env.CMS_SOURCES_JSON = JSON.stringify([{ key: 'a', name: 'A', api: 'https://a/' }]);
    const { loadSources } = await import('./sources');
    const first = loadSources();
    // mutate env — the in-module cache should still return the first result.
    process.env.CMS_SOURCES_JSON = JSON.stringify([]);
    const second = loadSources();
    expect(second).toBe(first);
  });
});

describe('findSource', () => {
  it('returns the source by key', async () => {
    process.env.CMS_SOURCES_JSON = JSON.stringify([
      { key: 'cms1', name: 'One', api: 'https://a/' },
      { key: 'cms2', name: 'Two', api: 'https://b/' },
    ]);
    const { findSource } = await import('./sources');
    expect(findSource('cms2')?.name).toBe('Two');
  });

  it('returns undefined when the key is not found', async () => {
    process.env.CMS_SOURCES_JSON = JSON.stringify([
      { key: 'cms1', name: 'One', api: 'https://a/' },
    ]);
    const { findSource } = await import('./sources');
    expect(findSource('ghost')).toBeUndefined();
  });
});
