'use client';

import { LoginForm } from '@marstv/ui-web';
import { useRouter, useSearchParams } from 'next/navigation';

export function NextLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('next') ?? '/';

  return (
    <LoginForm
      onLoginSuccess={() => {
        const safeNext = returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/';
        router.replace(safeNext);
        router.refresh();
      }}
    />
  );
}
