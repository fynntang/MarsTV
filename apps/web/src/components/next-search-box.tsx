'use client';

import { SearchBox } from '@marstv/ui-web';
import { useRouter } from 'next/navigation';

interface Props {
  defaultValue?: string;
  autoFocus?: boolean;
  className?: string;
  size?: 'default' | 'lg';
}

export function NextSearchBox({ defaultValue, autoFocus, className, size }: Props) {
  const router = useRouter();
  return (
    <SearchBox
      onSearch={(q) => router.push(`/search?q=${encodeURIComponent(q)}`)}
      defaultValue={defaultValue}
      autoFocus={autoFocus}
      className={className}
      size={size}
    />
  );
}
