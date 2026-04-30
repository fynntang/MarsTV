import type { CmsSource, VideoItem } from '../types';

export interface SourceHit {
  source: CmsSource;
  item: VideoItem;
}

export interface VideoGroup {
  key: string;
  primary: SourceHit;
  others: SourceHit[];
}

export function groupHitsByTitle(hits: SourceHit[]): VideoGroup[] {
  const map = new Map<string, VideoGroup>();
  for (const hit of hits) {
    const key = normalizeKey(hit.item.title, hit.item.year);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { key, primary: hit, others: [] });
      continue;
    }
    // Prevent duplicate source within the same group (same title appearing
    // multiple times in one CMS's results — uncommon but possible).
    if (
      existing.primary.source.key === hit.source.key ||
      existing.others.some((o) => o.source.key === hit.source.key)
    ) {
      continue;
    }
    existing.others.push(hit);
  }
  return [...map.values()];
}

function normalizeKey(title: string, year?: string): string {
  const normalized = title.replace(/\s+/g, '').replace(/[　]/g, '').toLowerCase();
  return `${normalized}|${year ?? ''}`;
}
