// Lightweight CMS API client for mobile — uses fetch (available in RN)
// No dependency on Next.js or Node.js APIs

import type { CmsSource, VideoItem, PlayLine } from '@marstv/core';

export interface MobileSearchResult {
  source: CmsSource;
  items: VideoItem[];
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

export async function searchVideos(query: string): Promise<MobileSearchResult[]> {
  const res = await fetch(`${_baseUrl}/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

export async function loadMobileSources(): Promise<CmsSource[]> {
  const res = await fetch(`${_baseUrl}/api/health/cms`);
  if (!res.ok) throw new Error(`Failed to load sources: ${res.status}`);
  const data = await res.json();
  return data.sources ?? [];
}
