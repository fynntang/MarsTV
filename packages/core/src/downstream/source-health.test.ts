import { describe, expect, it } from 'vitest';
import {
  type ISourceHealthStore,
  type SourceHealthRecord,
  createInMemoryHealthStore,
  dynamicTimeout,
  scoreSource,
  shouldSkipSource,
} from './source-health';

function makeRecord(overrides: Partial<SourceHealthRecord> = {}): SourceHealthRecord {
  return {
    sourceKey: 'test',
    okCount: 0,
    failCount: 0,
    consecutiveFails: 0,
    lastOkAt: null,
    lastFailAt: null,
    avgLatencyMs: 0,
    lastProbedAt: null,
    ...overrides,
  };
}

function makeTime(hoursAgo: number): number {
  return Date.now() - hoursAgo * 3_600_000;
}

// ---- scoreSource ----

describe('scoreSource', () => {
  it('returns 0.5 for null record (neutral default)', () => {
    expect(scoreSource(null)).toBe(0.5);
  });

  it('returns 0.5 for a record with no events', () => {
    expect(scoreSource(makeRecord())).toBe(0.5);
  });

  it('approaches 1 for a perfect source', () => {
    const rec = makeRecord({
      okCount: 100,
      failCount: 0,
      consecutiveFails: 0,
      lastOkAt: makeTime(0.1),
    });
    expect(scoreSource(rec)).toBeGreaterThan(0.95);
  });

  it('drops below 0.1 when consecutiveFails >= 5', () => {
    const rec = makeRecord({
      okCount: 5,
      failCount: 5,
      consecutiveFails: 5,
    });
    // base rate = 5/10 = 0.5, then * 0.05 => 0.025. No recency bonus (no lastOkAt).
    expect(scoreSource(rec)).toBeLessThan(0.1);
  });

  it('applies moderate penalty for consecutiveFails >= 3 but < 5', () => {
    const rec = makeRecord({
      okCount: 7,
      failCount: 3,
      consecutiveFails: 3,
    });
    // base rate = 7/10 = 0.7, * 0.2 => 0.14
    expect(scoreSource(rec)).toBeLessThan(0.2);
  });

  it('adds recency bonus when last success is within 24 hours', () => {
    const rec = makeRecord({
      okCount: 5,
      failCount: 5,
      consecutiveFails: 0,
      lastOkAt: makeTime(1), // 1 hour ago
    });
    // base: 0.5, bonus: 0.2 * (1 - 1/24) ≈ 0.1917 → total ≈ 0.6917
    const s = scoreSource(rec);
    expect(s).toBeGreaterThan(0.65);
    expect(s).toBeLessThan(0.75);
  });

  it('gives no recency bonus when last success is older than 24h', () => {
    const rec = makeRecord({
      okCount: 5,
      failCount: 5,
      consecutiveFails: 0,
      lastOkAt: makeTime(25),
    });
    expect(scoreSource(rec)).toBe(0.5);
  });

  it('clamps score to [0, 1]', () => {
    const perfect = makeRecord({
      okCount: 1000,
      failCount: 0,
      consecutiveFails: 0,
      lastOkAt: makeTime(0.1),
    });
    expect(scoreSource(perfect)).toBeLessThanOrEqual(1);

    const terrible = makeRecord({
      okCount: 0,
      failCount: 1000,
      consecutiveFails: 100,
    });
    expect(scoreSource(terrible)).toBeGreaterThanOrEqual(0);
  });
});

// ---- shouldSkipSource ----

describe('shouldSkipSource', () => {
  it('returns false for null record', () => {
    expect(shouldSkipSource(null)).toBe(false);
  });

  it('returns false when consecutiveFails < 5', () => {
    expect(shouldSkipSource(makeRecord({ consecutiveFails: 4 }))).toBe(false);
  });

  it('returns true when consecutiveFails >= 5 and never succeeded', () => {
    expect(shouldSkipSource(makeRecord({ consecutiveFails: 5, lastOkAt: null }))).toBe(true);
  });

  it('returns false when consecutiveFails >= 5 but recovered within 6h', () => {
    expect(shouldSkipSource(makeRecord({ consecutiveFails: 5, lastOkAt: makeTime(3) }))).toBe(
      false,
    );
  });

  it('returns true when consecutiveFails >= 5 and recovery is older than 6h', () => {
    expect(shouldSkipSource(makeRecord({ consecutiveFails: 5, lastOkAt: makeTime(7) }))).toBe(true);
  });
});

// ---- dynamicTimeout ----

describe('dynamicTimeout', () => {
  it('returns full timeout for score >= 0.7', () => {
    expect(dynamicTimeout(0.7, 8000)).toBe(8000);
    expect(dynamicTimeout(1.0, 8000)).toBe(8000);
  });

  it('returns half timeout for score < 0.3', () => {
    expect(dynamicTimeout(0.29, 8000)).toBe(4000);
    expect(dynamicTimeout(0, 8000)).toBe(4000);
  });

  it('interpolates linearly for scores between 0.3 and 0.7', () => {
    // score=0.5 → (0.5-0.3)/0.4 = 0.5 → 0.5+0.5*0.5 = 0.75 → 6000
    expect(dynamicTimeout(0.5, 8000)).toBe(6000);
  });
});

// ---- createInMemoryHealthStore ----

describe('createInMemoryHealthStore', () => {
  let store: ISourceHealthStore;

  function fresh() {
    store = createInMemoryHealthStore();
  }

  describe('basic CRUD', () => {
    it('returns null for unknown source', async () => {
      fresh();
      expect(await store.get('nope')).toBeNull();
    });

    it('list returns empty array initially', async () => {
      fresh();
      expect(await store.list()).toEqual([]);
    });

    it('clear with no argument wipes all records', async () => {
      fresh();
      await store.recordOk('a', 100);
      await store.recordFail('b', 'err');
      await store.clear();
      expect(await store.list()).toEqual([]);
    });

    it('clear with a key removes only that source', async () => {
      fresh();
      await store.recordOk('a', 100);
      await store.recordOk('b', 200);
      await store.clear('a');
      const list = await store.list();
      expect(list).toHaveLength(1);
      expect(list[0]?.sourceKey).toBe('b');
    });
  });

  describe('recordOk', () => {
    it('increments okCount and resets consecutiveFails', async () => {
      fresh();
      await store.recordFail('a', 'first fail');
      await store.recordFail('a', 'second fail');
      await store.recordOk('a', 50);
      const rec = await store.get('a');
      expect(rec?.okCount).toBe(1);
      expect(rec?.failCount).toBe(2);
      expect(rec?.consecutiveFails).toBe(0);
      expect(rec?.lastOkAt).toBeGreaterThan(0);
    });

    it('sets initial avgLatencyMs to the first latency value', async () => {
      fresh();
      await store.recordOk('a', 300);
      const rec = await store.get('a');
      expect(rec?.avgLatencyMs).toBe(300);
    });

    it('applies EMA smoothing for subsequent latencies', async () => {
      fresh();
      await store.recordOk('a', 100); // avg = 100
      await store.recordOk('a', 200); // avg = 0.8*100 + 0.2*200 = 120
      const rec = await store.get('a');
      expect(rec?.avgLatencyMs).toBeCloseTo(120, 5);
    });
  });

  describe('recordFail', () => {
    it('increments failCount and consecutiveFails', async () => {
      fresh();
      await store.recordFail('a', 'timeout');
      await store.recordFail('a', 'timeout again');
      const rec = await store.get('a');
      expect(rec?.failCount).toBe(2);
      expect(rec?.consecutiveFails).toBe(2);
      expect(rec?.lastError).toBe('timeout again');
    });
  });

  describe('happy path round-trip', () => {
    it('starts neutral, goes low after failures, recovers after successes', async () => {
      fresh();

      // Unknown → neutral
      expect(scoreSource(await store.get('s'))).toBe(0.5);

      // 5 consecutive failures → score drops below 0.1, should skip
      for (let i = 0; i < 5; i++) {
        await store.recordFail('s', `fail ${i}`);
      }
      const afterFails = await store.get('s');
      expect(scoreSource(afterFails)).toBeLessThan(0.1);
      expect(shouldSkipSource(afterFails)).toBe(true);

      // 2 consecutive successes → consecutiveFails resets, score rebounds
      await store.recordOk('s', 80);
      await store.recordOk('s', 70);
      const afterOk = await store.get('s');
      expect(afterOk?.consecutiveFails).toBe(0);
      // 2 ok / 7 total ≈ 0.286, plus recency bonus
      expect(scoreSource(afterOk)).toBeGreaterThan(0.4);
      expect(shouldSkipSource(afterOk)).toBe(false);
    });
  });
});
