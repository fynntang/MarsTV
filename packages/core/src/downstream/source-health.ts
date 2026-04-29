// ============================================================================
// Source health scoring — tracks per-source success/failure stats so the
// aggregator can downrank or skip chronically-failing sources.
// Platform-neutral: pure TS + Date.now(), no Node / DOM specifics.
// ============================================================================

export interface SourceHealthRecord {
  sourceKey: string;
  okCount: number;
  failCount: number;
  consecutiveFails: number;
  lastOkAt: number | null; // epoch ms
  lastFailAt: number | null; // epoch ms
  lastError?: string;
  avgLatencyMs: number; // exponential moving average
  lastProbedAt: number | null;
}

export interface ISourceHealthStore {
  get(sourceKey: string): Promise<SourceHealthRecord | null>;
  list(): Promise<SourceHealthRecord[]>;
  recordOk(sourceKey: string, latencyMs: number): Promise<void>;
  recordFail(sourceKey: string, error: string): Promise<void>;
  clear(sourceKey?: string): Promise<void>;
}

// ---- Pure helpers (no I/O) ----

/** Score 0..1. Higher = healthier. No record → neutral 0.5. */
export function scoreSource(rec: SourceHealthRecord | null, now?: number): number {
  if (!rec) return 0.5;

  const total = rec.okCount + rec.failCount;
  if (total === 0) return 0.5;

  let score = rec.okCount / total;

  // Consecutive failures drag the score down hard.
  if (rec.consecutiveFails >= 5) {
    score *= 0.05;
  } else if (rec.consecutiveFails >= 3) {
    score *= 0.2;
  }

  // Recency bonus: last success within 24h adds up to 0.2.
  const n = now ?? Date.now();
  if (rec.lastOkAt !== null) {
    const hours = (n - rec.lastOkAt) / 3_600_000;
    if (hours <= 24) {
      score += 0.2 * (1 - hours / 24);
    }
  }

  return Math.min(1, Math.max(0, score));
}

/** Whether a source should be skipped entirely (not even tried). */
export function shouldSkipSource(rec: SourceHealthRecord | null, now?: number): boolean {
  if (!rec) return false;
  if (rec.consecutiveFails < 5) return false;
  const n = now ?? Date.now();
  // Skip if it's been failing and hasn't recovered for 6+ hours.
  if (rec.lastOkAt !== null && n - rec.lastOkAt < 6 * 3_600_000) return false;
  return true;
}

/** Dynamic per-source timeout based on health score. */
export function dynamicTimeout(score: number, baseTimeoutMs: number): number {
  if (score >= 0.7) return baseTimeoutMs;
  if (score < 0.3) return baseTimeoutMs * 0.5;
  // Linear from 50% at score=0.3 to 100% at score=0.7
  return baseTimeoutMs * (0.5 + ((score - 0.3) / 0.4) * 0.5);
}

// ---- In-memory default implementation ----

export function createInMemoryHealthStore(): ISourceHealthStore {
  const records = new Map<string, SourceHealthRecord>();

  function ensure(key: string): SourceHealthRecord {
    let rec = records.get(key);
    if (!rec) {
      rec = {
        sourceKey: key,
        okCount: 0,
        failCount: 0,
        consecutiveFails: 0,
        lastOkAt: null,
        lastFailAt: null,
        avgLatencyMs: 0,
        lastProbedAt: null,
      };
      records.set(key, rec);
    }
    return rec;
  }

  return {
    async get(sourceKey: string) {
      return records.get(sourceKey) ?? null;
    },

    async list() {
      return Array.from(records.values());
    },

    async recordOk(sourceKey: string, latencyMs: number) {
      const rec = ensure(sourceKey);
      rec.okCount += 1;
      rec.consecutiveFails = 0;
      rec.lastOkAt = Date.now();
      rec.lastProbedAt = Date.now();
      // Exponential moving average: α = 0.2 for gradual smoothing.
      if (rec.avgLatencyMs === 0) {
        rec.avgLatencyMs = latencyMs;
      } else {
        rec.avgLatencyMs = 0.8 * rec.avgLatencyMs + 0.2 * latencyMs;
      }
    },

    async recordFail(sourceKey: string, error: string) {
      const rec = ensure(sourceKey);
      rec.failCount += 1;
      rec.consecutiveFails += 1;
      rec.lastFailAt = Date.now();
      rec.lastError = error;
      rec.lastProbedAt = Date.now();
    },

    async clear(sourceKey?: string) {
      if (sourceKey) {
        records.delete(sourceKey);
      } else {
        records.clear();
      }
    },
  };
}
