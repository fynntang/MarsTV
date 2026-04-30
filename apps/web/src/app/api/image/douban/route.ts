// ============================================================================
// GET /api/image/douban?u=<url>
// Thin pass-through for Douban poster images. Douban returns 418 on direct
// browser hotlinks (no Referer), so we fetch server-side with a proper Referer
// and stream the bytes back. Host is hard-whitelisted to doubanio.com to keep
// this from being used as an open image proxy.
// ============================================================================

import { requireApiPassword } from '@/lib/site-password-guard';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_HOST_SUFFIX = '.doubanio.com';

function isAllowed(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return null;
    if (!u.hostname.endsWith(ALLOWED_HOST_SUFFIX)) return null;
    return u;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = requireApiPassword(request);
  if (auth) return auth;

  const raw = request.nextUrl.searchParams.get('u');
  if (!raw) return new Response('missing u', { status: 400 });

  const target = isAllowed(raw);
  if (!target) return new Response('forbidden host', { status: 403 });

  const upstream = await fetch(target, {
    headers: {
      referer: 'https://movie.douban.com/',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
    // No body to send; let fetch infer GET.
  }).catch(() => null);

  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response('upstream failed', { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': contentType,
      // Posters are effectively immutable per Douban ID — cache aggressively.
      'cache-control': 'public, max-age=604800, immutable',
      'cdn-cache-control': 'max-age=31536000, immutable',
    },
  });
}
