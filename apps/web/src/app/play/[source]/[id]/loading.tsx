export default function PlayLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div className="h-7 w-48 animate-pulse rounded bg-surface" />
        <div className="h-5 w-32 animate-pulse rounded bg-surface/60" />
      </div>

      {/* 16:9 player placeholder */}
      <div className="relative w-full overflow-hidden rounded-lg border border-border/60 bg-surface/40">
        <div className="aspect-video w-full animate-pulse bg-background/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            正在加载视频信息…
          </div>
        </div>
      </div>

      {/* Line pills placeholder */}
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
            key={i}
            className="h-7 w-20 animate-pulse rounded-full border border-border/60 bg-surface/60"
          />
        ))}
      </div>

      {/* Episode grid placeholder */}
      <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
            key={i}
            className="h-8 animate-pulse rounded-md border border-border/60 bg-surface/60"
          />
        ))}
      </div>
    </div>
  );
}
