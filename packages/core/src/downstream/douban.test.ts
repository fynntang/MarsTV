import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchDouban } from './douban';

interface RecordedCall {
  url: string;
  init: RequestInit | undefined;
}

function stubFetch(responder: (url: string, init?: RequestInit) => Response | Promise<Response>): {
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return responder(url, init);
  });
  vi.stubGlobal('fetch', fn);
  return { calls };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('searchDouban — request shape', () => {
  it('hits movie.douban.com/j/search_subjects with type + tag + sort params', async () => {
    const { calls } = stubFetch(
      () => new Response(JSON.stringify({ subjects: [] }), { status: 200 }),
    );
    await searchDouban({ type: 'movie', tag: '热门' });
    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]?.url ?? '');
    expect(url.origin).toBe('https://movie.douban.com');
    expect(url.pathname).toBe('/j/search_subjects');
    expect(url.searchParams.get('type')).toBe('movie');
    expect(url.searchParams.get('tag')).toBe('热门');
    expect(url.searchParams.get('sort')).toBe('recommend');
    expect(url.searchParams.get('page_limit')).toBe('20');
    expect(url.searchParams.get('page_start')).toBe('0');
  });

  it('sends Referer + UA headers (upstream rejects bare requests)', async () => {
    const { calls } = stubFetch(
      () => new Response(JSON.stringify({ subjects: [] }), { status: 200 }),
    );
    await searchDouban({ type: 'tv', tag: '热门' });
    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get('referer')).toBe('https://movie.douban.com/');
    expect(headers.get('user-agent')).toMatch(/Mozilla/);
  });

  it('forwards sort=rank when requested', async () => {
    const { calls } = stubFetch(
      () => new Response(JSON.stringify({ subjects: [] }), { status: 200 }),
    );
    await searchDouban({ type: 'movie', tag: '热门', sort: 'rank' });
    const url = new URL(calls[0]?.url ?? '');
    expect(url.searchParams.get('sort')).toBe('rank');
  });

  it('clamps pageSize above 50 to 50', async () => {
    const { calls } = stubFetch(
      () => new Response(JSON.stringify({ subjects: [] }), { status: 200 }),
    );
    await searchDouban({ type: 'movie', tag: '热门', pageSize: 999 });
    const url = new URL(calls[0]?.url ?? '');
    expect(url.searchParams.get('page_limit')).toBe('50');
  });

  it('falls back to 20 when pageSize is not positive', async () => {
    const { calls } = stubFetch(
      () => new Response(JSON.stringify({ subjects: [] }), { status: 200 }),
    );
    await searchDouban({ type: 'movie', tag: '热门', pageSize: 0 });
    const url = new URL(calls[0]?.url ?? '');
    expect(url.searchParams.get('page_limit')).toBe('20');
  });

  it('coerces negative pageStart to 0', async () => {
    const { calls } = stubFetch(
      () => new Response(JSON.stringify({ subjects: [] }), { status: 200 }),
    );
    await searchDouban({ type: 'movie', tag: '热门', pageStart: -10 });
    const url = new URL(calls[0]?.url ?? '');
    expect(url.searchParams.get('page_start')).toBe('0');
  });
});

describe('searchDouban — response mapping', () => {
  it('maps upstream subjects to DoubanItem shape (snake→camel, string coerce)', async () => {
    stubFetch(
      () =>
        new Response(
          JSON.stringify({
            subjects: [
              {
                id: 123,
                title: 'Inception',
                rate: '8.9',
                cover: 'https://img/cover.jpg',
                url: 'https://movie.douban.com/subject/123/',
                cover_x: 100,
                cover_y: 150,
                is_new: true,
                playable: true,
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const out = await searchDouban({ type: 'movie', tag: '热门' });
    expect(out.items).toHaveLength(1);
    expect(out.items[0]).toEqual({
      id: '123', // coerced to string
      title: 'Inception',
      rate: '8.9',
      cover: 'https://img/cover.jpg',
      url: 'https://movie.douban.com/subject/123/',
      isNew: true, // snake→camel
      playable: true,
    });
  });

  it('tolerates missing fields (defaults to empty strings + false booleans)', async () => {
    stubFetch(
      () =>
        new Response(
          JSON.stringify({
            subjects: [{}, { title: 'Only Title' }],
          }),
          { status: 200 },
        ),
    );
    const out = await searchDouban({ type: 'movie', tag: '热门' });
    expect(out.items).toHaveLength(2);
    expect(out.items[0]).toEqual({
      id: '',
      title: '',
      rate: '',
      cover: '',
      url: '',
      isNew: false,
      playable: false,
    });
    expect(out.items[1]?.title).toBe('Only Title');
  });

  it('returns empty items when subjects is missing or not an array', async () => {
    stubFetch(() => new Response(JSON.stringify({}), { status: 200 }));
    const out = await searchDouban({ type: 'movie', tag: '热门' });
    expect(out.items).toEqual([]);
  });
});

describe('searchDouban — error handling', () => {
  it('rejects with FetchHttpError when upstream returns 500', async () => {
    stubFetch(() => new Response('internal err', { status: 500 }));
    await expect(searchDouban({ type: 'movie', tag: '热门' })).rejects.toThrow(/HTTP 500/);
  });

  it('rejects with FetchTimeoutError when upstream stalls past timeoutMs', async () => {
    stubFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );
    await expect(searchDouban({ type: 'movie', tag: '热门', timeoutMs: 30 })).rejects.toThrow(
      /timeout/i,
    );
  });

  it('honours an external AbortSignal', async () => {
    stubFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );
    const ac = new AbortController();
    const p = searchDouban({ type: 'movie', tag: '热门', signal: ac.signal, timeoutMs: 99999 });
    ac.abort();
    await expect(p).rejects.toThrow();
  });
});
