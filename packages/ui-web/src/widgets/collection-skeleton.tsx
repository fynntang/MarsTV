'use client';

function skeletonKeys(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `sk-${i}`);
}

export function PosterGridSkeleton({ count = 10 }: { count?: number }) {
  const keys = skeletonKeys(count);
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {keys.map((k) => (
        <div key={k} className="glass-card animate-pulse overflow-hidden rounded-xl">
          <div className="aspect-[2/3] w-full bg-surface/60" />
          <div className="h-7 px-2 py-1.5">
            <div className="h-3 w-3/4 rounded bg-surface/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CollectionEmptyState({
  title: _title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card rounded-xl p-10 text-center text-sm text-muted-foreground">
      {description}
    </div>
  );
}

export function CollectionErrorState({
  description,
  onRetry,
}: {
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="glass-card rounded-xl px-4 py-10 text-center text-sm text-danger">
      <p>{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center rounded-full border border-danger/40 bg-danger/10 px-4 py-1.5 text-xs text-danger transition-colors hover:bg-danger/20"
        >
          重试
        </button>
      ) : null}
    </div>
  );
}
