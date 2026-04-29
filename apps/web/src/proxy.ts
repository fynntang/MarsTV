// ============================================================================
// Next.js 16 Proxy (formerly Middleware) — optional site-wide password gate.
//
// When `SITE_PASSWORD` is set, every page and API request must carry a valid
// auth cookie. Missing/invalid cookie:
//   - page request   → 302 redirect to /login?next=<original-path>
//   - API request    → 401 JSON body (so fetch() callers get something usable)
//
// Whitelist (see `config.matcher`): /login, /api/login, /api/health/*,
// _next internals, favicon. Without SITE_PASSWORD env the proxy short-
// circuits and acts as identity — no auth, no redirect.
// ============================================================================

import { AUTH_COOKIE_NAME, isEnabled, verifyToken } from '@/lib/site-password';
import { type NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  if (!isEnabled()) return NextResponse.next();

  const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (verifyToken(cookieValue)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized: site password required' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  // Preserve the requested path so the login form can bounce back after
  // successful auth. Skip if the requested path is already /login.
  if (pathname !== '/login') {
    loginUrl.searchParams.set('next', pathname + search);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Match everything except:
    // - /login (the auth page itself)
    // - /api/login (the auth endpoint)
    // - /api/health (deploy health probes must stay reachable)
    // - _next internals + favicon
    '/((?!_next/static|_next/image|favicon\\.ico|login|api/login|api/health).*)',
  ],
};
