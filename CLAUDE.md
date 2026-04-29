# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目定位

MarsTV 是一个**跨平台开源影视聚合平台**,参考 LibreTV / LunaTV / OrionTV 三者的经验重新设计,目标:"更快、更好看、全端可用"。对标三者的定位差异见 `@../../Users/fzpyi/.claude/plans/1-https-github-com-librespark-libretv-2-generic-pond.md`(完整实施方案)。

**核心差异化**:
1. 源测速择优(并发测速 + 评分 + 自动/手动切换线路)
2. 边缘缓存代理(Cloudflare Pages Functions / Vercel Edge,短缓存 m3u8、长缓存 segment)
3. 追剧订阅 + Web Push(无需 FCM/APNs)
4. 火星主题 Design System(深空背景 + 火星橙强调色)

## Monorepo 结构

pnpm workspaces,不使用 Turbo/Nx(保持简单):

```
marstv/
├── apps/
│   ├── web/         # Next.js 16 + App Router + React 19(主 Web + /api/*)
│   ├── desktop/     # Tauri 2 壳(M4)
│   └── mobile/      # Expo SDK 52 + RN 0.76,含 tvOS profile(M5)
├── packages/
│   ├── core/        # 共享:types / api-client / downstream / storage / stores
│   ├── ui-web/      # Web 组件(shadcn/ui 基础)
│   ├── ui-native/   # RN 组件(.mobile/.tablet/.tv.tsx 三变体)
│   └── config/      # design tokens + 共享配置
└── docker/          # Dockerfile + compose(M3)
```

**关键原则**:
- `packages/core` 必须保持**平台中立**(不依赖 `next/*`、`react-native/*`、`fs`、`node:*`),以便 Web / Desktop / Mobile / TV 四端复用
- `packages/config/tokens.ts` 是设计 token 的**唯一事实源**,Web(Tailwind theme extend)和 RN(StyleSheet)都从这里读
- 所有包 `"type": "module"`,ESM only

## 技术栈

- **Web**:**Next.js 16** + React 19 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui + Zustand + TanStack Query + ArtPlayer + HLS.js
- **桌面**:Tauri 2(Rust 壳)
- **移动/TV**:Expo 52 + React Native 0.76,TV 端用 `react-native-tvos` + EAS `production_tv` profile
- **包管理**:pnpm 10,Node ≥20.11
- **代码质量**:Biome 1.9(替代 ESLint+Prettier,速度快)
- **存储**:`IStorage` 抽象 → LocalStorage / Upstash / Redis 三实现

> ⚠️ **Next.js 16 注意**:`apps/web/AGENTS.md` 明确警告 Next 16 相对训练数据有破坏性变更(API、约定、文件结构)。在写任何 Next 相关代码前,**先查 `apps/web/node_modules/next/dist/docs/`** 的实际文档,不要凭记忆。遇到不一致时以 node_modules 里的文档为准。

## 开发命令

```bash
pnpm install              # 安装所有 workspace 依赖
pnpm dev                  # 等价 pnpm --filter web dev
pnpm --filter web dev     # 只启 Web
pnpm build                # 递归构建全部 app
pnpm lint                 # biome check .
pnpm lint:fix             # biome check --write .
pnpm format               # biome format --write .
pnpm typecheck            # 递归 tsc --noEmit
pnpm clean                # 清理 node_modules / .next / dist
```

单独跑某个包:`pnpm --filter @marstv/core typecheck`。

## 苹果 CMS V10 协议要点

所有 CMS 源遵循此协议,是本项目的主数据接口:

- **搜索**:`GET {api}?ac=videolist&wd={keyword}&pg={page}`
- **详情**:`GET {api}?ac=videolist&ids={id}`
- 详情响应里 `vod_play_url` 的三级分割:
  - `$$$` 分**线路**(对应 `vod_play_from` 按 `$$$` 切后的名字列表)
  - `#` 分**集**
  - `$` 分**"集名$URL"**

解析示例见 `packages/core/src/types/index.ts` 的 `PlayLine` / `Episode` 定义;M1 实现放在 `packages/core/src/downstream/apple-cms.ts`(待创建)。

## 代理安全红线(必须遵守)

`/api/proxy/*` 是本项目最关键的安全面,M1 起必须同时做到:

1. **HMAC 鉴权**:`PROXY_SECRET` 环境变量,签名 = HMAC(timestamp + url, secret),5 分钟窗口
2. **SSRF 防护**:只允许 `https://`(或白名单内的 `http://`);禁止私网 IP 段 `10.*` / `172.16-31.*` / `192.168.*` / `127.*` / `169.254.*` / `::1` / `fc00::/7`
3. **Host 白名单**:可选,通过 `ALLOWED_PROXY_HOSTS` 限制下游域名
4. **环境变量缺失时拒绝启动**,不允许默认弱 secret

参考实现:LibreTV `server.mjs` + `proxy-auth.js`。**不要重复造轮子的 SSRF 保护**,直接翻译他们的黑名单逻辑。

## 许可证与合规

- **代码**:MIT(见 `LICENSE.md`)
- **视频内容**:**不内置任何源**,只保留 `testSource` 示例,强制部署者自配
- 首屏必须有免责声明弹窗:仅学习/个人用、不存储/分发视频、不得商用
- `PROXY_SECRET` 必填,未设置拒绝启动
- 可选 `SITE_PASSWORD` 前端访问密码

## 当前阶段

**M1 已闭环** —— Web 端功能 + 工程质量全线打通,M2 开始接入服务端存储与边缘部署。

**M1 已就绪**:
- `packages/core`:CMS V10 解析(`apple-cms` / `aggregate` / `fetch-helper`)、豆瓣(`douban`)、测速(`speedtest`)、源健康评分(`source-health`,给 `aggregateSearch` 提供动态超时 + 失败源跳过 + 按分排序)、`IStorage` + localStorage 实现(history / favorites / subscriptions)
- `apps/web` API:`/api/{search,detail,availability,douban,speedtest,proxy/m3u8,image/*,subscriptions/check,health/cms}`
- 代理安全:HMAC 签名(5 分钟 bucket,URL 边缘可缓存) + SSRF 黑名单 + 分层 `CDN-Cache-Control`
- 播放器:ArtPlayer + HLS.js,致命错误回退到"换线路"覆盖层,进度持久化 / 下一集预取 / N·P·? 键盘快捷键
- 页面:首页(豆瓣 + 继续观看 + 追剧行) / 搜索 / 播放 / 收藏 / 历史 / 追剧 / 豆瓣 / 首访免责声明;收藏/历史/追剧共用 `<PosterGridSkeleton>` + `<CollectionEmptyState>` + `<CollectionErrorState>` 三态
- shadcn/ui 已初始化(button / card / input + components.json,new-york 风格)
- 测试:`packages/core` 87 条 vitest / `apps/web` 105 条 vitest / 20 条 Playwright E2E,覆盖 CMS 解析、SSRF、HMAC、API 路由、免责声明、导航、三页集合页

**M2 预备**:
- ✅ Upstash 存储后端:`packages/core` 提供 `createRedisSourceHealthStore(client)` + `IRedisLike` 接口;`apps/web` 实现 REST 客户端,通过 env 调度(见"环境变量"节)。`/api/health/cms` GET 响应里 `backend` 字段会回显 `'redis' | 'memory'`
- ✅ SITE_PASSWORD 站点密码门:Next 16 Proxy(`apps/web/src/proxy.ts`)+ `/login` 页 + `/api/login` 路由。未设置 `SITE_PASSWORD` 时 proxy 短路放行;设置后未登录页面重定向到 `/login`,未登录 API 返回 401 JSON。Cookie 值 = `HMAC(SITE_PASSWORD, v1-context)`,无服务端状态,改密码立即失效所有 session。白名单:`/login`、`/api/login`、`/api/health/*`
- Web Push(依赖 Upstash 做订阅存储)
- Cloudflare Pages Functions 边缘部署脚本

## 环境变量

- `PROXY_SECRET`(必填):`/api/proxy/*` HMAC 签名密钥。未设置则拒绝启动
- `CMS_SOURCES_JSON`(必填):苹果 CMS 源列表 JSON 数组
- `ALLOWED_PROXY_HOSTS`(可选):代理下游域名白名单,逗号分隔
- `SITE_PASSWORD`(可选):启用站点密码门。未设置时 `proxy.ts` 短路放行,完全不拦截;设置后 Cookie = `HMAC(SITE_PASSWORD, v1-context)`,**改值立即失效所有 session**
- `HEALTH_PROBE_TOKEN`(可选):启用 `POST /api/health/cms` 主动探测所需的 token
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`(可选,成对出现):启用 Redis 持久化 source-health。**都未设置时回退到进程内 Map**,重启状态丢失

**新增功能前先检查 `packages/core` 是否已有可复用实现**,避免重复。

## 文件命名与代码风格

- TypeScript 文件用 **kebab-case**(`apple-cms.ts`、`speed-test.ts`)
- React 组件文件用 **PascalCase**(`VideoCard.tsx`、`PlayerOverlay.tsx`)
- RN 三端变体后缀:`Component.mobile.tsx` / `.tablet.tsx` / `.tv.tsx`
- 导入别名:
  - Web:`@/*` 指 `apps/web/src/*`
  - 跨包:`@marstv/core`、`@marstv/ui-web`、`@marstv/config`
- Biome 已配置:单引号、分号、末尾逗号、2 空格
- 默认**不写注释**;只在 WHY 不明显时写一行(比如绕过某个特定 CMS 的解析 bug)

## 参考项目(已研究的先验经验)

不要直接 fork,但可以抄思路:
- **CMS V10 解析与聚合搜索**:LunaTV `src/lib/downstream.ts`
- **多平台 Serverless 代理**:LibreTV `api/proxy/[...path].mjs` + Cloudflare/Netlify functions
- **TV 遥控器 focus 与响应式**:OrionTV `components/VideoCard.tv.tsx` + `hooks/useResponsiveLayout.ts`
- **SSRF 防护与 HMAC 鉴权**:LibreTV `server.mjs` + `js/proxy-auth.js`

研究笔记放在 `../../Users/fzpyi/.claude/plans/1-https-github-com-librespark-libretv-2-generic-pond.md`。
