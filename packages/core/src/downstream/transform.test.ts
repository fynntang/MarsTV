import { describe, expect, it } from 'vitest';
import type { CmsSource, VideoItem } from '../types';
import { type SourceHit, groupHitsByTitle } from './transform';

const srcA: CmsSource = { key: 'a', name: 'A源', api: 'https://a.test' };
const srcB: CmsSource = { key: 'b', name: 'B源', api: 'https://b.test' };
const srcC: CmsSource = { key: 'c', name: 'C源', api: 'https://c.test' };

function mkItem(source: string, id: string, title: string, year?: string): VideoItem {
  return { source, id, title, year };
}

function hit(source: CmsSource, item: VideoItem): SourceHit {
  return { source, item };
}

describe('groupHitsByTitle', () => {
  it('groups same title+year across sources with first hit as primary', () => {
    const groups = groupHitsByTitle([
      hit(srcA, mkItem('a', '1', '流浪地球', '2019')),
      hit(srcB, mkItem('b', '99', '流浪地球', '2019')),
    ]);

    expect(groups).toHaveLength(1);
    const g1 = groups[0]!;
    expect(g1.primary.source.key).toBe('a');
    expect(g1.others).toHaveLength(1);
    expect(g1.others[0]!.source.key).toBe('b');
  });

  it('treats different years as different groups even when title matches', () => {
    const groups = groupHitsByTitle([
      hit(srcA, mkItem('a', '1', '流浪地球', '2019')),
      hit(srcA, mkItem('a', '2', '流浪地球', '2023')),
    ]);

    expect(groups).toHaveLength(2);
  });

  it('normalizes whitespace and full-width spaces in title', () => {
    const groups = groupHitsByTitle([
      hit(srcA, mkItem('a', '1', '流浪 地球', '2019')),
      hit(srcB, mkItem('b', '2', '流浪　地球', '2019')),
      hit(srcC, mkItem('c', '3', '流浪地球', '2019')),
    ]);

    expect(groups).toHaveLength(1);
    const g3 = groups[0]!;
    expect(g3.others).toHaveLength(2);
  });

  it('is case-insensitive for latin titles', () => {
    const groups = groupHitsByTitle([
      hit(srcA, mkItem('a', '1', 'Dune', '2021')),
      hit(srcB, mkItem('b', '2', 'DUNE', '2021')),
    ]);

    expect(groups).toHaveLength(1);
  });

  it('deduplicates duplicate source-key hits within a group', () => {
    const groups = groupHitsByTitle([
      hit(srcA, mkItem('a', '1', '三体', '2023')),
      hit(srcA, mkItem('a', '2', '三体', '2023')),
    ]);

    expect(groups).toHaveLength(1);
    const g5 = groups[0]!;
    expect(g5.primary.item.id).toBe('1');
    expect(g5.others).toHaveLength(0);
  });

  it('preserves source-priority order (first hit is primary)', () => {
    const groups = groupHitsByTitle([
      hit(srcB, mkItem('b', '1', '三体', '2023')),
      hit(srcA, mkItem('a', '2', '三体', '2023')),
      hit(srcC, mkItem('c', '3', '三体', '2023')),
    ]);

    const g6 = groups[0]!;
    expect(g6.primary.source.key).toBe('b');
    expect(g6.others.map((o) => o.source.key)).toEqual(['a', 'c']);
  });

  it('handles missing year by treating undefined as empty string', () => {
    const groups = groupHitsByTitle([
      hit(srcA, mkItem('a', '1', '未知片')),
      hit(srcB, mkItem('b', '2', '未知片')),
    ]);

    expect(groups).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(groupHitsByTitle([])).toEqual([]);
  });
});
