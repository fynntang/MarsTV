# MarsTV

> 更快、更好看、全端可用的开源影视聚合平台。

MarsTV 是一个跨平台影视聚合方案，覆盖 **Web / Desktop / Mobile / TV** 四个终端。参考 [LibreTV](https://github.com/LibreSpark/LibreTV)、[LunaTV](https://github.com/MoonTechLab/LunaTV)、[OrionTV](https://github.com/orion-lib/OrionTV) 的优秀设计重新构建。

## ✨ 特性

- 🚀 **源测速择优** —— 并发探测播放线路，按首片耗时 + 码率评分自动选最优，失败自动回退
- ⚡ **边缘缓存代理** —— m3u8 短缓存、segment 长缓存，部署到 Cloudflare Pages / Vercel Edge 全球加速
- 🔔 **追剧订阅** —— 收藏剧集有新集自动提醒，本地 / Redis 持久化
- 🔐 **站点密码门** —— 可选的整站访问密码，无状态 HMAC Cookie，改密码即失效所有 session
- 🎨 **玻璃态深空主题** —— 毛玻璃面板 + 动态星云背景 + 火星橙强调色，四端共享 design tokens
- 📱 **全端响应式** —— 桌面大屏、平板、手机三档自适应，每行独立横向滚动

## 📦 终端

| 终端 | 技术栈 | 状态 |
|---|---|---|
| Web + PWA | Next.js 16 + React 19 + Tailwind CSS 4 | ✅ |
| Desktop | Tauri 2 + Vite SPA | ✅ |
| Mobile | Expo 52 + React Native 0.85 | ✅ |
| TV | React Native tvOS + Expo | ✅ |

## 🗺️ 路线图

- **M1** ✅ Web 生产版：聚合搜索 + 详情 + 代理播放 + 收藏/历史/追剧
- **M2** ✅ 差异化能力：源测速 + 边缘缓存 + 站点密码门 + 多平台部署
- **M4** ✅ 桌面端：Tauri 2 壳 + 原生特性 + 源配置持久化
- **M5** ✅ 移动/TV 端：Expo + RN，10 屏 + tvOS 适配
- **M6** 直播 + 订阅式配置分发

## 🚀 快速开始

```bash
# 前置：Node ≥ 20.11，pnpm ≥ 10
pnpm install
cp .env.example apps/web/.env.local
pnpm dev          # → http://localhost:3000
pnpm test         # 单元测试
pnpm test:e2e     # E2E 测试（需 dev server 在 3100 端口）
```

必填环境变量：
- `PROXY_SECRET` —— 代理 HMAC 签名密钥
- `CMS_SOURCES_JSON` —— 苹果 CMS 源列表 JSON 数组

> ⚠️ 仓库**不内置任何视频源**，需自行配置符合[苹果 CMS V10 协议](https://github.com/magicblack/maccms10)的接口。

## 🧱 项目结构

```
marstv/
├── apps/{web,desktop,mobile}                      # 终端应用
├── packages/{core,ui-web,ui-native,ui-shared,config}  # 共享包
└── docker/                                        # Docker 部署
```

AI 助手指南 → [`CLAUDE.md`](./CLAUDE.md) · 部署指南 → [`DEPLOY.md`](./DEPLOY.md)

## 🚢 部署

支持四种部署方式：

| 平台 | 命令 |
|---|---|
| Vercel | 导入 Git 仓库，自动检测 Next.js |
| Cloudflare Pages | `pnpm run build:cf` + `npx wrangler deploy` |
| Docker | `docker compose -f docker/docker-compose.yml up` |
| 本地 | `pnpm build && pnpm start` |

详见 [`DEPLOY.md`](./DEPLOY.md)。

## 📜 许可证

[MIT](./LICENSE.md)。本项目仅提供聚合搜索和代理播放能力，**不存储、不分发任何视频内容**。所有资源来自部署者配置的第三方 API。请在法律允许范围内使用，**不得用于商业用途**。

## 🙏 致谢

- **[LibreTV](https://github.com/LibreSpark/LibreTV)** —— 零构建 + 跨平台 Serverless 代理
- **[LunaTV](https://github.com/MoonTechLab/LunaTV)** —— Next.js 自部署与 Kvrocks 存储抽象
- **[OrionTV](https://github.com/orion-lib/OrionTV)** —— TV 端遥控器 focus 与三端响应式架构
