---
name: verify
description: Run the full verification pipeline (typecheck → lint → test) to validate changes before committing or after completing a feature. Use when wrapping up work or before creating a PR.
---

# verify

Run the project's quality pipeline in sequence, stopping at the first failure:

1. **Type check** — `pnpm typecheck` (recursive tsc --noEmit)
2. **Lint** — `pnpm lint` (biome check .)
3. **Unit tests** — `pnpm test` (recursive vitest run)

If all three pass, run **E2E tests** as the final gate:
4. **E2E** — `pnpm test:e2e` (Playwright, requires dev server on port 3100)

## Usage

Run each step via Bash, in order. If a step fails, stop and report the failure — do not proceed to subsequent steps.

### Step 1: Type check

```bash
pnpm typecheck
```

### Step 2: Lint

```bash
pnpm lint
```

### Step 3: Unit tests

```bash
pnpm test
```

### Step 4: E2E (if all above pass)

First ensure the dev server is running on port 3100:

```bash
pnpm --filter @marstv/web dev --port 3100 &
```

Then run Playwright:

```bash
pnpm --filter @marstv/web test:e2e
```

Report a summary of each step's outcome. If E2E was skipped because earlier steps failed, note what needs fixing first.
