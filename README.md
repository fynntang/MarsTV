# MarsTV

> 一个更快、更好看、全端可用的开源影视聚合平台。

MarsTV 是一个参考 [LibreTV](https://github.com/LibreSpark/LibreTV) / [LunaTV](https://github.com/MoonTechLab/LunaTV) / [OrionTV](https://github.com/orion-lib/OrionTV) 重新设计的跨平台影视聚合方案,目标覆盖 **Web / Desktop / Mobile / TV** 四个终端。

## ✨ 核心差异化

- 🚀 **播放源自动测速择优** —— 并发测试可用线路,按首片耗时 + 码率评分,自动选最优,失败自动回退
- ⚡ **边缘缓存代理** —— m3u8 短缓存、segment 长缓存,部署到 Cloudflare Pages Functions / Vercel Edge 实现全球加速
- 🔔 **追剧订阅 + Web Push** —— 收藏的剧集有新集自动推送,无需 FCM/APNs
- 🎨 **火星主题 Design System** —— 深空背景 + 火星橙强调色,四端共享一份 design tokens

## 📦 支持的终端

| 终端 | 技术栈 | 状态 |
|---|---|---|
| Web + PWA | Next.js 16 + React 19 | ✅ M1/M2 已就绪 |
| Desktop (Win/Mac/Linux) | Tauri 2 + Vite SPA | ✅ M4 已就绪 |
| Mobile (iOS/Android) | Expo + React Native | ✅ M5 已就绪 |
| TV (Android TV / tvOS) | React Native tvOS + Expo | ✅ M5 已就绪 |

## 🗺️ 路线图

- **M1** ✅ · 基础 Web MVP:聚合搜索 + 详情 + 代理播放 + 本地收藏历史
- **M2** ✅ · 差异化能力:源测速 + 边缘缓存 + PWA + 火星主题 + 多平台部署
- **M4** ✅ · 桌面端:Tauri 2 壳 + 原生特性 + 源配置持久化(文件系统)
- **M5** ✅ · 移动 / TV 端:Expo + RN,10 屏 + 7 组件 + tvOS 适配 + 源配置持久化 + 本地存储
- **M3** · 用户系统:多用户 + 云同步 + Web Push 订阅
- **M6** · 直播 + 订阅式配置分发

## 🚀 快速开始

```bash
# 前置:Node ≥ 20.11,pnpm ≥ 10
pnpm install
cp .env.example apps/web/.env.local   # 并填入至少 PROXY_SECRET
pnpm dev
# → http://localhost:3000
```

> ⚠️ 仓库**不自带任何视频源**,需在管理后台自行添加符合 [苹果 CMS V10 协议](https://github.com/magicblack/maccms10) 的接口。

## 🧱 项目结构

```
marstv/
├── apps/{web,desktop,mobile}    # 终端应用
├── packages/{core,ui-web,ui-native,ui-shared,config}   # 共享包
└── docker/                       # 部署资源
```

给 AI 助手使用的详细架构、协议要点、开发规范见 [`CLAUDE.md`](./CLAUDE.md)。

## 📜 许可证

[MIT](./LICENSE.md)。本项目仅提供聚合搜索和代理播放能力,**不存储、不分发任何视频内容**,所有资源均来自部署者自行配置的第三方 API。请在所在法域的法律允许范围内使用,**不得用于商业用途**。

## 🙏 致谢

MarsTV 从以下优秀开源项目汲取了大量经验:

- **[LibreTV](https://github.com/LibreSpark/LibreTV)** —— 零构建 + 跨平台 Serverless 代理的极简哲学
- **[LunaTV / MoonTV](https://github.com/MoonTechLab/LunaTV)** —— Next.js 自部署平台与 Kvrocks 存储抽象
- **[OrionTV](https://github.com/orion-lib/OrionTV)** —— TV 端遥控器 focus 与三端响应式架构
