// ============================================================================
// GET /api/image/cms?u=<url>
// Generic image proxy for CMS posters. Many CMS sources serve images from
// hosts that either block hotlinks, mismatch SSL, or break mixed-content
// rules in browser. We fetch server-side and stream bytes back with a long
// cache.
//
// Protections:
// 1. SSRF via assertSafeUrl (reused from /api/proxy/m3u8)
// 2. Upstream content-type must be image/*, else reject — prevents using this
//    as a generic open proxy for HTML/JSON.
// 3. 5 MB hard size cap — no-one's legitimate poster is that big.
// ============================================================================

import { requireApiPassword } from '@/lib/site-password-guard';
import { assertSafeUrl } from '@/lib/ssrf';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

const isDev = process.env.NODE_ENV !== 'production';

function logFail(target: URL, reason: string) {
  if (isDev) console.warn(`[image-cms] ${reason} — ${target.href}`);
}

export async function GET(request: NextRequest) {
  const auth = requireApiPassword(request);
  if (auth) return auth;

  const raw = request.nextUrl.searchParams.get('u');
  if (!raw) return new Response('missing u', { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
    assertSafeUrl(target);
  } catch (err) {
    return new Response(err instanceof Error ? err.message : 'invalid url', { status: 400 });
  }

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        // Some CMS image CDNs (lzzyimg/lzzypic/liangzipic) 403 or 502 without
        // a matching Referer. Use the image's own origin — safest guess that
        // still satisfies typical hotlink checks.
        referer: `${target.protocol}//${target.host}/`,
      },
      signal: ac.signal,
      // Opt out of Next's fetch-memoization — each poster request is unique
      // and we don't want dev-mode cached failures sticking around.
      cache: 'no-store',
    });
  } catch (err) {
    clearTimeout(timeout);
    const reason =
      err instanceof Error
        ? err.name === 'AbortError'
          ? `timeout after ${FETCH_TIMEOUT_MS}ms`
          : `fetch threw: ${err.message}`
        : 'fetch threw: unknown';
    logFail(target, reason);
    return new Response('upstream failed', { status: 502 });
  }
  clearTimeout(timeout);

  if (!upstream.ok || !upstream.body) {
    logFail(target, `upstream status ${upstream.status}`);
    return new Response('upstream failed', { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    return new Response('not an image', { status: 415 });
  }

  const contentLength = Number.parseInt(upstream.headers.get('content-length') ?? '0', 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
    return new Response('image too large', { status: 413 });
  }

  const body = upstream.body;
  if (!body) {
    return new Response('upstream failed', { status: 502 });
  }

  // Cap size even if Content-Length is missing/lying by counting bytes as we
  // pass them through.
  const cappedStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      let received = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          if (received > MAX_BYTES) {
            controller.error(new Error('max bytes exceeded'));
            return;
          }
          controller.enqueue(value);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(cappedStream, {
    status: 200,
    headers: {
      'content-type': contentType,
      // CMS poster URLs are effectively immutable once published.
      'cache-control': 'public, max-age=604800, immutable',
      'cdn-cache-control': 'max-age=31536000, immutable',
    },
  });
}
