'use client';

import { useEffect, useState } from 'react';
import { Button } from '../components/button';

const STORAGE_KEY = 'marstv:disclaimer-accepted-v1';

export function DisclaimerDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore storage failure (private mode etc.)
    }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      // biome-ignore lint/a11y/useSemanticElements: custom overlay without native <dialog> showModal semantics
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface-elevated p-6 shadow-xl">
        <h2 id="disclaimer-title" className="text-xl font-semibold tracking-tight text-foreground">
          使用声明
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            MarsTV 是一个开源的影视聚合浏览器,
            <span className="text-foreground">本站不提供、不存储、不分发任何视频内容</span>。
          </p>
          <p>
            所有视频数据均由部署者自行配置的第三方 CMS
            源提供,仅作技术研究与个人学习使用。严禁用于任何商业目的或侵犯版权的行为。
          </p>
          <p>继续使用即表示你已阅读并同意上述声明,并将由你自行承担因使用本站带来的一切责任。</p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" asChild>
            <a href="https://github.com/marstv" target="_blank" rel="noreferrer">
              查看项目
            </a>
          </Button>
          <Button onClick={accept}>我已知晓,进入 MarsTV</Button>
        </div>
      </div>
    </div>
  );
}
