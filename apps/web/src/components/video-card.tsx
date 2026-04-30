import { cn } from '@/lib/utils';
import type { VideoItem } from '@marstv/core';
import { CardMarkers } from '@marstv/ui-web';
import Image from 'next/image';
import Link from 'next/link';

interface Props {
  item: VideoItem;
  /** Optional pre-resolved source name. Falls back to item.source (key) when omitted. */
  sourceName?: string;
  /** Hide the source badge — useful when the card lives inside a per-source section. */
  hideSourceBadge?: boolean;
}

export function VideoCard({ item, sourceName, hideSourceBadge }: Props) {
  const href = `/play/${encodeURIComponent(item.source)}/${encodeURIComponent(item.id)}`;
  // CMS poster hosts often block cross-origin hotlinks or serve broken SSL.
  // Route them through our own proxy (SSRF-hardened, 7-day CDN cache).
  const proxiedPoster = item.poster ? `/api/image/cms?u=${encodeURIComponent(item.poster)}` : null;

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-all',
        'hover:border-primary hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      <div className="relative aspect-[2/3] w-full bg-background">
        {proxiedPoster ? (
          <Image
            src={proxiedPoster}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 45vw"
            unoptimized
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
    </Link>
  );
}
