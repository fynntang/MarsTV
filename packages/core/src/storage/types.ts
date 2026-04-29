// ============================================================================
// Platform-neutral storage abstraction.
// Shared across Web / Desktop / Mobile / TV. Concrete backends:
//   - LocalStorage (browser)           → storage/local.ts
//   - Upstash / Redis (server)         → future: storage/redis.ts
//   - SecureStore / MMKV (mobile)      → future: storage/native.ts
//
// All methods are async so the IStorage contract holds regardless of whether
// the backend is synchronous (localStorage) or remote (Redis/Upstash).
// ============================================================================

export interface PlayRecord {
  source: string;
  /** Human-readable source name (CmsSource.name). Optional for backward compat. */
  sourceName?: string;
  id: string;
  title: string;
  poster?: string;
  lineIdx: number;
  /** Human-readable line name (PlayLine.name). Optional for backward compat. */
  lineName?: string;
  epIdx: number;
  /** Current playback position, seconds. */
  positionSec: number;
  /** Duration of the episode when the record was saved, seconds. 0 if unknown. */
  durationSec: number;
  /** epoch milliseconds */
  updatedAt: number;
}

export interface FavoriteRecord {
  source: string;
  /** Human-readable source name (CmsSource.name). Optional for backward compat. */
  sourceName?: string;
  id: string;
  title: string;
  poster?: string;
  /** epoch milliseconds */
  updatedAt: number;
}

export interface SubscriptionRecord {
  source: string;
  /** Human-readable source name (CmsSource.name). */
  sourceName?: string;
  id: string;
  title: string;
  poster?: string;
  /** Line the user was on when subscribing — default target for the resume link. */
  lineIdx: number;
  lineName?: string;
  /** Max episode count across all lines the last time the user acknowledged it
      (e.g. when subscribing, or when they click into the title). The "+N 新集"
      badge is computed as latestEpisodeCount - knownEpisodeCount. */
  knownEpisodeCount: number;
  /** Max episode count observed during the most recent backend check. Starts
      equal to knownEpisodeCount. */
  latestEpisodeCount: number;
  /** epoch ms — when the user first subscribed */
  subscribedAt: number;
  /** epoch ms — last time latestEpisodeCount was refreshed from upstream */
  lastCheckedAt: number;
}

export interface IStorage {
  // Play records — the last known position for (source, id) across lines/eps.
  listPlayRecords(): Promise<PlayRecord[]>;
  getPlayRecord(source: string, id: string): Promise<PlayRecord | null>;
  putPlayRecord(record: PlayRecord): Promise<void>;
  removePlayRecord(source: string, id: string): Promise<void>;
  clearPlayRecords(): Promise<void>;

  // Favorites — simple bookmark list.
  listFavorites(): Promise<FavoriteRecord[]>;
  hasFavorite(source: string, id: string): Promise<boolean>;
  addFavorite(record: FavoriteRecord): Promise<void>;
  removeFavorite(source: string, id: string): Promise<void>;
  clearFavorites(): Promise<void>;

  // Subscriptions — "追剧" list with new-episode detection.
  listSubscriptions(): Promise<SubscriptionRecord[]>;
  hasSubscription(source: string, id: string): Promise<boolean>;
  getSubscription(source: string, id: string): Promise<SubscriptionRecord | null>;
  putSubscription(record: SubscriptionRecord): Promise<void>;
  removeSubscription(source: string, id: string): Promise<void>;
  /** Merge fresh episode counts from a bulk check into existing records. Silently
      ignores ids that are no longer subscribed (user may have unsubscribed
      mid-check). */
  updateSubscriptionChecks(
    updates: Array<{ source: string; id: string; latestEpisodeCount: number }>,
  ): Promise<void>;
  /** Bump knownEpisodeCount to match latestEpisodeCount — "I've seen it". */
  acknowledgeSubscription(source: string, id: string): Promise<void>;
  clearSubscriptions(): Promise<void>;
}

export function makePlayRecordKey(source: string, id: string): string {
  return `${source}::${id}`;
}
