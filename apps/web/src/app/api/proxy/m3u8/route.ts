// ============================================================================
// GET /api/proxy/m3u8?u=<targetUrl>&e=<expiresAt>&s=<hmacToken>
// - Rewrites relative segment URIs in the playlist to also go through proxy.
// - Strips ads heuristically (based on #EXT-X-DISCONTINUITY + short duration).
// - SSRF defense + HMAC token required.
// - Cache headers: `Cache-Control` for the browser, `CDN-Cache-Control` for
//   the edge (Vercel / Cloudflare / most CDNs parse it separately and it wins
//   over Cache-Control at the edge layer).
//   Manifests: short browser cache, slightly longer edge cache + SWR so the
//   edge can serve stale under load while revalidating in the background.
//   Segments: 1h browser cache, 1y edge cache + immutable (segments are
//   content-addressed — same URL always yields same bytes).
// ============================================================================

import { signProxyUrl, verifyProxyToken } from '@/lib/proxy-auth';
import { assertSafeUrl } from '@/lib/ssrf';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MANIFEST_CACHE = 'public, max-age=10, s-maxage=30, stale-while-revalidate=300';
const MANIFEST_CDN_CACHE = 'public, s-maxage=30, stale-while-revalidate=300';
const SEGMENT_CACHE = 'public, max-age=3600, s-maxage=31536000, immutable';
const SEGMENT_CDN_CACHE = 'public, s-maxage=31536000, immutable';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const target = searchParams.get('u');
  const expiresAt = Number(searchParams.get('e'));
  const token = searchParams.get('s');

  if (!target || !token || !Number.isFinite(expiresAt)) {
    return new Response('missing required params: u, e, s', { status: 400 });
  }
  if (!verifyProxyToken(target, expiresAt, token)) {
    return new Response('invalid or expired token', { status: 403 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
    assertSafeUrl(parsed);
  } catch (err) {
    return new Response(err instanceof Error ? err.message : 'invalid url', { status: 400 });
  }

  const upstream = await fetch(parsed.toString(), {
    headers: {
      accept: 'application/vnd.apple.mpegurl, application/x-mpegurl, */*',
      'user-agent': request.headers.get('user-agent') ?? 'MarsTV/0.1',
    },
  });

  if (!upstream.ok) {
    return new Response(`upstream error: ${upstream.status}`, { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') ?? '';
  const isPlaylist =
    contentType.includes('mpegurl') ||
    parsed.pathname.endsWith('.m3u8') ||
    parsed.pathname.endsWith('.m3u');

  if (!isPlaylist) {
    // Segment passthrough (ts/aac/fmp4 etc.)
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'content-type': contentType || 'application/octet-stream',
        'cache-control': SEGMENT_CACHE,
        'cdn-cache-control': SEGMENT_CDN_CACHE,
        'x-marstv-proxy': 'segment',
      },
    });
  }

  const text = await upstream.text();
  const rewritten = rewritePlaylist(text, parsed, `${origin}/api/proxy/m3u8`);

  return new Response(rewritten, {
    status: 200,
    headers: {
      'content-type': 'application/vnd.apple.mpegurl',
      'cache-control': MANIFEST_CACHE,
      'cdn-cache-control': MANIFEST_CDN_CACHE,
      'x-marstv-proxy': 'manifest',
    },
  });
}

function rewritePlaylist(body: string, base: URL, proxyEndpoint: string): string {
  const lines = body.split(/\r?\n/);
  const out: string[] = [];
  let skipNextSegment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    // Heuristic ad-strip: a DISCONTINUITY followed by an extremely short EXTINF is often an ad marker.
    if (trimmed === '#EXT-X-DISCONTINUITY') {
      const next = (lines[i + 1] ?? '').trim();
      const durMatch = next.match(/^#EXTINF:([\d.]+)/);
      if (durMatch && Number(durMatch[1]) < 3) {
        skipNextSegment = true;
        continue;
      }
    }

    if (trimmed.startsWith('#EXT-X-KEY') || trimmed.startsWith('#EXT-X-MAP')) {
      out.push(rewriteTagUri(trimmed, base, proxyEndpoint));
      continue;
    }

    if (!trimmed || trimmed.startsWith('#')) {
      out.push(line);
      continue;
    }

    if (skipNextSegment) {
      skipNextSegment = false;
      // Drop this segment line; also drop the preceding EXTINF we kept.
      if (out.length > 0 && (out[out.length - 1] ?? '').startsWith('#EXTINF')) {
        out.pop();
      }
      continue;
    }

    const abs = new URL(trimmed, base).toString();
    out.push(buildProxied(abs, proxyEndpoint));
  }

  return out.join('\n');
}

function rewriteTagUri(tag: string, base: URL, proxyEndpoint: string): string {
  return tag.replace(/URI="([^"]+)"/, (_m, uri: string) => {
    const abs = new URL(uri, base).toString();
    return `URI="${buildProxied(abs, proxyEndpoint)}"`;
  });
}

function buildProxied(targetUrl: string, proxyEndpoint: string): string {
  const { token, expiresAt } = signProxyUrl(targetUrl);
  const q = new URLSearchParams({ u: targetUrl, e: String(expiresAt), s: token });
  return `${proxyEndpoint}?${q.toString()}`;
}
