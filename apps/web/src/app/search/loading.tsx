export default function SearchLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
      <div className="mb-6 flex w-full items-center gap-2">
        <div className="h-10 flex-1 animate-pulse rounded-md border border-border bg-surface" />
        <div className="h-10 w-20 animate-pulse rounded-md bg-primary/40" />
      </div>

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">正在并发搜索多个源…</span>
        </div>
        <div className="h-4 w-28 animate-pulse rounded bg-surface" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
            key={i}
            className="h-7 w-28 animate-pulse rounded-full border border-border bg-surface"
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
            key={i}
            className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface"
          >
            <div className="aspect-[2/3] w-full animate-pulse bg-background" />
            <div className="flex flex-col gap-2 p-3">
              <div className="h-4 w-full animate-pulse rounded bg-background" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-background" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
