import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = process.env.CMS_SOURCES_JSON;

beforeEach(() => {
  vi.resetModules();
  process.env.CMS_SOURCES_JSON = JSON.stringify([
    { key: 'cms1', name: 'One', api: 'https://a.example/api.php/provide/vod' },
    { key: 'cms2', name: 'Two', api: 'https://b.example/api.php/provide/vod' },
  ]);
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.CMS_SOURCES_JSON;
  } else {
    process.env.CMS_SOURCES_JSON = ORIGINAL_ENV;
  }
  vi.restoreAllMocks();
});

function req(body: unknown, { raw = false }: { raw?: boolean } = {}) {
  return new NextRequest('http://app.local/api/subscriptions/check', {
    method: 'POST',
    body: raw ? (body as string) : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

// biome-ignore lint/suspicious/noExplicitAny: test stub bridges untyped vi.doMock factory
type GetDetailImpl = (...args: any[]) => any;

async function loadRoute(
  impl?: GetDetailImpl,
): Promise<(request: NextRequest) => Promise<Response>> {
  if (impl) {
    vi.doMock('@marstv/core', async () => {
      const actual = await vi.importActual<Record<string, unknown>>('@marstv/core');
      return { ...actual, getDetail: vi.fn(impl) };
    });
  }
  const mod = (await import('./route')) as {
    POST: (request: NextRequest) => Promise<Response>;
  };
  return mod.POST;
}

describe('/api/subscriptions/check — body validation', () => {
  it('returns 400 when body is not valid JSON', async () => {
    const POST = await loadRoute();
    const res = await POST(req('not-json-at-all', { raw: true }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/json/i);
  });

  it('returns 400 when items is missing', async () => {
    const POST = await loadRoute();
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/array/);
  });

  it('returns 400 when items is not an array', async () => {
    const POST = await loadRoute();
    const res = await POST(req({ items: 'nope' }));
    expect(res.status).toBe(400);
  });
});

describe('/api/subscriptions/check — item normalization', () => {
  it('filters out entries missing source or id', async () => {
    const calls: unknown[] = [];
    const POST = await loadRoute(async (_src, id: string) => {
      calls.push(id);
      return { lines: [{ name: 'L1', episodes: [{ title: 'E1', url: 'u' }] }] };
    });
    const res = await POST(
      req({
        items: [
          { source: 'cms1', id: '1' }, // valid
          { source: 'cms1' }, // missing id
          { id: '2' }, // missing source
          { source: '', id: '3' }, // empty source
          { source: 'cms1', id: '' }, // empty id
          { source: 'cms1', id: '4' }, // valid
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(2);
    expect(calls).toEqual(['1', '4']);
  });

  it('caps processing at 50 items', async () => {
    let callCount = 0;
    const POST = await loadRoute(async () => {
      callCount += 1;
      return { lines: [{ name: 'L', episodes: [{ title: 'E', url: 'u' }] }] };
    });
    const items = Array.from({ length: 80 }, (_, i) => ({ source: 'cms1', id: String(i) }));
    const res = await POST(req({ items }));
    const body = await res.json();
    expect(body.results).toHaveLength(50);
    expect(callCount).toBe(50);
  });

  it('returns empty results when items array is empty', async () => {
    const POST = await loadRoute();
    const res = await POST(req({ items: [] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toEqual([]);
  });
});

describe('/api/subscriptions/check — per-item outcomes', () => {
  it('returns ok:false when source key is not configured', async () => {
    const POST = await loadRoute(async () => null);
    const res = await POST(req({ items: [{ source: 'ghost', id: '42' }] }));
    const body = await res.json();
    expect(body.results[0]).toEqual({
      source: 'ghost',
      id: '42',
      ok: false,
      error: 'source not configured',
    });
  });

  it('returns ok:false with "not found" when getDetail resolves null', async () => {
    const POST = await loadRoute(async () => null);
    const res = await POST(req({ items: [{ source: 'cms1', id: 'missing' }] }));
    const body = await res.json();
    expect(body.results[0]).toEqual({
      source: 'cms1',
      id: 'missing',
      ok: false,
      error: 'not found',
    });
  });

  it('reports the max-episode line on success', async () => {
    const POST = await loadRoute(async () => ({
      lines: [
        { name: 'line-short', episodes: [{ title: 'E1', url: 'u1' }] },
        {
          name: 'line-long',
          episodes: [
            { title: 'E1', url: 'u1' },
            { title: 'E2', url: 'u2' },
            { title: 'E3', url: 'u3' },
          ],
        },
        {
          name: 'line-medium',
          episodes: [
            { title: 'E1', url: 'u1' },
            { title: 'E2', url: 'u2' },
          ],
        },
      ],
    }));
    const res = await POST(req({ items: [{ source: 'cms1', id: '42' }] }));
    const body = await res.json();
    expect(body.results[0]).toEqual({
      source: 'cms1',
      id: '42',
      ok: true,
      episodeCount: 3,
      lineName: 'line-long',
    });
  });

  it('returns episodeCount=0 and no lineName when every line is empty', async () => {
    const POST = await loadRoute(async () => ({
      lines: [
        { name: 'line-a', episodes: [] },
        { name: 'line-b', episodes: [] },
      ],
    }));
    const res = await POST(req({ items: [{ source: 'cms1', id: '42' }] }));
    const body = await res.json();
    expect(body.results[0].ok).toBe(true);
    expect(body.results[0].episodeCount).toBe(0);
    expect(body.results[0].lineName).toBeUndefined();
  });

  it('captures thrown errors per-item without breaking the batch', async () => {
    const POST = await loadRoute(async (_src, id: string) => {
      if (id === 'boom') throw new Error('upstream dead');
      return { lines: [{ name: 'L', episodes: [{ title: 'E', url: 'u' }] }] };
    });
    const res = await POST(
      req({
        items: [
          { source: 'cms1', id: 'good' },
          { source: 'cms1', id: 'boom' },
          { source: 'cms1', id: 'also-good' },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(3);
    expect(body.results[0].ok).toBe(true);
    expect(body.results[1]).toEqual({
      source: 'cms1',
      id: 'boom',
      ok: false,
      error: 'upstream dead',
    });
    expect(body.results[2].ok).toBe(true);
  });

  it('stringifies non-Error throws', async () => {
    const POST = await loadRoute(async () => {
      throw 'string failure';
    });
    const res = await POST(req({ items: [{ source: 'cms1', id: '1' }] }));
    const body = await res.json();
    expect(body.results[0]).toEqual({
      source: 'cms1',
      id: '1',
      ok: false,
      error: 'string failure',
    });
  });
});

describe('/api/subscriptions/check — caching', () => {
  it('sets private max-age=60 cache header', async () => {
    const POST = await loadRoute(async () => null);
    const res = await POST(req({ items: [{ source: 'cms1', id: '1' }] }));
    expect(res.headers.get('cache-control')).toBe('private, max-age=60');
  });
});
