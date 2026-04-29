// ============================================================================
// POST /api/login  — exchange a password for an auth cookie.
//
// Body: { password: string } (JSON or form-encoded)
// 200 → sets `marstv_auth` cookie (HttpOnly, SameSite=Lax, Secure in prod)
// 401 → wrong password
// 503 → SITE_PASSWORD is not configured (gate disabled, login unreachable
//       anyway, but return a clear status so the login page can explain)
// ============================================================================

import {
  AUTH_COOKIE_NAME,
  createToken,
  getSitePassword,
  verifyPassword,
} from '@/lib/site-password';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const sitePassword = getSitePassword();
  if (sitePassword === null) {
    return Response.json({ error: 'site password is not configured' }, { status: 503 });
  }

  let input: string | undefined;
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const body = (await request.json()) as { password?: unknown };
      if (typeof body.password === 'string') input = body.password;
    } catch {
      // Falls through to 400 below.
    }
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await request.formData();
    const field = form.get('password');
    if (typeof field === 'string') input = field;
  }

  if (input === undefined) {
    return Response.json({ error: 'password field is required' }, { status: 400 });
  }

  if (!verifyPassword(input)) {
    return Response.json({ error: 'incorrect password' }, { status: 401 });
  }

  const token = createToken(sitePassword);
  const secure = process.env.NODE_ENV === 'production';
  // No Max-Age / Expires → session cookie; reseeded on next successful login.
  const cookie = [
    `${AUTH_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'set-cookie': cookie,
      'cache-control': 'no-store',
    },
  });
}
