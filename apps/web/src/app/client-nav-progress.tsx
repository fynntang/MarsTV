'use client';

import { NavProgress } from '@marstv/ui-web';
import { usePathname, useSearchParams } from 'next/navigation';

export function ClientNavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return <NavProgress pathname={pathname} searchParams={searchParams} />;
}
