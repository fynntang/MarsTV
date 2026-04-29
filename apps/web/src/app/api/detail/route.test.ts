import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = process.env.CMS_SOURCES_JSON;

beforeEach(() => {
  vi.resetModules();
  process.env.CMS_SOURCES_JSON = JSON.stringify([
    { key: 'cms1', name: 'One', api: 'https://a.example/api.php/provide/vod' },
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

function req(search: string) {
  return new NextRequest(`http://app.local/api/detail?${search}`);
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
  const mod = (await import('./route')) as { GET: (request: NextRequest) => Promise<Response> };
  return mod.GET;
}

describe('/api/detail — param validation', () => {
  it('returns 400 when source is missing', async () => {
    const GET = await loadRoute();
    const res = await GET(req('id=42'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/source.*id/);
  });

  it('returns 400 when id is missing', async () => {
    const GET = await loadRoute();
    const res = await GET(req('source=cms1'));
    expect(res.status).toBe(400);
  });

  it('treats whitespace-only values as missing', async () => {
    const GET = await loadRoute();
    const res = await GET(req('source=%20&id=%20'));
    expect(res.status).toBe(400);
  });
});

describe('/api/detail — source lookup', () => {
  it('returns 404 when the source key is not configured', async () => {
    const GET = await loadRoute();
    const res = await GET(req('source=ghost&id=42'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/source not found: ghost/);
  });
});

describe('/api/detail — upstream results', () => {
  it('returns 404 when getDetail resolves to null (video not found)', async () => {
    const GET = await loadRoute(async () => null);
    const res = await GET(req('source=cms1&id=missing'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('video not found');
  });

  it('returns the detail on success with SWR cache header', async () => {
    const detail = {
      source: 'cms1',
      id: '42',
      title: 'The Matrix',
      year: '1999',
      cover: null,
      typeName: 'movie',
      area: 'us',
      remarks: null,
      description: null,
      updatedAt: null,
      lines: [
        {
          name: 'line1',
          episodes: [{ title: 'E1', url: 'https://cdn/a.m3u8' }],
        },
      ],
    };
    const GET = await loadRoute(async () => detail);
    const res = await GET(req('source=cms1&id=42'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('The Matrix');
    expect(res.headers.get('cache-control')).toContain('stale-while-revalidate');
  });

  it('passes the configured source to getDetail (not just the key string)', async () => {
    const captured: { source: { key: string; api: string } | null } = { source: null };
    const GET = await loadRoute(async (source: { key: string; api: string }) => {
      captured.source = source;
      return null;
    });
    await GET(req('source=cms1&id=42'));
    expect(captured.source).not.toBeNull();
    expect(captured.source?.key).toBe('cms1');
    expect(captured.source?.api).toBe('https://a.example/api.php/provide/vod');
  });

  it('returns 500 with message when getDetail throws', async () => {
    const GET = await loadRoute(async () => {
      throw new Error('upstream dead');
    });
    const res = await GET(req('source=cms1&id=42'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('upstream dead');
  });
});
