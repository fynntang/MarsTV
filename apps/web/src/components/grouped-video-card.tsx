import { cn } from '@/lib/utils';
import type { SourceHit, VideoGroup } from '@marstv/core';
import { CardMarkers } from '@marstv/ui-web';
import Image from 'next/image';
import Link from 'next/link';

// A "group" is the same (normalized) title seen across multiple CMS sources.
// The primary card links to the first source's play page; additional sources
// surface as a secondary row of chips under the card so users can jump to a
// specific provider without scrolling through per-source sections.

function hrefFor(hit: SourceHit): string {
  return `/play/${encodeURIComponent(hit.item.source)}/${encodeURIComponent(hit.item.id)}`;
}

export function GroupedVideoCard({ group }: { group: VideoGroup }) {
  const { primary } = group;
  const { item } = primary;
  const totalSources = 1 + group.others.length;
  const proxiedPoster = item.poster ? `/api/image/cms?u=${encodeURIComponent(item.poster)}` : null;
  const href = hrefFor(primary);

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-all',
        'hover:border-primary hover:shadow-lg hover:shadow-primary/10',
      )}
    >
      <Link
        href={href}
        className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
          {totalSources > 1 ? (
            <span className="absolute left-2 top-2 rounded-md bg-primary/90 px-1.5 py-0.5 text-[11px] font-medium text-background shadow-md">
              {totalSources} 源可看
            </span>
          ) : null}
          <CardMarkers source={item.source} id={item.id} />
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <div className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">
            {item.title}
          </div>
          <div className="mt-auto text-xs text-muted-foreground">
            <span className="truncate">
              {[item.year, item.area, item.category].filter(Boolean).join(' · ') || '—'}
            </span>
          </div>
        </div>
      </Link>
      {group.others.length > 0 ? (
        <div className="flex flex-wrap gap-1 border-t border-border/40 bg-background/30 px-2 py-1.5">
          <SourceChip hit={primary} primary />
          {group.others.map((hit) => (
            <SourceChip key={hit.source.key} hit={hit} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function SourceChip({ hit, primary = false }: { hit: SourceHit; primary?: boolean }) {
  return (
    <Link
      href={hrefFor(hit)}
      className={cn(
        'inline-flex max-w-[7rem] items-center gap-1 truncate rounded-full px-2 py-0.5 text-[10px] tracking-wide transition-colors',
        primary
          ? 'bg-primary/15 text-primary hover:bg-primary/25'
          : 'bg-surface text-dim-foreground hover:bg-surface/80 hover:text-foreground',
      )}
      title={hit.source.name}
    >
      <span className="truncate">{hit.source.name}</span>
    </Link>
  );
}
