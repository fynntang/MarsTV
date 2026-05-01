# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目定位

MarsTV 是一个**跨平台开源影视聚合平台**，参考 LibreTV / LunaTV / OrionTV 重新设计，目标："更快、更好看、全端可用"。

核心差异化：源测速择优 + 边缘缓存代理 + 追剧订阅 + Web Push + 火星主题 Design System。

## Monorepo 结构

pnpm workspaces，不使用 Turbo/Nx：

```
marstv/
├── apps/
│   ├── web/         # Next.js 16 + App Router + React 19（主 Web + /api/*）
│   ├── desktop/     # Tauri 2 壳
│   └── mobile/      # Expo SDK 52 + RN 0.76，含 tvOS profile
├── packages/
│   ├── core/        # 共享：types / downstream / storage（平台中立）
│   ├── ui-web/      # Web 组件（shadcn/ui 组件实际在 apps/web/src/components/ui/）
│   ├── ui-native/   # RN 组件（.mobile/.tablet/.tv.tsx 三变体）
│   └── config/      # design tokens + 共享配置
└── docker/          # Dockerfile + compose
```

**关键原则**：
- `packages/core` 必须保持**平台中立**（不依赖 `next/*`、`react-native/*`、`fs`、`node:*`）
- `packages/config/tokens.ts` 是设计 token 的**唯一事实源**
- 绝大多数包 `"type": "module"`，ESM only

## 技术栈

- **Web**：Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui + ArtPlayer + HLS.js
- **桌面**：Tauri 2（Rust 壳）
- **移动/TV**：Expo 52 + React Native 0.76 + react-native-tvos
- **包管理**：pnpm 10，Node ≥20.11
- **代码质量**：Biome 1.9（替代 ESLint+Prettier）
- **存储**：`IStorage` 抽象，Web 侧 client/server 自动分发（localStorage / Upstash REST / Redis）

> ⚠️ **Next.js 16 注意**：写任何 Next 相关代码前，**先查 `apps/web/node_modules/next/dist/docs/`** 的实际文档，不要凭记忆。OpenNext Cloudflare 不依赖 Next Proxy，站点密码门改为页面级 `requirePagePassword()` + API 级 `requireApiPassword()`。

## 开发命令

```bash
pnpm install              # 安装所有 workspace 依赖
pnpm dev                  # 等价 pnpm --filter web dev
pnpm build                # 递归构建全部 app
pnpm lint                 # biome check .
pnpm lint:fix             # biome check --write .
pnpm format               # biome format --write .
pnpm typecheck            # 递归 tsc --noEmit
pnpm test                 # 递归 vitest
pnpm test:e2e             # Playwright E2E（需先 dev server 在 3100 端口）
pnpm clean                # 清理 node_modules / .next / dist
```

单独跑某个包：`pnpm --filter @marstv/core typecheck`。

**Windows + NAS 约束**：仓库根 `.npmrc` 强制 `node-linker=hoisted` + `strict-peer-dependencies=false`（NTFS junction 在 NAS 挂载盘上不可靠）。**不要删掉 `.npmrc`**。

**Playwright E2E gotchas**：
- dev server 跑在 **3100 端口**（不是 3000）
- baseURL 必须用 `localhost`，**不能用 `127.0.0.1`** —— Next 16 的 `allowedDevOrigins` 会静默阻断 hydration
- E2E 用 `CMS_SOURCES_JSON='[]'` 保证空态确定性

## 分支与提交规范

- 功能分支 + PR 合并到 `main`
- Conventional commits 必选：`feat:` / `fix:` / `chore:` / `docs:` / `test:` / `refactor:`

## 苹果 CMS V10 协议

关键分隔符（`vod_play_url`）：`$$$` 分线路 → `#` 分集 → `$` 分"集名$URL"。类型定义见 `packages/core/src/types/index.ts`，解析实现见 `packages/core/src/downstream/apple-cms.ts`。

## 代理安全红线

`/api/proxy/*` 必须同时做到：

1. **HMAC 鉴权**：`PROXY_SECRET` 环境变量，签名 = HMAC(timestamp + url, secret)，5 分钟窗口
2. **SSRF 防护**：只允许 `https://`（或白名单内的 `http://`）；禁止私网 IP 段 `10.*` / `172.16-31.*` / `192.168.*` / `127.*` / `169.254.*` / `::1` / `fc00::/7`
3. **Host 白名单**：可选，通过 `ALLOWED_PROXY_HOSTS` 限制下游域名
4. **环境变量缺失时拒绝启动**，不允许默认弱 secret

参考实现：LibreTV `server.mjs` + `proxy-auth.js`。不要重复造轮子的 SSRF 保护。

## 许可证与合规

- 代码：MIT（见 `LICENSE.md`）
- **不内置任何源**，只保留 `testSource` 示例，强制部署者自配
- 首屏必须有免责声明弹窗
- `PROXY_SECRET` 必填，未设置拒绝启动
- 可选 `SITE_PASSWORD` 前端访问密码

## 当前阶段

M1（Web 功能 + 工程质量）、M2（服务端存储 + 边缘部署）、M4（Tauri 2 桌面端）、M5（Expo 移动/TV 端）已就绪。

## next.config.ts 关键配置

- `output: 'standalone'`（Docker/Vercel/CF/桌面均用 standalone）
- `transpilePackages: ['@marstv/core', '@marstv/ui-web', '@marstv/config']`
- `initOpenNextCloudflareForDev()` 由 `OPEN_NEXT_DEV` env 门控

## 环境变量

**必填**：
- `PROXY_SECRET` —— `/api/proxy/*` HMAC 签名密钥，未设置拒绝启动
- `CMS_SOURCES_JSON` —— 苹果 CMS 源列表 JSON 数组

**站点配置**：
- `NEXT_PUBLIC_SITE_NAME` / `NEXT_PUBLIC_SITE_URL` —— 站点品牌（`NEXT_PUBLIC_` 前缀会被打进 bundle）

**可选安全**：
- `ALLOWED_PROXY_HOSTS` —— 代理下游域名白名单，逗号分隔
- `SITE_PASSWORD` —— 站点密码门。Cookie = `HMAC(SITE_PASSWORD, v1-context)`，改值立即失效所有 session
- `HEALTH_PROBE_TOKEN` —— 启用 `POST /api/health/cms` 主动探测

**存储后端**（都未设置则回退到进程内 Map）：
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`（成对）
- `REDIS_URL` —— 自托管 Redis

**豆瓣代理**：
- `DOUBAN_PROXY_MODE` —— `direct` | `tencent` | `aliyun` | `custom`
- `DOUBAN_CUSTOM_PROXY` —— 自定义反代 URL（`DOUBAN_PROXY_MODE=custom` 时必填）

**Web Push**（待实现）：
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`

**部署**：
- `OPEN_NEXT_DEV` —— 启用 Cloudflare dev proxy

## 文件命名与代码风格

- TypeScript 文件用 **kebab-case**（`apple-cms.ts`）
- React 组件文件用 **PascalCase**（`VideoCard.tsx`）
- RN 三端变体后缀：`Component.mobile.tsx` / `.tablet.tsx` / `.tv.tsx`
- 导入别名：Web `@/*` → `apps/web/src/*`；跨包 `@marstv/core`、`@marstv/ui-web`、`@marstv/config`
- Biome 已配置：单引号、分号、末尾逗号、2 空格、line width 100、`organizeImports` 开启
- 默认**不写注释**；只在 WHY 不明显时写一行
