import type { CmsSource, VideoItem } from '@marstv/core';
import { getSources } from './source-storage';

export interface SearchHit {
  source: CmsSource;
  item: VideoItem;
}

let _apiBase = 'http://localhost:3000';

export function setApiBase(url: string): void {
  _apiBase = url.replace(/\/+$/, '');
}

export function getApiBase(): string {
  return _apiBase;
}

async function buildHeaders(): Promise<Record<string, string>> {
  try {
    const sources = await getSources();
    if (sources.length === 0) return {};
    return { 'X-Cms-Sources': JSON.stringify(sources) };
  } catch {
    return {};
  }
}

export async function searchVideos(query: string): Promise<SearchHit[]> {
  try {
    const res = await fetch(`${_apiBase}/api/search?q=${encodeURIComponent(query)}`, { headers: await buildHeaders() });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    const hits: SearchHit[] = [];
    for (const group of data) {
      const source = (group as { source?: CmsSource; items?: VideoItem[] })?.source;
      const items = (group as { source?: CmsSource; items?: VideoItem[] })?.items;
      if (source && Array.isArray(items)) {
        for (const item of items) {
          hits.push({ source, item });
        }
      }
    }
    return hits;
  } catch {
    return [];
  }
}

export async function fetchDoubanRankings(type: string, tag?: string, pageSize?: number) {
  try {
    const params = new URLSearchParams({
      type,
      tag: tag ?? '热门',
      pageSize: String(pageSize ?? 20),
    });
    const res = await fetch(`${_apiBase}/api/douban?${params}`, { headers: await buildHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getDetail(source: string, id: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${_apiBase}/api/detail?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}`,
      { headers: await buildHeaders() },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function fetchFavorites(): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(`${_apiBase}/api/storage/favorites`, { headers: await buildHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export async function fetchHistory(): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(`${_apiBase}/api/storage/history`, { headers: await buildHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export async function fetchSubscriptions(): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(`${_apiBase}/api/storage/subscriptions`, { headers: await buildHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export async function loginWithPassword(password: string): Promise<boolean> {
  try {
    const res = await fetch(`${_apiBase}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return res.status === 200;
  } catch {
    return true;
  }
}
