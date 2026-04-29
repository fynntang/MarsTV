'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const MIN_VISIBLE_MS = 500;

export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const startedAt = useRef<number>(0);
  const pendingHide = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When the committed URL changes, start the hide countdown honoring the
  // minimum-visible window so users always see the bar, even if Router Cache
  // commits the URL before real data arrives.
  const urlKey = `${pathname}?${searchParams.toString()}`;
  useEffect(() => {
    if (!urlKey) return;
    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    if (pendingHide.current) clearTimeout(pendingHide.current);
    pendingHide.current = setTimeout(() => setActive(false), remaining);
    return () => {
      if (pendingHide.current) clearTimeout(pendingHide.current);
    };
  }, [urlKey]);

  useEffect(() => {
    const start = () => {
      if (pendingHide.current) {
        clearTimeout(pendingHide.current);
        pendingHide.current = null;
      }
      startedAt.current = Date.now();
      setActive(true);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.('a');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
          return;
        }
      } catch {
        return;
      }
      start();
    };

    const onSubmit = (e: SubmitEvent) => {
      if (e.defaultPrevented) return;
      start();
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden transition-opacity duration-200 ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="marstv-progress-bar h-full w-1/3 bg-primary shadow-[0_0_12px_rgba(255,107,53,0.8)]" />
    </div>
  );
}
