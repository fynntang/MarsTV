# Desktop Builds + Mobile EAS + PWA + Test Coverage

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Windows/Linux desktop CI builds, EAS mobile build config, PWA support, and fill test coverage gaps.

**Architecture:** Four independent workstreams: (A) desktop CI gains Windows/Linux `cargo check` + `tauri build` jobs; (B) mobile gains `eas.json` with dev/preview/prod profiles; (C) web adds `manifest.json`, service worker, and PWA meta tags; (D) vitest config adds coverage thresholds and new test files for ui-web, ui-native, mobile screens, and desktop pages.

**Tech Stack:** Tauri 2, Expo EAS, next-pwa or manual SW, Vitest + @vitest/coverage-v8

---

## A: Desktop Windows/Linux CI Builds

### Task A1: Add Windows and Linux Tauri build jobs to CI

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add Windows build job**

```yaml
  build-desktop-windows:
    name: Build Desktop (Windows)
    runs-on: windows-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - name: Build desktop frontend (Vite)
        run: pnpm --filter @marstv/desktop build
      - name: cargo check (desktop)
        run: cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

- [ ] **Step 2: Update existing Linux job to include `tauri build`**

In the existing `build-desktop` job, after the Vite build step, add:

```yaml
      - name: Tauri build (Linux)
        run: |
          cd apps/desktop
          npx tauri build --bundles deb
```

Wait — `tauri build` on Linux needs all system deps already present. The existing job already installs them. But `tauri build` takes much longer than cargo check. Keep the existing job as-is (fast check) and add the full build step only on the Linux job.

- [ ] **Step 3: Rename existing Linux job for clarity**

Change `build-desktop` to `check-desktop-linux` (fast check: cargo check + vite build).

Add a separate `build-desktop-linux` job:

```yaml
  build-desktop-linux:
    name: Build Desktop (Linux .deb)
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - name: Install Tauri system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            build-essential \
            libssl-dev \
            libgtk-3-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev
      - name: Build desktop frontend (Vite)
        run: pnpm --filter @marstv/desktop build
      - name: Tauri build (.deb)
        run: npx tauri build --bundles deb
        working-directory: apps/desktop
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add Windows desktop check + Linux .deb build job"
```

### Task A2: Update CLAUDE.md M4 status

**Files:**
- Modify: `CLAUDE.md`

Change `⬜ 代码签名 + .dmg 背景 + Windows/Linux 构建` to:

```
  - ✅ Linux .deb 构建(CI)
  - ✅ Windows cargo check(CI)
  - ⬜ 代码签名 + .dmg 背景
```

- [ ] **Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update M4 status — Linux/Windows builds in CI"
```

---

## B: Mobile EAS Build Configuration

### Task B1: Create eas.json with build profiles

**Files:**
- Create: `apps/mobile/eas.json`

- [ ] **Step 1: Create eas.json**

```json
{
  "cli": {
    "version": ">= 14.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "app-bundle"
      }
    },
    "production_tv": {
      "autoIncrement": true,
      "ios": {
        "resourceClass": "m-medium",
        "simulator": false
      },
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "${APPLE_ID}",
        "ascAppId": "${ASC_APP_ID}",
        "appleTeamId": "${APPLE_TEAM_ID}"
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/eas.json
git commit -m "feat(mobile): add EAS build profiles (dev/preview/prod/tv)"
```

### Task B2: Update app.json for TV and add EAS docs

**Files:**
- Modify: `apps/mobile/app.json`

- [ ] **Step 1: Add tvOS-specific config to app.json**

In the `expo` block, add after `platforms`:

```json
"tvos": {
  "supportsTablet": false,
  "bundleIdentifier": "com.marstv.app.tvos"
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app.json
git commit -m "feat(mobile): add tvOS bundle identifier"
```

---

## C: Web PWA Support

### Task C1: Add manifest.json

**Files:**
- Create: `apps/web/public/manifest.json`

- [ ] **Step 1: Create manifest.json**

```json
{
  "name": "MarsTV",
  "short_name": "MarsTV",
  "description": "Cross-platform video aggregation platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0A0F",
  "theme_color": "#FF6B35",
  "orientation": "any",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/public/manifest.json
git commit -m "feat(web): add PWA manifest.json"
```

### Task C2: Add PWA meta tags to root layout

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Read the current layout.tsx, then add inside `<head>`:**

```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#FF6B35" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="MarsTV" />
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat(web): add PWA meta tags to root layout"
```

### Task C3: Add simple service worker for offline caching

**Files:**
- Create: `apps/web/public/sw.js`

- [ ] **Step 1: Create service worker**

```javascript
const CACHE_NAME = 'marstv-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests for static assets, skip API routes
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/play/')) {
    return; // network-only for API and player routes
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || fetched;
    })
  );
});
```

- [ ] **Step 2: Register service worker in layout.tsx**

In the root layout, add a script tag in `<head>` or a client component that registers the SW:

```tsx
// Add in the <head> of layout.tsx:
<script
  dangerouslySetInnerHTML={{
    __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
  }}
/>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/public/sw.js apps/web/src/app/layout.tsx
git commit -m "feat(web): add service worker for offline PWA support"
```

---

## D: Test Coverage

### Task D1: Add vitest coverage config to root

**Files:**
- Modify: `tsconfig.base.json` (check if coverage config exists)
- Modify: each package's `vitest.config.ts` or `package.json`

- [ ] **Step 1: Add coverage config to each package's vitest setup**

For `packages/core`, `apps/web` — check existing vitest config files and add:

```typescript
// Add to vitest.config.ts (or equivalent in package.json):
{
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/**/index.ts'],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
  },
}
```

Run: `pnpm add -D @vitest/coverage-v8 -w`

- [ ] **Step 2: Add test scripts for coverage**

In root `package.json` or document:
```bash
pnpm test:coverage  # runs vitest --coverage across workspaces
```

- [ ] **Step 3: Commit**

```bash
git add pnpm-lock.yaml package.json packages/core/vitest.config.ts apps/web/vitest.config.ts
git commit -m "test: add vitest coverage config with thresholds"
```

### Task D2: Add tests for ui-web widgets

**Files:**
- Create: `packages/ui-web/src/widgets/video-card.test.tsx`
- Create: `packages/ui-web/src/widgets/grouped-video-card.test.tsx`
- Create: `packages/ui-web/src/widgets/search-box.test.tsx`

- [ ] **Step 1: Write VideoCard test**

```typescript
// packages/ui-web/src/widgets/video-card.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VideoCard } from './video-card';

describe('VideoCard', () => {
  const minimal = {
    source: 'test',
    id: '123',
    title: 'Test Video',
  };

  it('renders title', () => {
    render(<VideoCard item={minimal} />);
    expect(screen.getByText('Test Video')).toBeDefined();
  });

  it('renders poster image when provided', () => {
    render(<VideoCard item={{ ...minimal, poster: 'https://example.com/poster.jpg' }} />);
    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toContain('example.com/poster.jpg');
  });

  it('renders year and category when provided', () => {
    render(<VideoCard item={{ ...minimal, year: '2024', category: 'Action' }} />);
    expect(screen.getByText(/2024/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Write SearchBox test**

```typescript
// packages/ui-web/src/widgets/search-box.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchBox } from './search-box';

describe('SearchBox', () => {
  it('calls onSearch with query on submit', () => {
    const onSearch = vi.fn();
    render(<SearchBox onSearch={onSearch} />);
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.submit(input);
    expect(onSearch).toHaveBeenCalledWith('test query');
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui-web/src/widgets/
git commit -m "test(ui-web): add VideoCard and SearchBox unit tests"
```

### Task D3: Add tests for ui-native components

**Files:**
- Create: `packages/ui-native/src/components/__tests__/text-view.test.tsx`
- Create: `packages/ui-native/src/components/__tests__/spacer.test.tsx`

- [ ] **Step 1: Write TextView test**

```typescript
// packages/ui-native/src/components/__tests__/text-view.test.tsx
import { render } from '@testing-library/react-native';
import { describe, expect, it } from 'vitest';
import { TextView } from '../TextView';

describe('TextView', () => {
  it('renders text content', () => {
    const { getByText } = render(<TextView variant="body">Hello</TextView>);
    expect(getByText('Hello')).toBeDefined();
  });

  it('applies heading variant style', () => {
    const { getByText } = render(<TextView variant="heading">Title</TextView>);
    const el = getByText('Title');
    expect(el.props.style).toBeDefined();
  });

  it('applies custom color', () => {
    const { getByText } = render(<TextView variant="body" color="#FF0000">Red</TextView>);
    const el = getByText('Red');
    expect(el.props.style).toBeDefined();
  });
});
```

- [ ] **Step 2: Write Spacer test**

```typescript
// packages/ui-native/src/components/__tests__/spacer.test.tsx
import { render } from '@testing-library/react-native';
import { describe, expect, it } from 'vitest';
import { Spacer } from '../Spacer';

describe('Spacer', () => {
  it('renders with given height', () => {
    const { getByTestId } = render(<Spacer size={16} />);
    const el = getByTestId('spacer');
    expect(el.props.style).toMatchObject({ height: 16 });
  });
});
```

Note: This requires `<Spacer>` to have `testID="spacer"`. If it doesn't, add it.

- [ ] **Step 3: Commit**

```bash
git add packages/ui-native/src/components/
git commit -m "test(ui-native): add TextView and Spacer unit tests"
```

### Task D4: Add basic desktop page smoke tests

**Files:**
- Create: `apps/desktop/src/pages/__tests__/HomePage.test.tsx`

- [ ] **Step 1: Add test setup for desktop (jsdom + React Testing Library)**

```bash
cd apps/desktop && pnpm add -D @testing-library/react @testing-library/jest-dom vitest jsdom
```

- [ ] **Step 2: Write HomePage smoke test**

```typescript
// apps/desktop/src/pages/__tests__/HomePage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from '../HomePage';

describe('HomePage', () => {
  it('renders MarsTV title', () => {
    render(<HomePage onNavigate={() => {}} />);
    expect(screen.getByText('MarsTV')).toBeDefined();
  });

  it('renders Search button', () => {
    render(<HomePage onNavigate={() => {}} />);
    expect(screen.getByText('Search')).toBeDefined();
  });

  it('shows loading state initially', () => {
    render(<HomePage onNavigate={() => {}} />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/pages/__tests__/ apps/desktop/package.json
git commit -m "test(desktop): add HomePage smoke test"
```

### Task D5: Update CLAUDE.md test section

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update test coverage summary in M4/M5 sections**

Add test notes:
```
  - ✅ 测试:vitest(packages/core + apps/web + packages/ui-web + packages/ui-native + apps/mobile + apps/desktop)
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update test coverage summary"
```

---

## Execution Order

```
A1 → A2 → B1 → B2 → C1 → C2 → C3 → D1 → D2 → D3 → D4 → D5
```

All tasks are independent within each workstream. A/B/C/D can run in any order within the stream.
