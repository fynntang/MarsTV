import { NextLoginForm } from '@/components/next-login-form';
import { isEnabled } from '@/lib/site-password';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: '登录',
};

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const gateOn = isEnabled();
  return (
    <main className="flex min-h-[60vh] flex-1 items-center justify-center px-4 py-12">
      <div className="glass-elevated w-full max-w-sm rounded-2xl p-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">MarsTV 站点登录</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {gateOn ? '请输入部署方设置的访问密码。' : '此站点未启用密码保护,可直接访问。'}
        </p>
        {gateOn && (
          <div className="mt-6">
            <Suspense fallback={null}>
              <NextLoginForm />
            </Suspense>
          </div>
        )}
      </div>
    </main>
  );
}
