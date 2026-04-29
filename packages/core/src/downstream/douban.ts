// Douban integration — direct-proxy mode.
// Upstream: https://movie.douban.com/j/search_subjects
// Douban returns a simple `subjects` list used to surface curated rankings
// on the homepage. No auth required, but the endpoint is picky about UA/Referer.

import { fetchJson } from './fetch-helper';

export type DoubanMediaType = 'movie' | 'tv';

export interface DoubanItem {
  id: string;
  title: string;
  rate: string;
  cover: string;
  url: string;
  isNew: boolean;
  playable: boolean;
}

export interface DoubanQuery {
  type: DoubanMediaType;
  tag: string;
  pageSize?: number;
  pageStart?: number;
  sort?: 'recommend' | 'time' | 'rank';
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface DoubanResult {
  items: DoubanItem[];
}

interface UpstreamSubject {
  rate: string;
  cover_x: number;
  title: string;
  url: string;
  playable: boolean;
  cover: string;
  id: string;
  cover_y: number;
  is_new: boolean;
}

interface UpstreamResponse {
  subjects: UpstreamSubject[];
}

const UPSTREAM = 'https://movie.douban.com/j/search_subjects';

// Douban rejects requests without these two headers. Matching LibreTV's
// behaviour — no API key, just polite headers.
const HEADERS: Record<string, string> = {
  accept: 'application/json, text/plain, */*',
  referer: 'https://movie.douban.com/',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function clampSize(n: number | undefined, fallback: number, max: number): number {
  if (!Number.isFinite(n) || (n as number) < 1) return fallback;
  return Math.min(n as number, max);
}

export async function searchDouban(query: DoubanQuery): Promise<DoubanResult> {
  const pageSize = clampSize(query.pageSize, 20, 50);
  const pageStart = Math.max(0, Number.isFinite(query.pageStart) ? (query.pageStart as number) : 0);
  const sort = query.sort ?? 'recommend';

  const params = new URLSearchParams({
    type: query.type,
    tag: query.tag,
    sort,
    page_limit: String(pageSize),
    page_start: String(pageStart),
  });

  const url = `${UPSTREAM}?${params.toString()}`;
  const data = await fetchJson<UpstreamResponse>(url, {
    timeoutMs: query.timeoutMs ?? 8000,
    headers: HEADERS,
    signal: query.signal,
  });

  const subjects = Array.isArray(data?.subjects) ? data.subjects : [];
  return {
    items: subjects.map((s) => ({
      id: String(s.id ?? ''),
      title: String(s.title ?? ''),
      rate: String(s.rate ?? ''),
      cover: String(s.cover ?? ''),
      url: String(s.url ?? ''),
      isNew: Boolean(s.is_new),
      playable: Boolean(s.playable),
    })),
  };
}
