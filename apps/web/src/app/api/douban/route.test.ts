import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function req(search: string) {
  return new NextRequest(`http://app.local/api/douban?${search}`);
}

// biome-ignore lint/suspicious/noExplicitAny: test stub bridges untyped vi.doMock factory
type DoubanImpl = (query: any) => any;

async function loadRoute(
  doubanImpl?: DoubanImpl,
): Promise<(request: NextRequest) => Promise<Response>> {
  if (doubanImpl) {
    vi.doMock('@marstv/core', async () => {
      const actual = await vi.importActual<Record<string, unknown>>('@marstv/core');
      return { ...actual, searchDouban: vi.fn(doubanImpl) };
    });
  }
  const mod = (await import('./route')) as { GET: (request: NextRequest) => Promise<Response> };
  return mod.GET;
}

describe('/api/douban — param validation', () => {
  it('returns 400 when type is missing', async () => {
    const GET = await loadRoute();
    const res = await GET(req('tag=%E7%83%AD%E9%97%A8'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/type/);
  });

  it('returns 400 when type is not movie|tv', async () => {
    const GET = await loadRoute();
    const res = await GET(req('type=book&tag=%E7%83%AD%E9%97%A8'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when tag is missing', async () => {
    const GET = await loadRoute();
    const res = await GET(req('type=movie'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/tag/);
  });

  it('treats whitespace-only tag as missing', async () => {
    const GET = await loadRoute();
    const res = await GET(req('type=movie&tag=%20%20'));
    expect(res.status).toBe(400);
  });
});

describe('/api/douban — happy path', () => {
  it('forwards type/tag and returns upstream items with SWR cache header', async () => {
    const args: unknown[] = [];
    const GET = await loadRoute((q: unknown) => {
      args.push(q);
      return Promise.resolve({
        items: [
          {
            id: '1',
            title: 'A',
            rate: '9.0',
            cover: '',
            url: '',
            isNew: false,
            playable: true,
          },
        ],
      });
    });
    const res = await GET(req('type=movie&tag=%E7%83%AD%E9%97%A8'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toBe('A');
    expect(args[0]).toMatchObject({ type: 'movie', tag: '热门', sort: 'recommend' });
    expect(res.headers.get('cache-control')).toContain('stale-while-revalidate');
  });

  it('clamps pagesize to at most 50', async () => {
    let observed = 0;
    const GET = await loadRoute((q: { pageSize: number }) => {
      observed = q.pageSize;
      return Promise.resolve({ items: [] });
    });
    await GET(req('type=movie&tag=x&pagesize=999'));
    expect(observed).toBe(50);
  });

  it('falls back to pagesize=20 when value is invalid (non-numeric)', async () => {
    let observed = 0;
    const GET = await loadRoute((q: { pageSize: number }) => {
      observed = q.pageSize;
      return Promise.resolve({ items: [] });
    });
    await GET(req('type=movie&tag=x&pagesize=NaN'));
    expect(observed).toBe(20);
  });

  it('falls back to pagestart=0 when value is negative', async () => {
    let observed = -1;
    const GET = await loadRoute((q: { pageStart: number }) => {
      observed = q.pageStart;
      return Promise.resolve({ items: [] });
    });
    await GET(req('type=movie&tag=x&pagestart=-1'));
    expect(observed).toBe(0);
  });

  it('accepts sort=rank and sort=time; rejects unknown sort (falls to recommend)', async () => {
    const sortsSeen: string[] = [];
    const GET = await loadRoute((q: { sort: string }) => {
      sortsSeen.push(q.sort);
      return Promise.resolve({ items: [] });
    });
    await GET(req('type=movie&tag=x&sort=rank'));
    await GET(req('type=movie&tag=x&sort=time'));
    await GET(req('type=movie&tag=x&sort=bogus'));
    expect(sortsSeen).toEqual(['rank', 'time', 'recommend']);
  });
});

describe('/api/douban — upstream failure', () => {
  it('returns 502 with the upstream error message', async () => {
    const GET = await loadRoute(() =>
      Promise.reject(new Error('HTTP 500 from douban: rate-limited')),
    );
    const res = await GET(req('type=movie&tag=x'));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/rate-limited/);
  });

  it('returns 502 when the upstream throws a non-Error value', async () => {
    const GET = await loadRoute(() => Promise.reject('string failure'));
    const res = await GET(req('type=movie&tag=x'));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('string failure');
  });
});
