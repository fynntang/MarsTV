---
name: deploy
description: Guide multi-platform deployment for MarsTV web app (Vercel / Cloudflare Pages / Docker). Use when the user asks to deploy, ship, or publish the app.
disable-model-invocation: true
---

# deploy

MarsTV supports four deployment targets. This skill guides the user through selecting one and running the correct build + deploy commands.

## Targets

### Vercel

Zero-config with Next.js. Connect the repo to Vercel and it auto-detects the Next.js app at `apps/web/`.

Manual deploy:

```bash
pnpm --filter @marstv/web build
npx vercel apps/web --prod
```

### Cloudflare Pages

Uses OpenNext for Cloudflare adaptation. Local preview:

```bash
OPEN_NEXT_DEV=1 pnpm --filter @marstv/web dev
```

Build and deploy:

```bash
pnpm --filter @marstv/web build:cf
pnpm --filter @marstv/web deploy:cf
```

### Docker

Single-container deploy:

```bash
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d
```

Or build directly:

```bash
docker build -t marstv -f apps/web/Dockerfile .
docker run -p 3000:3000 --env-file .env marstv
```

### Local dev

```bash
pnpm dev
```

## Pre-deploy checklist

Before deploying:
1. Ensure `PROXY_SECRET` and `CMS_SOURCES_JSON` are set in the target environment
2. If using storage persistence, configure `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` or `REDIS_URL`
3. Run `pnpm verify` (or manually: `pnpm typecheck && pnpm lint && pnpm test`) to validate changes
4. For CF Pages: verify `wrangler.jsonc` has correct env vars
5. For Docker: ensure `.env` file is present and not excluded from build context
