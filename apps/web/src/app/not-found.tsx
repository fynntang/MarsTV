import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center md:px-8">
      <div className="mb-6 text-[64px] font-semibold leading-none text-primary/80">404</div>
      <h1 className="mb-3 text-2xl font-semibold text-foreground">迷路在太空深处</h1>
      <p className="mb-8 max-w-md text-sm leading-6 text-muted-foreground">
        你访问的页面不存在,可能被删除或地址错误。不要紧,回首页继续探索。
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-primary-hover"
        >
          返回首页
        </Link>
        <Link
          href="/douban"
          className="inline-flex items-center rounded-full border border-border/70 bg-surface/60 px-5 py-2 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          浏览豆瓣片单
        </Link>
      </div>
    </div>
  );
}
