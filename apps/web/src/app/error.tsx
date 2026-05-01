'use client';

// Segment-level error boundary. Next catches thrown errors from any server
// component in this subtree (home / search / play / etc.) and renders this.
// The reset() callback re-renders the boundary's children — usually enough
// to recover from transient upstream failures.

import Link from 'next/link';
import { useEffect } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: Props) {
  useEffect(() => {
    // Surfaces the error in the browser console so dev can debug. In prod
    // the digest is the only handle back to the server log.
    console.error('[root-error]', error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center md:px-8">
      <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full border border-danger/40 bg-danger/10 text-danger">
        !
      </div>
      <h1 className="mb-3 text-2xl font-semibold text-foreground">页面加载出错</h1>
      <p className="mb-1 max-w-md text-sm leading-6 text-muted-foreground">
        上游服务可能临时不可用,请稍后再试。
      </p>
      {error.digest ? (
        <p className="mb-6 font-mono text-[11px] text-dim-foreground">digest: {error.digest}</p>
      ) : (
        <div className="mb-6" />
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-primary-hover"
        >
          重试
        </button>
        <Link
          href="/"
          className="inline-flex items-center glass-card rounded-full px-5 py-2 text-sm text-foreground transition-all hover:border-primary/30 hover:text-primary"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
