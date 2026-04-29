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

仓库处于 **M1 接近完成** 状态 —— Web 端功能闭环已打通(搜索→详情→播放→订阅/收藏/历史),工程质量待打磨。

**已就绪**:
- `packages/core`:CMS V10 解析(`apple-cms` / `aggregate` / `fetch-helper`)、豆瓣(`douban`)、测速(`speedtest`)、`IStorage` + localStorage 实现(history / favorites / subscriptions)
- `apps/web` API:`/api/{search,detail,availability,douban,speedtest,proxy/m3u8,image/*,subscriptions/check}`
- 代理安全:HMAC 签名(5 分钟 bucket,URL 边缘可缓存) + SSRF 黑名单 + 分层 `CDN-Cache-Control`
- 播放器:ArtPlayer + HLS.js,致命错误回退到"换线路"覆盖层,进度持久化 / 下一集预取 / N·P·? 键盘快捷键
- 页面:首页(豆瓣 + 继续观看 + 追剧行) / 搜索 / 播放 / 收藏 / 历史 / 追剧 / 豆瓣 / 首访免责声明
- shadcn/ui 已初始化(button / card / input + components.json,new-york 风格)

**M1 剩余**:
1. 页面 / 组件 E2E 验证(Playwright 脚本 + 覆盖关键路径)
2. 统一 loading / error skeleton(目前 search / play 有,其他页缺)
3. 苹果 CMS 源健康监控(每日探测 + 失败源降权)

**M2 预备**:
- Web Push(需要先接服务端订阅存储 → Upstash 适配器)
- Cloudflare Pages Functions 边缘部署脚本
- SITE_PASSWORD 前端访问密码中间件

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
