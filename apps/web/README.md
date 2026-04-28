# @marstv/web

MarsTV 的 Web 应用:Next.js 16 + React 19 + Tailwind CSS 4。

同时承载 `/api/*` 后端路由(搜索、详情、代理、用户等)。

## 本地开发

```bash
# 从仓库根目录运行
pnpm install
cp .env.example .env.local   # 至少填 PROXY_SECRET
pnpm dev                      # 等价 pnpm --filter @marstv/web dev
# → http://localhost:3000
```

## 重要约定

- 跨包导入走 `@marstv/core`、`@marstv/ui-web`、`@marstv/config`
- `next.config.ts` 已配 `transpilePackages` 让 workspace 包的 `.ts` 源码被直接编译
- Tailwind v4 使用新的 CSS 配置方式(`@import 'tailwindcss'` 而非 `@tailwind base`)
- **Next.js 16 相对训练数据有破坏性变更** —— 写代码前先查 `node_modules/next/dist/docs/`,不要凭记忆(见 `AGENTS.md`)

架构和路线图见仓库根 [`CLAUDE.md`](../../CLAUDE.md)。
