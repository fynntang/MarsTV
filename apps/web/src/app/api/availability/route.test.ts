import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = process.env.CMS_SOURCES_JSON;

beforeEach(() => {
  // Availability uses a module-scope cache + in-flight map. Reset modules
  // between tests so the cache doesn't leak across specs.
  vi.resetModules();
  process.env.CMS_SOURCES_JSON = JSON.stringify([
    { key: 'cms1', name: 'One', api: 'https://a.example/api' },
    { key: 'cms2', name: 'Two', api: 'https://b.example/api' },
  ]);
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete (process.env as Record<string, string | undefined>).CMS_SOURCES_JSON;
  } else {
    process.env.CMS_SOURCES_JSON = ORIGINAL_ENV;
  }
  vi.restoreAllMocks();
});

function req(search: string) {
  return new NextRequest(`http://app.local/api/availability?${search}`);
}

type SearchImpl = (...args: any[]) => any;

async function loadRoute(impl?: SearchImpl): Promise<{
  GET: (request: NextRequest) => Promise<Response>;
  callCount: () => number;
}> {
  let calls = 0;
  if (impl) {
    vi.doMock('@marstv/core', async () => {
      const actual = await vi.importActual<Record<string, unknown>>('@marstv/core');
      return {
        ...actual,
        aggregateSearch: vi.fn(async (...args: unknown[]) => {
          calls += 1;
          return impl(...args);
        }),
      };
    });
  }
  const mod = (await import('./route')) as { GET: (request: NextRequest) => Promise<Response> };
  return { GET: mod.GET, callCount: () => calls };
}

describe('/api/availability — param validation', () => {
  it('returns 400 when q is missing', async () => {
    const { GET } = await loadRoute();
    const res = await GET(req(''));
    expect(res.status).toBe(400);
  });

  it('treats whitespace-only q as missing', async () => {
    const { GET } = await loadRoute();
    const res = await GET(req('q=%20%20'));
    expect(res.status).toBe(400);
  });
});

describe('/api/availability — no sources configured', () => {
  it('returns count=0 sourceCount=0 when CMS_SOURCES_JSON is empty', async () => {
    process.env.CMS_SOURCES_JSON = '';
    const { GET, callCount } = await loadRoute(async () => ({ items: [], sourceStats: [] }));
    const res = await GET(req('q=foo'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body).toEqual({ count: 0, sourceCount: 0 });
    // aggregateSearch is never called when there are no sources.
    expect(callCount()).toBe(0);
  });
});

describe('/api/availability — title filtering', () => {
  it('counts only items whose title contains the normalized keyword', async () => {
    const { GET } = await loadRoute(async () => ({
      items: [
        { source: 'cms1', id: '1', title: '凡人修仙传', year: '2020' },
        { source: 'cms1', id: '2', title: '凡人修仙传 第二季', year: '2021' },
        { source: 'cms2', id: '3', title: '凡人的故事', year: '2019' }, // substring "凡人" but we filter on full keyword
        { source: 'cms2', id: '4', title: '斗罗大陆', year: '2020' },
      ],
      sourceStats: [
        { source: 'cms1', ok: true, tookMs: 50, itemCount: 2 },
        { source: 'cms2', ok: true, tookMs: 60, itemCount: 2 },
      ],
    }));
    const res = await GET(req('q=%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0')); // 凡人修仙传
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    // only the two "凡人修仙传*" rows match the full keyword
    expect(body.count).toBe(2);
    // both sources returned items → sourceCount is 2
    expect(body.sourceCount).toBe(2);
  });

  it('is whitespace-insensitive in both title and keyword', async () => {
    const { GET } = await loadRoute(async () => ({
      items: [{ source: 'cms1', id: '1', title: 'A  B  C', year: '2020' }],
      sourceStats: [{ source: 'cms1', ok: true, tookMs: 10, itemCount: 1 }],
    }));
    const res = await GET(req('q=abc'));
    const body = (await res.json()) as any;
    expect(body.count).toBe(1);
  });

  it('excludes failed-or-empty sources from sourceCount', async () => {
    const { GET } = await loadRoute(async () => ({
      items: [{ source: 'cms1', id: '1', title: 'foo', year: '2020' }],
      sourceStats: [
        { source: 'cms1', ok: true, tookMs: 10, itemCount: 1 },
        { source: 'cms2', ok: false, tookMs: 10, itemCount: 0, error: 'timeout' },
      ],
    }));
    const res = await GET(req('q=foo'));
    const body = (await res.json()) as any;
    expect(body.sourceCount).toBe(1); // cms2 was failed → dropped
  });
});

describe('/api/availability — caching', () => {
  it('serves subsequent calls within TTL from cache (no second upstream call)', async () => {
    const { GET, callCount } = await loadRoute(async () => ({
      items: [{ source: 'cms1', id: '1', title: 'matrix', year: '1999' }],
      sourceStats: [{ source: 'cms1', ok: true, tookMs: 10, itemCount: 1 }],
    }));
    await GET(req('q=matrix'));
    await GET(req('q=matrix'));
    await GET(req('q=matrix'));
    expect(callCount()).toBe(1);
  });

  it('deduplicates concurrent in-flight requests for the same keyword', async () => {
    let resolveFn!: () => void;
    const gate = new Promise<void>((resolve) => {
      resolveFn = resolve;
    });
    const { GET, callCount } = await loadRoute(async () => {
      await gate;
      return {
        items: [{ source: 'cms1', id: '1', title: 'matrix', year: '1999' }],
        sourceStats: [{ source: 'cms1', ok: true, tookMs: 10, itemCount: 1 }],
      };
    });
    const p1 = GET(req('q=matrix'));
    const p2 = GET(req('q=matrix'));
    const p3 = GET(req('q=matrix'));
    resolveFn();
    await Promise.all([p1, p2, p3]);
    expect(callCount()).toBe(1); // inflight dedup collapsed 3 → 1
  });

  it('distinguishes different keywords by normalized form', async () => {
    const { GET, callCount } = await loadRoute(async (_sources, keyword: string) => ({
      items: [{ source: 'cms1', id: '1', title: keyword, year: '2020' }],
      sourceStats: [{ source: 'cms1', ok: true, tookMs: 10, itemCount: 1 }],
    }));
    await GET(req('q=alpha'));
    await GET(req('q=beta'));
    expect(callCount()).toBe(2);
  });
});

describe('/api/availability — error handling', () => {
  it('returns 502 when aggregateSearch throws', async () => {
    const { GET } = await loadRoute(async () => {
      throw new Error('all sources down');
    });
    const res = await GET(req('q=anything'));
    expect(res.status).toBe(502);
    const body = (await res.json()) as any;
    expect(body.error).toBe('all sources down');
  });
});
