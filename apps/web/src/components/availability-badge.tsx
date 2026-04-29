'use client';

// Lazy "N 源可看" badge for Douban cards. Uses IntersectionObserver so cards
// below the fold don't fire any network request until the user scrolls to
// them. The /api/availability endpoint dedupes + caches per-keyword so 24
// simultaneously-visible cards cost at most 24 CMS fan-outs on cold cache.

import { useEffect, useRef, useState } from 'react';

interface Props {
  title: string;
}

interface AvailabilityResponse {
  count: number;
  sourceCount: number;
}

// Tiny in-memory cache at module scope so re-mounts (e.g. paging back/forth
// on /douban) don't re-fetch what we already know this page view.
const clientCache = new Map<string, AvailabilityResponse>();
const clientInflight = new Map<string, Promise<AvailabilityResponse>>();

function fetchAvailability(title: string, signal: AbortSignal): Promise<AvailabilityResponse> {
  const cached = clientCache.get(title);
  if (cached) return Promise.resolve(cached);

  const existing = clientInflight.get(title);
  if (existing) return existing;

  const p = (async () => {
    const res = await fetch(`/api/availability?q=${encodeURIComponent(title)}`, { signal });
    if (!res.ok) throw new Error(`availability: ${res.status}`);
    const data = (await res.json()) as AvailabilityResponse;
    clientCache.set(title, data);
    clientInflight.delete(title);
    return data;
  })().catch((err) => {
    clientInflight.delete(title);
    throw err;
  });
  clientInflight.set(title, p);
  return p;
}

export function AvailabilityBadge({ title }: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  // Start null on first render to keep SSR HTML identical to the client's
  // initial hydration pass — the module-level clientCache is a post-hydration
  // perf cache, not a seed value.
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (data || visible) return;
    const el = ref.current;
    if (!el) return;

    // Guard for SSR / jsdom and older browsers.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            return;
          }
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [data, visible]);

  useEffect(() => {
    if (!visible || data) return;
    const ac = new AbortController();
    fetchAvailability(title, ac.signal)
      .then((r) => setData(r))
      .catch(() => {
        // silently swallow — badge just won't render
      });
    return () => ac.abort();
  }, [visible, data, title]);

  // Always render a zero-size probe element so the observer has a target even
  // before we have data. Once we have a non-zero sourceCount we render the
  // actual badge in its place.
  if (!data || data.sourceCount === 0) {
    return <span ref={ref} aria-hidden="true" className="absolute" />;
  }

  return (
    <span
      ref={ref}
      className="absolute left-1 bottom-1 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-background shadow-md"
      title={`${data.sourceCount} 个源命中,共 ${data.count} 条`}
    >
      {data.sourceCount} 源可看
    </span>
  );
}
