# Repository Guidelines

## Project Structure & Module Organization

MarsTV is a pnpm workspace monorepo. `apps/web` contains the Next.js 16 + React 19 web app, App Router pages, API routes, public assets, Vitest tests, and Playwright E2E tests. `apps/desktop` is a Tauri 2 + Vite SPA with Rust native commands. `apps/mobile` is an Expo 52 + React Native 0.76 app with tvOS support. Shared code lives in `packages/core` for platform-neutral types, downstream adapters, speed tests, storage, and source health logic; `packages/ui-shared` for cross-framework hooks, API client, source storage, and router adapters; `packages/config` owns design tokens; `packages/ui-web` and `packages/ui-native` are component packages. Deployment files live in `docker/`, with platform notes in `DEPLOY.md`.

## Build, Test, and Development Commands

Use pnpm 10 and Node >= 20.11.

- `pnpm install`: install all workspace dependencies.
- `pnpm dev`: run the web app via `@marstv/web`.
- `pnpm build`: recursively build all packages/apps.
- `pnpm typecheck`: run `tsc --noEmit` across workspaces.
- `pnpm test`: run Vitest suites across workspaces.
- `pnpm lint`: run Biome checks.
- `pnpm --filter @marstv/web test:e2e`: run Playwright E2E tests.

## Coding Style & Naming Conventions

TypeScript is ESM-first. Keep `packages/core` platform-neutral: no `next/*`, `react-native/*`, `fs`, or `node:*` imports. Biome enforces 2-space indentation, single quotes, semicolons, trailing commas, 100-column width, and organized imports. Use kebab-case for TypeScript modules such as `apple-cms.ts`, PascalCase for React component files, and RN suffixes like `.mobile.tsx`, `.tablet.tsx`, and `.tv.tsx`.

## Testing Guidelines

Vitest covers `packages/core` and `apps/web` unit/API behavior. Place tests beside source as `*.test.ts`. Playwright specs live in `apps/web/e2e/*.spec.ts`; keep E2E fixtures deterministic, especially `CMS_SOURCES_JSON='[]'`. Before pushing, run `pnpm typecheck`, `pnpm test`, and targeted E2E tests for touched web flows.

## Commit & Pull Request Guidelines

History uses Conventional Commit style with scopes, for example `feat(web): ...`, `test(core): ...`, and `docs: ...`. Keep commits focused. PRs should include a concise summary, verification commands, linked issue or plan when applicable, screenshots for UI changes, and notes for deployment/config changes.

## Security & Configuration Tips

Do not commit secrets. Required runtime env includes `PROXY_SECRET` and `CMS_SOURCES_JSON`; optional controls include `SITE_PASSWORD`, `ALLOWED_PROXY_HOSTS`, and Redis/Upstash variables. Preserve proxy safety: HMAC auth, SSRF blocking, and host allowlists must remain intact. For Next.js work, read `apps/web/AGENTS.md` and local Next 16 docs before relying on older conventions.
