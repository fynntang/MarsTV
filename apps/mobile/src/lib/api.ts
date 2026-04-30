// Lightweight CMS API client for mobile — uses fetch (available in RN)
// No dependency on Next.js or Node.js APIs

import type { CmsSource, VideoItem, PlayLine } from '@marstv/core';

export interface SearchHit {
  source: CmsSource;
  item: VideoItem;
}

export interface MobileVideoDetail {
  source: CmsSource;
  item: VideoItem;
  lines: PlayLine[];
}

let _baseUrl = 'https://marstv.example.com';

export function setApiBase(url: string) {
  _baseUrl = url.replace(/\/$/, '');
}

export function getApiBase(): string {
  return _baseUrl;
}

export async function searchVideos(query: string): Promise<SearchHit[]> {
  try {
    const res = await fetch(`${_baseUrl}/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const data = await res.json();
    // Transform grouped results { source, items[] } into flat hits { source, item }[]
    const hits: SearchHit[] = [];
    for (const result of data) {
      for (const item of result.items) {
        hits.push({ source: result.source, item });
      }
    }
    return hits;
  } catch {
    return [];
  }
}

export async function loadMobileSources(): Promise<CmsSource[]> {
  const res = await fetch(`${_baseUrl}/api/health/cms`);
  if (!res.ok) throw new Error(`Failed to load sources: ${res.status}`);
  const data = await res.json();
  return data.sources ?? [];
}
