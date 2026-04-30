'use client';

import { type IStorage, localStorageBackend } from '@marstv/core';
import { Fragment, useEffect, useRef, useState } from 'react';
import type { LinkComponent } from '../lib/link-component';
import { DefaultLink } from '../lib/link-component';
import { invalidateCardMarkers } from './card-markers';

interface PlayRecordMeta {
  source: string;
  sourceName?: string;
  id: string;
  title: string;
  poster?: string;
  lineIdx: number;
  lineName?: string;
  epIdx: number;
}

interface Props {
  src: string;
  poster?: string;
  title?: string;
  // Stable key per (source, id, line, ep). Used to persist and restore
  // playback position in localStorage. Omit to disable resume.
  progressKey?: string;
  // URL to navigate to when the current episode ends. Omit on last episode.
  nextHref?: string;
  // URL for previous episode, used by the P hotkey. Omit on first episode.
  prevHref?: string;
  // Signed m3u8 URL for the next episode. When provided, we prefetch it at
  // 80% progress to warm the edge cache for instant next-ep switching.
  nextPlaybackUrl?: string;
  // URL for the "try another line" button in the error overlay. Omit when
  // there is no other line to fall back to.
  nextLineHref?: string;
  nextLineName?: string;
  // When provided, write a full PlayRecord to storage on each tick so the
  // "history" page can display rich entries (title, poster, last episode).
  record?: PlayRecordMeta;
  // Navigation callback, replaces next/router.
  onNavigate: (href: string) => void;
  // Storage for persisting play records. Defaults to localStorageBackend.
  storage?: IStorage;
  // Link component for navigation. Defaults to plain <a>.
  LinkComponent?: LinkComponent;
}

const PROGRESS_PREFIX = 'marstv:progress:';
// Don't restore if we're basically at the end — user finished last time.
const RESUME_THRESHOLD = 0.95;
// Don't restore tiny offsets (< 5s) — user barely started.
const MIN_RESUME_SECONDS = 5;

function readProgress(key: string): number | null {
  try {
    const raw = localStorage.getItem(PROGRESS_PREFIX + key);
    if (!raw) return null;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeProgress(key: string, seconds: number): void {
  try {
    localStorage.setItem(PROGRESS_PREFIX + key, seconds.toFixed(1));
  } catch {
    // Storage may be unavailable (private mode, quota) — ignore.
  }
}

function clearProgress(key: string): void {
  try {
    localStorage.removeItem(PROGRESS_PREFIX + key);
  } catch {
    // ignore
  }
}

export function PlayerEmbed({
  src,
  poster,
  title,
  progressKey,
  nextHref,
  prevHref,
  nextPlaybackUrl,
  nextLineHref,
  nextLineName,
  record,
  onNavigate,
  storage = localStorageBackend,
  LinkComponent = DefaultLink,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // Bumping retryNonce forces the player useEffect to re-run and rebuild the
  // ArtPlayer + hls instance from scratch. Needed because on a fatal HLS
  // error we destroy hls, leaving the video element dead until we re-init.
  const [retryNonce, setRetryNonce] = useState(0);
  // Keep the latest nextHref in a ref so the ArtPlayer 'ended' handler,
  // which is wired up once, always navigates to the current next episode.
  const nextHrefRef = useRef(nextHref);
  nextHrefRef.current = nextHref;
  const recordRef = useRef(record);
  recordRef.current = record;
  const nextPlaybackUrlRef = useRef(nextPlaybackUrl);
  nextPlaybackUrlRef.current = nextPlaybackUrl;

  useEffect(() => {
    // Reference retryNonce so the linter sees it as a used dep. Bumping it
    // from the retry button is the whole reason this effect has to re-run.
    void retryNonce;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let art: { destroy: (removeHtml?: boolean) => void } | null = null;
    let progressTimer: ReturnType<typeof setInterval> | null = null;
    // Prefetch next-episode m3u8 exactly once per mount, when the viewer
    // crosses the 80% threshold. Writes into the edge cache so click-through
    // to next-ep serves the manifest from the CDN rather than re-fetching
    // through our Node route.
    let prefetchedNext = false;

    (async () => {
      try {
        const [{ default: Artplayer }, { default: Hls }] = await Promise.all([
          import('artplayer'),
          import('hls.js'),
        ]);
        if (cancelled) return;

        // Only pass poster when we actually have one; ArtPlayer renders a
        // broken image for empty strings.
        const posterProp = poster && poster.length > 0 ? { poster } : {};

        const instance = new Artplayer({
          container,
          url: src,
          ...posterProp,
          type: 'm3u8',
          autoplay: false,
          pip: true,
          autoSize: false,
          autoMini: false,
          screenshot: false,
          setting: true,
          playbackRate: true,
          aspectRatio: true,
          theme: '#ff6b35',
          volume: 1,
          muted: false,
          airplay: true,
          // Both fullscreen buttons. `fullscreen` = real browser/OS fullscreen,
          // `fullscreenWeb` = fills the viewport without leaving the page.
          fullscreen: true,
          fullscreenWeb: true,
          moreVideoAttr: {
            crossOrigin: 'anonymous',
            preload: 'metadata',
          },
          customType: {
            m3u8: (video: HTMLVideoElement, url: string, inst: unknown) => {
              if (Hls.isSupported()) {
                const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
                hls.loadSource(url);
                hls.attachMedia(video);
                const a = inst as {
                  on: (event: string, fn: () => void) => void;
                  hls?: unknown;
                };
                a.hls = hls;
                a.on('destroy', () => hls.destroy());
                // Bubble fatal HLS errors up to our overlay — otherwise a
                // manifest 404 or repeated segment failure just shows a
                // frozen frame with no explanation and no recovery CTA.
                hls.on(Hls.Events.ERROR, (_evt, data) => {
                  if (!data.fatal) return;
                  const detail = data.details ?? data.type ?? 'unknown';
                  setError(`HLS 错误: ${detail}`);
                  try {
                    hls.destroy();
                  } catch {
                    // already destroyed / teardown — ignore
                  }
                });
              } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = url;
              } else {
                setError('当前浏览器不支持 HLS 播放');
              }
            },
          },
        });

        art = instance as unknown as { destroy: (removeHtml?: boolean) => void };

        // Typed surface for the event + video accessors we rely on.
        const a = instance as unknown as {
          on: (event: string, fn: (...args: unknown[]) => void) => void;
          video: HTMLVideoElement;
        };

        // Restore saved position once metadata lands (we need duration).
        if (progressKey) {
          a.on('video:loadedmetadata', () => {
            const saved = readProgress(progressKey);
            if (saved == null) return;
            const duration = a.video.duration;
            if (!Number.isFinite(duration) || duration <= 0) return;
            if (saved < MIN_RESUME_SECONDS) return;
            if (saved / duration >= RESUME_THRESHOLD) return;
            try {
              a.video.currentTime = saved;
            } catch {
              // seek failed — give up silently
            }
          });

          // Persist every 5s while playing. Cheaper than timeupdate (4Hz).
          progressTimer = setInterval(() => {
            const t = a.video.currentTime;
            const d = a.video.duration;
            if (!Number.isFinite(t) || t <= 0) return;

            // Prefetch next episode's m3u8 once we're past 80% — warms the
            // edge cache so tapping "next" resolves from CDN, not Node.
            if (
              !prefetchedNext &&
              nextPlaybackUrlRef.current &&
              Number.isFinite(d) &&
              d > 0 &&
              t / d >= 0.8
            ) {
              prefetchedNext = true;
              fetch(nextPlaybackUrlRef.current, {
                credentials: 'omit',
                // Low-priority hint — modern browsers schedule it after
                // in-flight media segments. Falls back to default if unknown.
                priority: 'low',
              } as RequestInit).catch(() => {});
            }

            if (Number.isFinite(d) && d > 0 && t / d >= RESUME_THRESHOLD) {
              // Near the end — clear so next open doesn't jump to the credits.
              clearProgress(progressKey);
              // Don't leave a stale record pointing at the credits either.
              const rec = recordRef.current;
              if (rec) {
                storage
                  .removePlayRecord(rec.source, rec.id)
                  .then(() => invalidateCardMarkers())
                  .catch(() => {});
              }
              return;
            }
            writeProgress(progressKey, t);

            // Also store a full PlayRecord if the caller wired one up.
            const rec = recordRef.current;
            if (rec) {
              storage
                .putPlayRecord({
                  source: rec.source,
                  sourceName: rec.sourceName,
                  id: rec.id,
                  title: rec.title,
                  poster: rec.poster,
                  lineIdx: rec.lineIdx,
                  lineName: rec.lineName,
                  epIdx: rec.epIdx,
                  positionSec: t,
                  durationSec: Number.isFinite(d) ? d : 0,
                  updatedAt: Date.now(),
                })
                .then(() => invalidateCardMarkers())
                .catch(() => {});
            }
          }, 5000);
        }

        // Surface native fullscreen rejections. If the browser refuses
        // requestFullscreen (permissions-policy, user-gesture loss, ancestor
        // with `transform`/`filter`), ArtPlayer fires this event — otherwise
        // the button just does nothing and looks broken.
        a.on('fullscreenError', (event: unknown) => {
          console.warn('[player] fullscreenError', event);
        });

        // Auto-advance. Also clear progress for the ended episode so re-opening
        // it starts fresh instead of jumping to the credits.
        a.on('video:ended', () => {
          if (progressKey) clearProgress(progressKey);
          const href = nextHrefRef.current;
          if (href) onNavigate(href);
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();

    return () => {
      cancelled = true;
      if (progressTimer) clearInterval(progressTimer);
      if (art) {
        try {
          art.destroy(false);
        } catch {
          // swallow — destroy is best-effort on unmount
        }
      }
    };
  }, [src, poster, progressKey, retryNonce, onNavigate, storage]);

  // Keyboard shortcuts: N/P for episode nav, ? for help overlay. We skip when
  // the event's target is editable (user typing in some future comment box /
  // search input) and when any modifier is held (so real browser shortcuts like
  // Ctrl+R still work). ArtPlayer still owns Space, arrows, M, F natively.
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
      const t = ev.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) {
          return;
        }
      }
      // Shift+/ fires '?' on US layouts. Accept either.
      if (ev.key === '?' || (ev.shiftKey && ev.key === '/')) {
        ev.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      if (ev.key === 'Escape') {
        setHelpOpen(false);
        return;
      }
      // Single-letter nav shortcuts. Guard against repeats firing many times
      // during long key press — a single navigation per keydown is enough.
      if (ev.repeat) return;
      if (ev.key === 'n' || ev.key === 'N') {
        if (nextHref) {
          ev.preventDefault();
          onNavigate(nextHref);
        }
        return;
      }
      if (ev.key === 'p' || ev.key === 'P') {
        if (prevHref) {
          ev.preventDefault();
          onNavigate(prevHref);
        }
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextHref, prevHref, onNavigate]);

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg border border-border bg-black">
        <div ref={containerRef} aria-label={title} className="aspect-video w-full" />
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/85 p-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/15 text-danger">
              !
            </div>
            <p className="max-w-md text-sm text-danger">播放失败:{error}</p>
            {nextLineHref ? (
              <LinkComponent
                href={nextLineHref}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-background transition-colors hover:bg-primary-hover"
              >
                试下一条线路{nextLineName ? ` · ${nextLineName}` : ''} →
              </LinkComponent>
            ) : (
              <span className="text-xs text-muted-foreground">本视频暂无其他线路可用</span>
            )}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setRetryNonce((n) => n + 1);
              }}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              重试当前线路
            </button>
          </div>
        ) : null}
        {helpOpen ? <KeyboardShortcutsOverlay onClose={() => setHelpOpen(false)} /> : null}
      </div>
      <div className="mt-1 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="text-[10px] text-dim-foreground transition-colors hover:text-muted-foreground"
        >
          按 ? 查看键盘快捷键
        </button>
      </div>
    </div>
  );
}

function KeyboardShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const rows: Array<[string, string]> = [
    ['Space / K', '播放 / 暂停'],
    ['← / →', '后退 / 前进 5 秒'],
    ['↑ / ↓', '音量增减'],
    ['M', '静音切换'],
    ['F', '进入全屏 (真实)'],
    ['W', '网页全屏'],
    ['N', '下一集'],
    ['P', '上一集'],
    ['Esc', '退出全屏 / 关闭此面板'],
    ['?', '显示 / 隐藏此面板'],
  ];
  return (
    // biome-ignore lint/a11y/useSemanticElements: non-modal in-player overlay — <dialog> forces unwanted native modal semantics
    <div
      role="dialog"
      aria-label="键盘快捷键"
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/85 p-6"
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface/90 p-5 shadow-xl backdrop-blur">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-foreground">键盘快捷键</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          {rows.map(([k, v]) => (
            <Fragment key={k}>
              <dt className="font-mono text-dim-foreground">{k}</dt>
              <dd className="text-foreground">{v}</dd>
            </Fragment>
          ))}
        </dl>
        <p className="mt-4 text-[10px] text-dim-foreground">按 Esc 关闭 · 按 ? 再次打开</p>
      </div>
    </div>
  );
}
