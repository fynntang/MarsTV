'use client';

import { useState, useTransition } from 'react';
import { Button } from '../components/button';
import { Input } from '../components/input';

interface Props {
  /** Called when the user submits a search query. */
  onSearch: (query: string) => void;
  defaultValue?: string;
  autoFocus?: boolean;
  className?: string;
  size?: 'default' | 'lg';
}

export function SearchBox({
  onSearch,
  defaultValue = '',
  autoFocus = false,
  className,
  size = 'default',
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    startTransition(() => {
      onSearch(q);
    });
  };

  const big = size === 'lg';

  return (
    <div className={['relative w-full', className].filter(Boolean).join(' ')}>
      <form onSubmit={submit} className="flex w-full items-center gap-2">
        <Input
          type="search"
          inputMode="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="搜索影视剧、番剧、综艺…"
          autoFocus={autoFocus}
          className={big ? 'h-12 text-base' : undefined}
        />
        <Button
          type="submit"
          size={big ? 'lg' : 'default'}
          disabled={isPending || value.trim().length === 0}
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
              搜索中
            </span>
          ) : (
            '搜索'
          )}
        </Button>
      </form>
      {isPending ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-1 h-0.5 overflow-hidden rounded-full bg-primary/10"
        >
          <div className="marstv-progress-bar h-full w-1/3 bg-primary" />
        </div>
      ) : null}
    </div>
  );
}
