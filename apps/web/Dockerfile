# ============================================================================
# MarsTV Web — multi-stage Docker build
# Target: standalone Node.js output, ~200 MB final image
# ============================================================================

# ---- Build stage -----------------------------------------------------------
FROM node:20-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /build

# Root workspace files (pnpm needs these for install)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# All workspace packages — only apps/web + its deps end up in standalone
COPY apps/web/package.json           apps/web/
COPY packages/core/package.json      packages/core/
COPY packages/ui-web/package.json    packages/ui-web/
COPY packages/config/package.json    packages/config/

# Install workspace deps (omit optional sharp binary to keep image slim)
RUN pnpm install --frozen-lockfile --filter @marstv/web

# Copy full source (including cross-package .ts files that Next transpiles)
COPY apps/web/           apps/web/
COPY packages/core/      packages/core/
COPY packages/ui-web/    packages/ui-web/
COPY packages/config/    packages/config/

# Build Next.js standalone output
RUN pnpm --filter @marstv/web build

# ---- Runtime stage ---------------------------------------------------------
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy standalone output (includes all necessary node_modules)
COPY --from=builder /build/apps/web/.next/standalone ./

# Copy static assets (served by Next.js at /_next/static)
COPY --from=builder /build/apps/web/.next/static ./apps/web/.next/static

# Copy public directory (favicon, robots.txt, etc.)
COPY --from=builder /build/apps/web/public ./apps/web/public

# Run as non‑root
USER node
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "apps/web/server.js"]
