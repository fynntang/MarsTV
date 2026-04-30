# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目定位

MarsTV 是一个**跨平台开源影视聚合平台**,参考 LibreTV / LunaTV / OrionTV 三者的经验重新设计,目标:"更快、更好看、全端可用"。

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
│   ├── desktop/     # Tauri 2 壳(M4,README 占位)
│   └── mobile/      # Expo SDK 52 + RN 0.76,含 tvOS profile(M5,README 占位)
├── packages/
│   ├── core/        # 共享:types / downstream / storage(平台中立)
│   ├── ui-web/      # Web 组件(当前为空占位,shadcn/ui 组件实际在 apps/web/src/components/ui/)
│   ├── ui-native/   # RN 组件(.mobile/.tablet/.tv.tsx 三变体,当前为空占位)
│   └── config/      # design tokens + 共享配置
└── docker/          # Dockerfile + compose
```

**关键原则**:
- `packages/core` 必须保持**平台中立**(不依赖 `next/*`、`react-native/*`、`fs`、`node:*`),以便 Web / Desktop / Mobile / TV 四端复用
- `packages/config/tokens.ts` 是设计 token 的**唯一事实源**,Web(Tailwind theme extend)和 RN(StyleSheet)都从这里读
- 绝大多数包 `"type": "module"`,ESM only(`packages/config` 当前例外)

## 技术栈

- **Web**:**Next.js 16** + React 19 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui + ArtPlayer + HLS.js
- **桌面**:Tauri 2(Rust 壳)
- **移动/TV**:Expo 52 + React Native 0.76,TV 端用 `react-native-tvos` + EAS `production_tv` profile
- **包管理**:pnpm 10,Node ≥20.11
- **代码质量**:Biome 1.9(替代 ESLint+Prettier,速度快)
- **存储**:`IStorage` 抽象。Web 侧 `apps/web/src/lib/storage.ts` 做 client/server 自动分发 —— 客户端走 `client-storage.ts`(localStorage),服务端走 `remote-storage.ts`(Upstash REST 或本地 Redis,由 env 决定)

> ⚠️ **Next.js 16 注意**:
> - `apps/web/AGENTS.md` 明确警告 Next 16 相对训练数据有破坏性变更。写任何 Next 相关代码前,**先查 `apps/web/node_modules/next/dist/docs/`** 的实际文档,不要凭记忆
> - Next 16 用 **Proxy(不是 Middleware)**:`apps/web/src/proxy.ts` 导出 `export function proxy()` + `export const config = { matcher }`,别写成老的 `middleware.ts`

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
pnpm test                 # 递归 vitest
pnpm clean                # 清理 node_modules / .next / dist
```

单独跑某个包:`pnpm --filter @marstv/core typecheck`。

**Windows + NAS 约束**:仓库根的 `.npmrc` 强制 `node-linker=hoisted` + `strict-peer-dependencies=false`。原因是 NTFS junction 在 NAS 挂载盘(本机 F:)上不可靠。**不要删掉 `.npmrc`** —— 会导致 Windows/NAS 环境下 `pnpm install` 失败。

**Playwright E2E gotchas**:
- dev server 跑在 **3100 端口**(不是 3000)避免与常驻 dev 冲突
- baseURL 必须用 `localhost`,**不能用 `127.0.0.1`** —— Next 16 的 `allowedDevOrigins` 会静默阻断 hydration
- E2E 用 `CMS_SOURCES_JSON='[]'` 保证空态确定性

## 苹果 CMS V10 协议要点

协议类型定义见 `@packages/core/src/types/index.ts`(`PlayLine` / `Episode`),解析实现见 `packages/core/src/downstream/apple-cms.ts`。

关键分隔符(`vod_play_url`):`$$$` 分线路 → `#` 分集 → `$` 分"集名$URL"。

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
- `packages/core`:CMS V10 解析(`apple-cms` / `aggregate` / `fetch-helper`)、豆瓣(`douban`)、测速(`speedtest`)、源健康评分(`source-health`)、`IStorage` + localStorage 实现(history / favorites / subscriptions)
- `apps/web` API:
  - `/api/{search,detail,availability,douban,speedtest,proxy/m3u8,subscriptions/check,health/cms}`
  - `/api/storage/{favorites,history,subscriptions}` —— Redis/localStorage 服务端分发
  - `/api/image/{cms,douban}` —— 图片代理
  - `/api/login` —— 站点密码验证
- 代理安全:HMAC 签名(5 分钟 bucket,URL 边缘可缓存) + SSRF 黑名单 + 分层 `CDN-Cache-Control`
- 播放器:ArtPlayer + HLS.js,致命错误回退到"换线路"覆盖层,进度持久化 / 下一集预取 / N·P·? 键盘快捷键
- 页面:首页(豆瓣 + 继续观看 + 追剧行) / 搜索 / 播放 / 收藏 / 历史 / 追剧 / 豆瓣 / 首访免责声明;收藏/历史/追剧共用 `<PosterGridSkeleton>` + `<CollectionEmptyState>` + `<CollectionErrorState>` 三态
- shadcn/ui 已初始化(button / card / input + components.json,new-york 风格)
- 测试:vitest(`packages/core` + `apps/web`)+ Playwright E2E 覆盖 CMS 解析、SSRF、HMAC、API 路由、免责声明、导航、集合页三态

**M2 进度**:
- ✅ Upstash 存储后端:`packages/core` 提供 `createRedisSourceHealthStore(client)` + `IRedisLike` 接口;`apps/web` 实现 REST 客户端,通过 env 调度。`/api/health/cms` GET 响应里 `backend` 字段回显 `'redis' | 'memory'`
- ✅ SITE_PASSWORD 站点密码门:Next 16 Proxy(`apps/web/src/proxy.ts`)+ `/login` 页 + `/api/login` 路由。未设置 `SITE_PASSWORD` 时 proxy 短路放行;设置后未登录页面重定向到 `/login`,未登录 API 返回 401 JSON。Cookie 值 = `HMAC(SITE_PASSWORD, v1-context)`,无服务端状态,改密码立即失效所有 session。白名单:`/login`、`/api/login`、`/api/health/*`
- ✅ 多平台部署脚手架:`apps/web/Dockerfile` / `apps/web/open-next.config.ts` / `apps/web/wrangler.jsonc` / `docker/docker-compose.yml` 已就绪。四个部署目标(Vercel / CF Pages / Docker / 本地 dev)共享同一份 `next build` pipeline。详见根目录 `DEPLOY.md`
- Web Push(依赖 Upstash 做订阅存储;`VAPID_*` env 已声明,逻辑未实现)
- Cloudflare Pages Functions 边缘部署脚本

## next.config.ts 关键配置

- `output: 'standalone'`(Docker 所需)
- `transpilePackages: ['@marstv/core', '@marstv/ui-web', '@marstv/config']`(workspace 包需要 transpile)
- `initOpenNextCloudflareForDev()` 由 `OPEN_NEXT_DEV` env 门控,仅在 CF Pages 本地预览时启用

## 环境变量

**必填**:
- `PROXY_SECRET` —— `/api/proxy/*` HMAC 签名密钥。未设置则拒绝启动
- `CMS_SOURCES_JSON` —— 苹果 CMS 源列表 JSON 数组

**站点配置**:
- `NEXT_PUBLIC_SITE_NAME` / `NEXT_PUBLIC_SITE_URL` —— 站点品牌(客户端可见,注意 `NEXT_PUBLIC_` 前缀会被打进 bundle)

**可选安全 / 访问控制**:
- `ALLOWED_PROXY_HOSTS` —— 代理下游域名白名单,逗号分隔
- `SITE_PASSWORD` —— 启用站点密码门。未设置时 `proxy.ts` 短路放行;设置后 Cookie = `HMAC(SITE_PASSWORD, v1-context)`,**改值立即失效所有 session**
- `HEALTH_PROBE_TOKEN` —— 启用 `POST /api/health/cms` 主动探测所需的 token

**存储后端**(至多选一组,都未设置则回退到进程内 Map,重启丢失):
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`(成对出现)—— Upstash REST
- `REDIS_URL` —— 自托管 Redis

**豆瓣代理**:
- `DOUBAN_PROXY_MODE` —— `direct` | `tencent` | `aliyun` | `custom`
- `DOUBAN_CUSTOM_PROXY` —— 自定义反代 URL(`DOUBAN_PROXY_MODE=custom` 时必填)

**Web Push(待实现)**:
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`

**部署**:
- `OPEN_NEXT_DEV` —— `next.config.ts` 据此启用 Cloudflare dev proxy

**新增功能前先检查 `packages/core` 是否已有可复用实现**,避免重复。

## 文件命名与代码风格

- TypeScript 文件用 **kebab-case**(`apple-cms.ts`、`speed-test.ts`)
- React 组件文件用 **PascalCase**(`VideoCard.tsx`、`PlayerOverlay.tsx`)
- RN 三端变体后缀:`Component.mobile.tsx` / `.tablet.tsx` / `.tv.tsx`
- 导入别名:
  - Web:`@/*` 指 `apps/web/src/*`
  - 跨包:`@marstv/core`、`@marstv/ui-web`、`@marstv/config`
- Biome 已配置:单引号、分号、末尾逗号、2 空格、line width 100、`organizeImports` 开启、未使用导入 error
- 默认**不写注释**;只在 WHY 不明显时写一行(比如绕过某个特定 CMS 的解析 bug)

## 参考项目

Prior art(仅作思路参考,不直接 fork):LibreTV、LunaTV、OrionTV。详细研究笔记见 `.claude/plans/1-https-github-com-librespark-libretv-2-generic-pond.md`。
