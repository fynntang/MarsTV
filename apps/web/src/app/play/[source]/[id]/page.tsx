import { EpisodeGrid } from '@/components/episode-grid';
import { FavoriteButton } from '@/components/favorite-button';
import { PlayerEmbed } from '@/components/player-embed';
import { SpeedtestButton } from '@/components/speedtest-button';
import { SubscribeButton } from '@/components/subscribe-button';
import { signProxyUrl } from '@/lib/proxy-auth';
import { requirePagePassword } from '@/lib/site-password-guard';
import { findSource } from '@/lib/sources';
import { cn } from '@/lib/utils';
import { type VideoDetail, getDetail } from '@marstv/core';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type Params = Promise<{ source: string; id: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export const dynamic = 'force-dynamic';

async function loadDetail(sourceKey: string, id: string): Promise<VideoDetail | null> {
  const source = findSource(sourceKey);
  if (!source) return null;
  try {
    return await getDetail(source, id, { timeoutMs: 8000 });
  } catch {
    return null;
  }
}

export async function generateMetadata(props: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { source, id } = await props.params;
  const sp = await props.searchParams;
  await requirePagePassword(`/play/${encodeURIComponent(source)}/${encodeURIComponent(id)}`, sp);
  const detail = await loadDetail(source, id);
  if (!detail) return { title: '视频未找到' };
  return { title: detail.title };
}

function asInt(v: string | string[] | undefined, fallback = 0): number {
  const s = typeof v === 'string' ? v : '';
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function buildProxied(targetUrl: string, origin: string): string {
  const { token, expiresAt } = signProxyUrl(targetUrl);
  const q = new URLSearchParams({ u: targetUrl, e: String(expiresAt), s: token });
  return `${origin}/api/proxy/m3u8?${q.toString()}`;
}

// CMS vod_content often contains raw HTML (p/br/em). We don't want the player
// page to render user-supplied HTML — just extract the text.
function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export default async function PlayPage(props: { params: Params; searchParams: SearchParams }) {
  const { source, id } = await props.params;
  const sp = await props.searchParams;
  await requirePagePassword(`/play/${encodeURIComponent(source)}/${encodeURIComponent(id)}`, sp);

  const detail = await loadDetail(source, id);
  if (!detail) notFound();

  // Source name for UI display (detail.source is the key; findSource gives us
  // the human-readable name from CMS_SOURCES_JSON). Fallback to key if the
  // source isn't configured locally for some reason.
  const cmsSource = findSource(source);
  const sourceName = cmsSource?.name ?? detail.source;

  const lines = detail.lines;
  if (lines.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
        <h1 className="mb-2 text-xl font-semibold">{detail.title}</h1>
        <p className="text-sm text-muted-foreground">该视频暂无可用播放线路</p>
      </div>
    );
  }

  const lineIdx = Math.min(asInt(sp.line), lines.length - 1);
  const line = lines[lineIdx];
  if (!line) notFound();
  const epIdx = Math.min(asInt(sp.ep), line.episodes.length - 1);
  const episode = line.episodes[epIdx];
  if (!episode) notFound();

  // Build signed proxy URL server-side. The client player only sees the
  // opaque /api/proxy/m3u8?u=...&e=...&s=... URL; upstream target is hidden.
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;
  const playbackUrl = buildProxied(episode.url, origin);

  // Auto-advance: if we're mid-line, point at next episode; same line, next ep.
  // Last episode of the line → no auto-advance (don't jump lines silently).
  const nextEpIdx = epIdx + 1 < line.episodes.length ? epIdx + 1 : null;
  const nextHref =
    nextEpIdx !== null
      ? `/play/${encodeURIComponent(source)}/${encodeURIComponent(id)}?line=${lineIdx}&ep=${nextEpIdx}`
      : undefined;
  // Keyboard `P` previous episode. Line stays the same; no wrap-around on ep 0.
  const prevEpIdx = epIdx > 0 ? epIdx - 1 : null;
  const prevHref =
    prevEpIdx !== null
      ? `/play/${encodeURIComponent(source)}/${encodeURIComponent(id)}?line=${lineIdx}&ep=${prevEpIdx}`
      : undefined;
  // Prefetchable signed m3u8 URL for the next episode. Sending a low-priority
  // fetch once the viewer is 80% through warms the edge cache so the next-ep
  // click has the manifest (and its first segments) already hot. 5-min bucketed
  // expiry in signProxyUrl means this URL is byte-identical across users.
  const nextEpisodeUpstream = nextEpIdx !== null ? line.episodes[nextEpIdx]?.url : undefined;
  const nextPlaybackUrl = nextEpisodeUpstream
    ? buildProxied(nextEpisodeUpstream, origin)
    : undefined;
  // Fallback line for the error overlay: next line (wrap to 0 if we're on
  // the last line). The server clamps `ep` to that line's episode count, so
  // pass the current episode index verbatim — /play will land on whichever
  // episode exists.
  const nextLineIdx = lines.length > 1 ? (lineIdx + 1) % lines.length : null;
  const nextLineHref =
    nextLineIdx !== null
      ? `/play/${encodeURIComponent(source)}/${encodeURIComponent(id)}?line=${nextLineIdx}&ep=${epIdx}`
      : undefined;
  const nextLineName = nextLineIdx !== null ? (lines[nextLineIdx]?.name ?? undefined) : undefined;
  const progressKey = `${source}:${id}:${lineIdx}:${epIdx}`;
  // For the subscribe button: use max episode count across all lines as the
  // baseline — different lines can lag behind the primary broadcast, so the
  // max is what tracks "latest ep available overall".
  const maxEpisodeCount = lines.reduce((m, l) => Math.max(m, l.episodes.length), 0);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{detail.title}</h1>
        <div className="flex items-center gap-3">
          <FavoriteButton
            source={source}
            sourceName={sourceName}
            id={id}
            title={detail.title}
            poster={detail.poster}
          />
          <SubscribeButton
            source={source}
            sourceName={sourceName}
            id={id}
            title={detail.title}
            poster={detail.poster}
            lineIdx={lineIdx}
            lineName={line.name}
            episodeCount={maxEpisodeCount}
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-surface px-1.5 py-0.5 tracking-wide text-dim-foreground">
              {sourceName}
            </span>
            {detail.year ? <span>{detail.year}</span> : null}
            {detail.area ? <span>· {detail.area}</span> : null}
            {detail.category ? <span>· {detail.category}</span> : null}
            {detail.remarks ? <span className="text-primary">· {detail.remarks}</span> : null}
          </div>
        </div>
      </div>

      <PlayerEmbed
        key={`${lineIdx}:${epIdx}`}
        src={playbackUrl}
        poster={detail.poster}
        title={`${detail.title} · ${line.name} · ${episode.title}`}
        progressKey={progressKey}
        nextHref={nextHref}
        prevHref={prevHref}
        nextPlaybackUrl={nextPlaybackUrl}
        nextLineHref={nextLineHref}
        nextLineName={nextLineName}
        record={{
          source,
          sourceName,
          id,
          title: detail.title,
          poster: detail.poster,
          lineIdx,
          lineName: line.name,
          epIdx,
        }}
      />

      {detail.desc ? (
        <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">
          {stripHtml(detail.desc)}
        </p>
      ) : null}

      {lines.length > 1 ? (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-foreground">线路</h2>
            <SpeedtestButton
              sourceKey={source}
              videoId={id}
              currentLine={lineIdx}
              episode={epIdx}
              lines={lines
                .map((l, i) => {
                  const first = l.episodes[0];
                  if (!first) return null;
                  return { index: i, source: detail.source, name: l.name, url: first.url };
                })
                .filter((l): l is NonNullable<typeof l> => l !== null)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {lines.map((l, i) => (
              <Link
                key={`${l.name}:${i}`}
                href={`/play/${encodeURIComponent(source)}/${encodeURIComponent(id)}?line=${i}&ep=0`}
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors',
                  i === lineIdx
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border/60 bg-surface/60 text-muted-foreground hover:border-border-strong hover:text-foreground',
                )}
              >
                {l.name}
                <span className="ml-1 text-dim-foreground">({l.episodes.length})</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-foreground">
          剧集 <span className="text-dim-foreground">· 共 {line.episodes.length} 集</span>
        </h2>
        <EpisodeGrid
          source={source}
          id={id}
          lineIdx={lineIdx}
          currentEpIdx={epIdx}
          episodes={line.episodes}
        />
      </section>
    </div>
  );
}
