import { AUTH_COOKIE_NAME, isEnabled, verifyToken } from '@/lib/site-password';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

type PageSearchParams = Record<string, string | string[] | undefined> | URLSearchParams | undefined;

function appendSearchParams(pathname: string, searchParams: PageSearchParams): string {
  if (!searchParams) return pathname;

  const params = new URLSearchParams();
  if (searchParams instanceof URLSearchParams) {
    searchParams.forEach((value, key) => params.append(key, value));
  } else {
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === 'string') params.append(key, value);
      else if (Array.isArray(value)) {
        for (const item of value) params.append(key, item);
      }
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export async function requirePagePassword(
  pathname: string,
  searchParams?: PageSearchParams,
): Promise<void> {
  if (!isEnabled()) return;

  const cookieStore = await cookies();
  if (verifyToken(cookieStore.get(AUTH_COOKIE_NAME)?.value)) return;

  if (pathname === '/login') redirect('/login');
  redirect(`/login?next=${encodeURIComponent(appendSearchParams(pathname, searchParams))}`);
}

export function requireApiPassword(request: NextRequest): Response | null {
  if (!isEnabled()) return null;
  if (verifyToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)) return null;
  return Response.json({ error: 'unauthorized: site password required' }, { status: 401 });
}
