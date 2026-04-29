import { signProxyUrl } from '@/lib/proxy-auth';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const ORIGINAL_SECRET = process.env.PROXY_SECRET;

beforeEach(() => {
  process.env.PROXY_SECRET = 'integration-test-secret';
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.PROXY_SECRET;
  } else {
    process.env.PROXY_SECRET = ORIGINAL_SECRET;
  }
  vi.restoreAllMocks();
});

function buildProxyRequest(targetUrl: string, overrides?: { s?: string; e?: string }) {
  const { token, expiresAt } = signProxyUrl(targetUrl);
  const params = new URLSearchParams({
    u: targetUrl,
    e: overrides?.e ?? String(expiresAt),
    s: overrides?.s ?? token,
  });
  return new NextRequest(`http://app.local/api/proxy/m3u8?${params.toString()}`);
}

function mockFetchResponse(body: string | ReadableStream | null, init: ResponseInit) {
  const fn = vi.fn(async () => new Response(body, init));
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('/api/proxy/m3u8 — auth gate', () => {
  it('rejects missing params with 400', async () => {
    const res = await GET(new NextRequest('http://app.local/api/proxy/m3u8'));
    expect(res.status).toBe(400);
  });

  it('rejects tampered token with 403', async () => {
    const req = buildProxyRequest('https://cdn.example.com/a.m3u8', { s: 'not-a-real-token' });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('rejects expired token with 403', async () => {
    const past = String(Math.floor(Date.now() / 1000) - 10);
    const req = buildProxyRequest('https://cdn.example.com/a.m3u8', { e: past });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('rejects non-numeric expiresAt with 400', async () => {
    const req = buildProxyRequest('https://cdn.example.com/a.m3u8', { e: 'not-a-number' });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe('/api/proxy/m3u8 — SSRF gate', () => {
  it('blocks private IPs even when signed', async () => {
    const req = buildProxyRequest('http://127.0.0.1/evil.m3u8');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toMatch(/blocked host|invalid url/i);
  });

  it('blocks AWS metadata endpoint even when signed', async () => {
    const req = buildProxyRequest('http://169.254.169.254/latest/meta-data');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('blocks file: URLs even when signed', async () => {
    const req = buildProxyRequest('file:///etc/passwd');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe('/api/proxy/m3u8 — segment passthrough', () => {
  it('streams ts body with long-immutable cache headers', async () => {
    mockFetchResponse('raw-ts-bytes', {
      status: 200,
      headers: { 'content-type': 'video/mp2t' },
    });
    const req = buildProxyRequest('https://cdn.example.com/seg123.ts');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('video/mp2t');
    expect(res.headers.get('cache-control')).toContain('immutable');
    expect(res.headers.get('cdn-cache-control')).toContain('immutable');
    expect(res.headers.get('x-marstv-proxy')).toBe('segment');
  });

  it('returns 502 when upstream errors', async () => {
    mockFetchResponse(null, { status: 404 });
    const req = buildProxyRequest('https://cdn.example.com/missing.ts');
    const res = await GET(req);
    expect(res.status).toBe(502);
  });
});

describe('/api/proxy/m3u8 — playlist rewriting', () => {
  it('rewrites relative segment URIs to go through the proxy', async () => {
    const playlist = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXT-X-TARGETDURATION:10',
      '#EXTINF:10.0,',
      'seg1.ts',
      '#EXTINF:10.0,',
      'seg2.ts',
      '#EXT-X-ENDLIST',
    ].join('\n');
    mockFetchResponse(playlist, {
      status: 200,
      headers: { 'content-type': 'application/vnd.apple.mpegurl' },
    });
    const req = buildProxyRequest('https://cdn.example.com/path/index.m3u8');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('/api/proxy/m3u8?u=https%3A%2F%2Fcdn.example.com%2Fpath%2Fseg1.ts');
    expect(body).toContain('/api/proxy/m3u8?u=https%3A%2F%2Fcdn.example.com%2Fpath%2Fseg2.ts');
    // tags should pass through
    expect(body).toContain('#EXT-X-VERSION:3');
    expect(body).toContain('#EXTINF:10.0,');
    expect(res.headers.get('x-marstv-proxy')).toBe('manifest');
  });

  it('rewrites #EXT-X-KEY URI="" through the proxy', async () => {
    const playlist = [
      '#EXTM3U',
      '#EXT-X-KEY:METHOD=AES-128,URI="key.bin",IV=0x0',
      '#EXTINF:10,',
      'seg1.ts',
    ].join('\n');
    mockFetchResponse(playlist, {
      status: 200,
      headers: { 'content-type': 'application/vnd.apple.mpegurl' },
    });
    const req = buildProxyRequest('https://cdn.example.com/vod/play.m3u8');
    const res = await GET(req);
    const body = await res.text();
    // key URI is now proxy-wrapped
    expect(body).toMatch(/URI="http:\/\/app\.local\/api\/proxy\/m3u8\?u=/);
    expect(body).toContain('key.bin');
  });

  it('strips ad segments marked by DISCONTINUITY + short EXTINF (<3s)', async () => {
    const playlist = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXTINF:10.0,',
      'content1.ts',
      '#EXT-X-DISCONTINUITY',
      '#EXTINF:1.5,',
      'ad.ts', // should be dropped
      '#EXT-X-DISCONTINUITY',
      '#EXTINF:10.0,',
      'content2.ts',
      '#EXT-X-ENDLIST',
    ].join('\n');
    mockFetchResponse(playlist, {
      status: 200,
      headers: { 'content-type': 'application/vnd.apple.mpegurl' },
    });
    const req = buildProxyRequest('https://cdn.example.com/play.m3u8');
    const res = await GET(req);
    const body = await res.text();
    expect(body).not.toContain('ad.ts');
    expect(body).toContain('content1.ts');
    expect(body).toContain('content2.ts');
  });

  it('keeps long segments (>=3s) even after DISCONTINUITY', async () => {
    const playlist = [
      '#EXTM3U',
      '#EXTINF:10,',
      'a.ts',
      '#EXT-X-DISCONTINUITY',
      '#EXTINF:10,',
      'b.ts', // NOT an ad — duration is long
    ].join('\n');
    mockFetchResponse(playlist, {
      status: 200,
      headers: { 'content-type': 'application/vnd.apple.mpegurl' },
    });
    const req = buildProxyRequest('https://cdn.example.com/p.m3u8');
    const res = await GET(req);
    const body = await res.text();
    expect(body).toContain('a.ts');
    expect(body).toContain('b.ts');
    expect(body).toContain('#EXT-X-DISCONTINUITY');
  });

  it('treats .m3u8 path as playlist even when content-type lies', async () => {
    // Some upstreams mis-label playlists as text/plain.
    const playlist = '#EXTM3U\n#EXTINF:10,\nseg.ts\n';
    mockFetchResponse(playlist, {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });
    const req = buildProxyRequest('https://cdn.example.com/stream.m3u8');
    const res = await GET(req);
    expect(res.headers.get('x-marstv-proxy')).toBe('manifest');
    const body = await res.text();
    expect(body).toContain('/api/proxy/m3u8?u=');
  });

  it('signs rewritten segment URIs with a valid token (round-trip)', async () => {
    const playlist = ['#EXTM3U', '#EXTINF:10,', 'seg.ts'].join('\n');
    mockFetchResponse(playlist, {
      status: 200,
      headers: { 'content-type': 'application/vnd.apple.mpegurl' },
    });
    const req = buildProxyRequest('https://cdn.example.com/base/play.m3u8');
    const res = await GET(req);
    const body = await res.text();
    // Extract the rewritten URL for seg.ts and send it back through the proxy.
    const match = body.match(/\/api\/proxy\/m3u8\?u=[^\s]+/);
    expect(match).toBeTruthy();
    const rewrittenPath = match?.[0] ?? '';
    const subReq = new NextRequest(`http://app.local${rewrittenPath}`);
    // mock the segment fetch now
    mockFetchResponse('seg-bytes', {
      status: 200,
      headers: { 'content-type': 'video/mp2t' },
    });
    const subRes = await GET(subReq);
    expect(subRes.status).toBe(200); // token from rewriter verifies OK
    expect(subRes.headers.get('x-marstv-proxy')).toBe('segment');
  });
});
