import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = process.env.CMS_SOURCES_JSON;

beforeEach(() => {
  vi.resetModules();
  delete process.env.CMS_SOURCES_JSON;
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.CMS_SOURCES_JSON;
  } else {
    process.env.CMS_SOURCES_JSON = ORIGINAL_ENV;
  }
  vi.restoreAllMocks();
});

function req(search: string) {
  return new NextRequest(`http://app.local/api/search?${search}`);
}

describe('/api/search — parameter validation', () => {
  it('returns 400 when q is missing', async () => {
    const { GET } = await import('./route');
    const res = await GET(req(''));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing required query parameter: q/);
  });

  it('treats whitespace-only q as missing (400)', async () => {
    const { GET } = await import('./route');
    const res = await GET(req('q=%20%20'));
    expect(res.status).toBe(400);
  });
});

describe('/api/search — no sources configured', () => {
  it('returns 200 with empty items + warning when CMS_SOURCES_JSON is unset', async () => {
    const { GET } = await import('./route');
    const res = await GET(req('q=hello'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
    expect(body.sourceStats).toEqual([]);
    expect(body.warning).toMatch(/No CMS sources configured/);
  });
});

describe('/api/search — source= filter', () => {
  it('returns 404 when the requested source key is not configured', async () => {
    process.env.CMS_SOURCES_JSON = JSON.stringify([
      { key: 'cms1', name: 'One', api: 'https://a/' },
    ]);
    const { GET } = await import('./route');
    const res = await GET(req('q=hello&source=ghost'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/source not found: ghost/);
  });
});

describe('/api/search — happy path', () => {
  it('delegates to aggregateSearch with the configured sources', async () => {
    process.env.CMS_SOURCES_JSON = JSON.stringify([
      { key: 'cms1', name: 'One', api: 'https://a.example/api.php/provide/vod' },
    ]);

    // Mock the core aggregator so we don't hit the network.
    vi.doMock('@marstv/core', async () => {
      const actual = await vi.importActual<Record<string, unknown>>('@marstv/core');
      return {
        ...actual,
        aggregateSearch: vi.fn(async () => ({
          items: [
            {
              source: 'cms1',
              id: '42',
              title: 'Test Show',
              year: '2024',
              cover: null,
              typeName: 'movie',
              area: 'us',
              remarks: null,
              updatedAt: null,
            },
          ],
          sourceStats: [{ source: 'cms1', ok: true, items: 1, latencyMs: 10 }],
        })),
      };
    });

    const { GET } = await import('./route');
    const res = await GET(req('q=hello'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toBe('Test Show');
    expect(body.sourceStats[0].source).toBe('cms1');
    // sanity: cache header set
    expect(res.headers.get('cache-control')).toContain('stale-while-revalidate');
  });

  it('clamps page > 5 to 5 (protects against abusive deep-paging)', async () => {
    process.env.CMS_SOURCES_JSON = JSON.stringify([
      { key: 'cms1', name: 'One', api: 'https://a.example/api' },
    ]);
    let observedMaxPage = -1;
    vi.doMock('@marstv/core', async () => {
      const actual = await vi.importActual<Record<string, unknown>>('@marstv/core');
      return {
        ...actual,
        aggregateSearch: vi.fn(async (_sources, _keyword, opts: { maxPage: number }) => {
          observedMaxPage = opts.maxPage;
          return { items: [], sourceStats: [] };
        }),
      };
    });
    const { GET } = await import('./route');
    await GET(req('q=hello&page=999'));
    expect(observedMaxPage).toBe(5);
  });
});

describe('/api/search — error propagation', () => {
  it('returns 500 with message when aggregateSearch throws', async () => {
    process.env.CMS_SOURCES_JSON = JSON.stringify([
      { key: 'cms1', name: 'One', api: 'https://a.example/api' },
    ]);
    vi.doMock('@marstv/core', async () => {
      const actual = await vi.importActual<Record<string, unknown>>('@marstv/core');
      return {
        ...actual,
        aggregateSearch: vi.fn(async () => {
          throw new Error('upstream on fire');
        }),
      };
    });
    const { GET } = await import('./route');
    const res = await GET(req('q=hello'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('upstream on fire');
  });
});
