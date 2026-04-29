import { describe, expect, it, vi } from 'vitest';
import type { CmsSource, VideoItem } from '../types/index';
import type { SearchResult } from './apple-cms';
import { createInMemoryHealthStore } from './source-health';

// Must mock before importing the module under test.
vi.mock('./apple-cms', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./apple-cms');
  return { ...actual };
});

import { aggregateSearch } from './aggregate';
import * as appleCms from './apple-cms';

function makeSource(key: string, overrides: Partial<CmsSource> = {}): CmsSource {
  return { key, name: key, api: `https://${key}.example/api`, enabled: true, ...overrides };
}

function makeItem(id: string, title: string, source: string): VideoItem {
  return { source, id, title };
}

function fakeResult(source: string, items: VideoItem[]): SearchResult {
  return { source, items, page: 1, pageCount: 1, total: items.length };
}

const sources: CmsSource[] = [makeSource('healthy'), makeSource('flaky'), makeSource('dead')];

describe('aggregateSearch — without healthStore (backward compat)', () => {
  it('behaves as before when healthStore is omitted', async () => {
    const spy = vi
      .spyOn(appleCms, 'searchSource')
      .mockResolvedValueOnce(fakeResult('healthy', [makeItem('1', 'Show A', 'healthy')]))
      .mockResolvedValueOnce(fakeResult('flaky', [makeItem('2', 'Show B', 'flaky')]))
      .mockRejectedValueOnce(new Error('dead source'));

    const result = await aggregateSearch(sources, 'test', {
      perSourceTimeoutMs: 1000,
      maxPage: 1,
    });

    expect(result.items).toHaveLength(2);
    expect(result.sourceStats).toHaveLength(3);
    expect(result.sourceStats[0]?.source).toBe('healthy');
    expect(result.sourceStats[0]?.ok).toBe(true);
    expect(result.sourceStats[2]?.ok).toBe(false);
    expect(result.sourceStats[2]?.error).toBe('dead source');
    // Order should be original source order (no healthStore → no reorder).
    expect(result.items.map((i) => i.source)).toEqual(['healthy', 'flaky']);

    spy.mockRestore();
  });
});

describe('aggregateSearch — with healthStore', () => {
  it('skips sources marked unhealthy by shouldSkipSource', async () => {
    const store = createInMemoryHealthStore();
    // Record 5 consecutive failures for 'dead' so it gets skipped.
    for (let i = 0; i < 5; i++) {
      await store.recordFail('dead', 'timeout');
    }

    const spy = vi
      .spyOn(appleCms, 'searchSource')
      .mockResolvedValueOnce(fakeResult('healthy', [makeItem('1', 'Show A', 'healthy')]))
      .mockResolvedValueOnce(fakeResult('flaky', [makeItem('2', 'Show B', 'flaky')]));

    const result = await aggregateSearch(sources, 'test', {
      perSourceTimeoutMs: 1000,
      maxPage: 1,
      healthStore: store,
    });

    // 'dead' skipped, only 2 actual searchSource calls.
    expect(spy).toHaveBeenCalledTimes(2);
    expect(result.items).toHaveLength(2);

    // The skipped source still appears in sourceStats.
    const deadStat = result.sourceStats.find((s) => s.source === 'dead');
    expect(deadStat).toBeDefined();
    expect(deadStat?.ok).toBe(false);
    expect(deadStat?.error).toBe('skipped: unhealthy');

    spy.mockRestore();
  });

  it('sorts results by health score descending', async () => {
    const store = createInMemoryHealthStore();
    // flaky: some failures, lower score
    await store.recordFail('flaky', 'err1');
    await store.recordFail('flaky', 'err2');
    await store.recordOk('flaky', 500);
    // healthy: many successes, high score
    for (let i = 0; i < 10; i++) {
      await store.recordOk('healthy', 100);
    }
    // dead: skipped anyway
    for (let i = 0; i < 5; i++) {
      await store.recordFail('dead', 'timeout');
    }

    // Both should return the same item to test dedup under reorder.
    const spy = vi
      .spyOn(appleCms, 'searchSource')
      .mockResolvedValueOnce(fakeResult('healthy', [makeItem('1', 'Show A', 'healthy')]))
      .mockResolvedValueOnce(fakeResult('flaky', [makeItem('2', 'Show A', 'flaky')]));

    const result = await aggregateSearch(sources, 'test', {
      perSourceTimeoutMs: 1000,
      maxPage: 1,
      healthStore: store,
    });

    // 'Show A' should come from 'healthy' (higher score), not 'flaky'.
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.source).toBe('healthy');

    spy.mockRestore();
  });

  it('persists recordOk for successful sources', async () => {
    const store = createInMemoryHealthStore();

    const spy = vi
      .spyOn(appleCms, 'searchSource')
      .mockResolvedValueOnce(fakeResult('healthy', [makeItem('1', 'A', 'healthy')]))
      .mockRejectedValueOnce(new Error('flaky down'))
      .mockRejectedValueOnce(new Error('dead down'));

    await aggregateSearch(sources, 'test', {
      perSourceTimeoutMs: 1000,
      maxPage: 1,
      healthStore: store,
    });

    const healthyRec = await store.get('healthy');
    expect(healthyRec?.okCount).toBe(1);
    expect(healthyRec?.consecutiveFails).toBe(0);

    const flakyRec = await store.get('flaky');
    expect(flakyRec?.failCount).toBe(1);
    expect(flakyRec?.consecutiveFails).toBe(1);
    expect(flakyRec?.lastError).toBe('flaky down');

    spy.mockRestore();
  });

  it('does not reorder when healthStore is not provided', async () => {
    const spy = vi
      .spyOn(appleCms, 'searchSource')
      .mockResolvedValueOnce(fakeResult('healthy', [makeItem('1', 'Z', 'healthy')]))
      .mockResolvedValueOnce(fakeResult('flaky', [makeItem('2', 'Z', 'flaky')]))
      .mockRejectedValueOnce(new Error('dead'));

    const result = await aggregateSearch(sources, 'test', {
      perSourceTimeoutMs: 1000,
      maxPage: 1,
    });

    // Without healthStore, keep original order: 'healthy' first.
    expect(result.items[0]?.source).toBe('healthy');

    spy.mockRestore();
  });
});
