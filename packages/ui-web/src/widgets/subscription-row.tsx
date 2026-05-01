'use client';

// Home-page "追剧中" strip. New-episode cards surface first and show a +N
// badge until the user clicks through.

import type { SubscriptionRecord } from '@marstv/core';
import type { LinkComponent } from '../lib/link-component';
import { DefaultLink } from '../lib/link-component';

interface Props {
  /** Subscription records to display. null = still loading (component returns null). */
  items: SubscriptionRecord[] | null;
  /** Called when the user dismisses a subscription. */
  onRemove: (source: string, id: string) => void;
  /** Link component for navigation. Defaults to plain <a>. */
  LinkComponent?: LinkComponent;
  /** Image proxy URL prefix. Defaults to '/api/image/cms'. */
  imageProxy?: string;
}

export function SubscriptionRow({
  items,
  onRemove,
  LinkComponent = DefaultLink,
  imageProxy = '/api/image/cms',
}: Props) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mt-14">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="section-title text-lg font-semibold tracking-tight text-foreground">
          追剧中
        </h2>
        <LinkComponent
          href="/subscriptions"
          className="text-[11px] text-dim-foreground transition-colors hover:text-primary"
        >
          全部订阅 →
        </LinkComponent>
      </div>
      <div className="scrollbar-thin scroll-fade scroll-x pb-2">
        <div className="flex w-max gap-3 sm:gap-4">
          {items.map((it) => {
            const href = `/play/${encodeURIComponent(it.source)}/${encodeURIComponent(it.id)}?line=${it.lineIdx}&ep=0`;
            const newCount = Math.max(0, it.latestEpisodeCount - it.knownEpisodeCount);
            const proxiedPoster = it.poster
              ? `${imageProxy}?u=${encodeURIComponent(it.poster)}`
              : null;
            return (
              <div
                key={`${it.source}:${it.id}`}
                className="group glass-card relative flex w-[140px] sm:w-[160px] lg:w-[180px] shrink-0 flex-col overflow-hidden rounded-xl"
              >
                <LinkComponent href={href} className="contents">
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-black">
                    {proxiedPoster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proxiedPoster}
                        alt={it.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-dim-foreground">
                        无封面
                      </div>
                    )}
                    {newCount > 0 ? (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-background shadow-md">
                        +{newCount} 新集
                      </span>
                    ) : null}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-4 pb-1 text-[10px] text-foreground/90">
                      共 {it.latestEpisodeCount} 集
                    </span>
                  </div>
                  <div className="truncate px-2 py-1.5 text-xs text-foreground group-hover:text-primary">
                    {it.title}
                  </div>
                </LinkComponent>
                <button
                  type="button"
                  onClick={() => onRemove(it.source, it.id)}
                  aria-label="取消追剧"
                  className="absolute right-1.5 top-1.5 rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
