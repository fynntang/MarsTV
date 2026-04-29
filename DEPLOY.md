# MarsTV 部署指南

四个目标平台共用同一份 `next build` pipeline，核心差异仅在部署命令和环境变量注入方式。

## 前置条件

- **Node.js** >= 20.11
- **pnpm** >= 10（推荐通过 `corepack enable` 启用）
- 所有环境变量已准备（见下文各平台说明）

**必需环境变量：**

| 变量 | 说明 |
|---|---|
| `PROXY_SECRET` | `/api/proxy/*` HMAC 签名密钥，未设置拒绝启动 |
| `CMS_SOURCES_JSON` | 苹果 CMS V10 源列表，JSON 数组字符串 |

**可选环境变量：**

| 变量 | 说明 |
|---|---|
| `ALLOWED_PROXY_HOSTS` | 代理下游域名白名单，逗号分隔 |
| `SITE_PASSWORD` | 站点访问密码（不设置则无密码门） |
| `HEALTH_PROBE_TOKEN` | 主动健康探测 Bearer token |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL（需与 token 成对） |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token（需与 URL 成对） |

---

## 本地开发

```bash
pnpm install
pnpm dev
```

环境变量通过项目根目录 `.env` 文件注入。开发服务器默认运行在 `http://localhost:3000`。

验证：

```bash
curl http://localhost:3000/api/health/cms
```

---

## Vercel

**零配置部署。**Vercel 自动识别 Next.js 项目并使用 `next build`。

```bash
# 方式一：Vercel CLI
pnpm i -g vercel
vercel --prod

# 方式二：连接 GitHub 仓库后在 Vercel Dashboard 自动部署
```

**环境变量**在 [Vercel Dashboard](https://vercel.com/dashboard) > Settings > Environment Variables 中配置。将上表所有变量填入即可。

**注意：**
- 项目框架会自动识别为 Next.js
- Build Command 默认 `next build`，无需修改
- 如需自定义 Node.js 版本，在 Settings > General > Node.js Version 中选择 `20.x`

验证：

```bash
curl https://<your-project>.vercel.app/api/health/cms
```

---

## Cloudflare Pages / Workers

> **警告：**CF Free plan CPU 限制为 10ms，`/api/proxy/m3u8` 代理请求几乎必然超时。需要至少 Paid Workers plan 才能稳定运行。

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量（Secrets）

非敏感变量写死在 `apps/web/wrangler.jsonc` 的 `vars` 块中，敏感变量使用 `wrangler secret`：

```bash
cd apps/web

# 必填 secrets
npx wrangler secret put PROXY_SECRET

# 可选 secrets
npx wrangler secret put SITE_PASSWORD
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
npx wrangler secret put HEALTH_PROBE_TOKEN
```

非 secret 变量（`CMS_SOURCES_JSON`、`ALLOWED_PROXY_HOSTS` 等）直接在 `wrangler.jsonc` 的 `vars` 中改为真实值，或同样用 `wrangler secret put` 覆盖。

### 3. 构建与部署

```bash
cd apps/web

# 构建 + 部署
pnpm run build:cf
npx wrangler deploy
```

### 4. 本地预览（可选）

```bash
# 复制 .dev.vars.example 并填入真实值
cp apps/web/.dev.vars.example apps/web/.dev.vars

# 本地模拟 CF Workers 环境
pnpm --filter @marstv/web preview:cf
```

### 5. 环境变量对照（CF Secrets）

| 变量 | 注入方式 | 说明 |
|---|---|---|
| `CMS_SOURCES_JSON` | `wrangler.jsonc` vars 或 `wrangler secret` | JSON 数组字符串，可放 vars（非敏感） |
| `PROXY_SECRET` | `wrangler secret put` | 必填，HMAC 密钥 |
| `ALLOWED_PROXY_HOSTS` | `wrangler.jsonc` vars | 非敏感 |
| `SITE_PASSWORD` | `wrangler secret put` | 可选 |
| `HEALTH_PROBE_TOKEN` | `wrangler secret put` | 可选 |
| `UPSTASH_REDIS_REST_URL` | `wrangler.jsonc` vars | 非敏感 URL |
| `UPSTASH_REDIS_REST_TOKEN` | `wrangler secret put` | 敏感 token |

验证：

```bash
curl https://marstv-web.<your-subdomain>.workers.dev/api/health/cms
```

---

## Docker 自托管

### 1. 准备环境变量

在项目根目录创建 `.env` 文件：

```bash
cp .env.example .env
# 编辑 .env，填入所有必填变量
```

### 2. 构建并启动

```bash
# 方式一：docker compose（推荐）
cd docker
docker compose up -d

# 方式二：单独 docker build
pnpm --filter @marstv/web build:docker
docker run -d --env-file .env -p 3000:3000 marstv/web:local
```

### 3. 查看日志

```bash
docker compose logs -f
```

验证：

```bash
curl http://localhost:3000/api/health/cms
```
