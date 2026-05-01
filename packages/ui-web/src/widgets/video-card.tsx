'use client';

import type { VideoItem } from '@marstv/core';
import type { LinkComponent } from '../lib/link-component';
import { DefaultLink } from '../lib/link-component';
import { cn } from '../lib/utils';
import { CardMarkers } from './card-markers';

interface Props {
  item: VideoItem;
  /** Optional pre-resolved source name. Falls back to item.source (key) when omitted. */
  sourceName?: string;
  /** Hide the source badge — useful when the card lives inside a per-source section. */
  hideSourceBadge?: boolean;
  /** Link component for navigation. Defaults to plain <a>. */
  LinkComponent?: LinkComponent;
  /** Image proxy URL prefix. Defaults to '/api/image/cms'. */
  imageProxy?: string;
  /** Callback to build the play page URL. Defaults to `/play/${source}/${id}`. */
  getPlayUrl?: (source: string, id: string) => string;
}

export function VideoCard({
  item,
  sourceName,
  hideSourceBadge,
  LinkComponent = DefaultLink,
  imageProxy = '/api/image/cms',
  getPlayUrl = (s, i) => `/play/${encodeURIComponent(s)}/${encodeURIComponent(i)}`,
}: Props) {
  const href = getPlayUrl(item.source, item.id);
  // CMS poster hosts often block cross-origin hotlinks or serve broken SSL.
  // Route them through our own proxy (SSRF-hardened, 7-day CDN cache).
  const proxiedPoster = item.poster ? `${imageProxy}?u=${encodeURIComponent(item.poster)}` : null;

  return (
    <LinkComponent
      href={href}
      className={cn('glass-card group relative flex flex-col overflow-hidden rounded-xl')}
    >
      <div className="relative aspect-[2/3] w-full bg-background">
        {proxiedPoster ? (
          <img
            src={proxiedPoster}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 45vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-dim-foreground">
            <span className="text-xs">无封面</span>
          </div>
        )}
        {item.remarks ? (
          <span className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] text-foreground backdrop-blur-sm">
            {item.remarks}
          </span>
        ) : null}
        <CardMarkers source={item.source} id={item.id} />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">
          {item.title}
        </div>
        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">
            {[item.year, item.area, item.category].filter(Boolean).join(' · ') || '—'}
          </span>
          {hideSourceBadge ? null : (
            <span className="shrink-0 rounded bg-background/60 px-1.5 py-0.5 text-[10px] tracking-wide text-dim-foreground">
              {sourceName ?? item.source}
            </span>
          )}
        </div>
      </div>
    </LinkComponent>
  );
}
