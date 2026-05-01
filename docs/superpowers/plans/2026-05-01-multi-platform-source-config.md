# Multi-Platform Source Configuration & Mobile Data Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable in-app CMS source configuration on desktop, mobile, and tvOS (persisted as `sources.json` in each platform's app data directory), while web keeps env-var config. Wire all mobile mock data screens to real API calls.

**Architecture:** `SourceStore` is an async interface (`load()` → `CmsSource[]`, `save(sources)` → `void`). Desktop implements it via Tauri Rust commands using `app.path().app_local_data_dir()/sources.json`. Mobile implements it via `expo-file-system` using `documentDirectory/sources.json`. Fallback: `localStorage`. `api-client.ts` auto-attaches locally-configured sources as `X-Cms-Sources` header; server merges them with env sources. `usePlayerData` calls real `getDetail()` API. Mobile screens fetch real data from server storage APIs.

**Tech Stack:** React, React Native (Expo), expo-file-system, Tauri (Rust commands), TypeScript

---

### Task 1: Add async `SourceStore` to `@marstv/ui-shared`

**Files:**
- Create: `packages/ui-shared/src/lib/source-storage.ts`
- Modify: `packages/ui-shared/src/lib/index.ts`

- [ ] **Step 1: Create source-storage.ts with async pluggable backend**

```typescript
// packages/ui-shared/src/lib/source-storage.ts
import type { CmsSource } from '@marstv/core';

export interface SourceStore {
  load(): Promise<CmsSource[]>;
  save(sources: CmsSource[]): Promise<void>;
}

let _sources: CmsSource[] = [];
let _initialized = false;
let _store: SourceStore | null = null;

function localStorageStore(): SourceStore {
  const key = 'marstv:cms-sources';
  return {
    async load() {
      if (typeof globalThis !== 'undefined') {
        const g = globalThis as { localStorage?: { getItem(k: string): string | null } };
        try {
          const raw = g.localStorage?.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
          }
        } catch { /* ignore */ }
      }
      return [];
    },
    async save(sources: CmsSource[]) {
      if (typeof globalThis !== 'undefined') {
        const g = globalThis as { localStorage?: { setItem(k: string, v: string): void } };
        try { g.localStorage?.setItem(key, JSON.stringify(sources)); } catch { /* quota */ }
      }
    },
  };
}

export function setSourceStore(store: SourceStore): void {
  _store = store;
  _initialized = false;
}

function getStore(): SourceStore {
  if (_store) return _store;
  _store = localStorageStore();
  return _store;
}

export async function getSources(): Promise<CmsSource[]> {
  if (!_initialized) {
    const store = getStore();
    try { _sources = await store.load(); } catch { _sources = []; }
    _initialized = true;
  }
  return [..._sources];
}

export async function setSources(sources: CmsSource[]): Promise<void> {
  _sources = [...sources];
  const store = getStore();
  try { await store.save(_sources); } catch { /* ignore */ }
}

export async function addSource(source: CmsSource): Promise<void> {
  const sources = await getSources();
  const idx = sources.findIndex((s) => s.key === source.key);
  if (idx >= 0) sources[idx] = source;
  else sources.push(source);
  await setSources(sources);
}

export async function removeSource(key: string): Promise<void> {
  await setSources((await getSources()).filter((s) => s.key !== key));
}
```

- [ ] **Step 2: Export from lib/index.ts**

```typescript
// Add to packages/ui-shared/src/lib/index.ts
export { getSources, setSources, addSource, removeSource, setSourceStore } from './source-storage';
export type { SourceStore } from './source-storage';
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui-shared/src/lib/source-storage.ts packages/ui-shared/src/lib/index.ts
git commit -m "feat(ui-shared): add async pluggable SourceStore for CMS sources"
```

---

### Task 2: Desktop — Rust commands for file-based source storage

**Files:**
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Create: `apps/desktop/src/lib/source-store.ts`

- [ ] **Step 1: Add Rust `save_sources` and `load_sources` commands**

In `apps/desktop/src-tauri/src/lib.rs`, add before `pub fn run()`:

```rust
use std::fs;

#[tauri::command]
fn save_sources(app: tauri::AppHandle, sources_json: String) -> Result<(), String> {
    let app_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let path = app_dir.join("sources.json");
    fs::write(&path, &sources_json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_sources(app: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let path = app_dir.join("sources.json");
    if !path.exists() {
        return Ok("[]".to_string());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}
```

Register them in the builder — update `invoke_handler`:

```rust
.invoke_handler(tauri::generate_handler![get_app_version, open_external, save_sources, load_sources])
```

- [ ] **Step 2: Create JS-side SourceStore wrapper for Tauri**

```typescript
// apps/desktop/src/lib/source-store.ts
import { invoke } from '@tauri-apps/api/core';
import type { CmsSource } from '@marstv/core';
import type { SourceStore } from '@marstv/ui-shared';

export const tauriSourceStore: SourceStore = {
  async load(): Promise<CmsSource[]> {
    try {
      const raw: string = await invoke('load_sources');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  async save(sources: CmsSource[]): Promise<void> {
    await invoke('save_sources', { sourcesJson: JSON.stringify(sources) });
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src-tauri/src/lib.rs apps/desktop/src/lib/source-store.ts
git commit -m "feat(desktop): add Rust commands for sources.json persistence in app_local_data_dir"
```

---

### Task 3: Mobile — expo-file-system source store wrapper

**Files:**
- Install: `expo-file-system`
- Create: `apps/mobile/src/lib/source-store.ts`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Install expo-file-system**

```bash
cd apps/mobile && pnpm add expo-file-system
```

- [ ] **Step 2: Create expo-file-system SourceStore wrapper**

```typescript
// apps/mobile/src/lib/source-store.ts
import * as FileSystem from 'expo-file-system';
import type { CmsSource } from '@marstv/core';
import type { SourceStore } from '@marstv/ui-shared';

const filePath = FileSystem.documentDirectory + 'sources.json';

export const expoSourceStore: SourceStore = {
  async load(): Promise<CmsSource[]> {
    try {
      const info = await FileSystem.getInfoAsync(filePath);
      if (!info.exists) return [];
      const raw = await FileSystem.readAsStringAsync(filePath);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  async save(sources: CmsSource[]): Promise<void> {
    try {
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(sources));
    } catch { /* ignore */ }
  },
};
```

- [ ] **Step 3: Wire expoSourceStore in _layout.tsx before first render**

In `apps/mobile/app/_layout.tsx`, import and call before the component:

```typescript
import { setSourceStore } from '@marstv/ui-shared';
import { expoSourceStore } from '../src/lib/source-store';

setSourceStore(expoSourceStore);
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/lib/source-store.ts apps/mobile/app/_layout.tsx apps/mobile/package.json
git commit -m "feat(mobile): add expo-file-system SourceStore for sources.json in documentDirectory"
```

---

### Task 4: Wire api-client to send local sources via `X-Cms-Sources` header

**Files:**
- Modify: `packages/ui-shared/src/lib/api-client.ts`

- [ ] **Step 1: Add async header builder and update all fetch calls**

```typescript
// Add to api-client.ts:
import { getSources } from './source-storage';

async function buildHeaders(): Promise<HeadersInit> {
  try {
    const sources = await getSources();
    if (sources.length === 0) return {};
    return { 'X-Cms-Sources': JSON.stringify(sources) };
  } catch {
    return {};
  }
}

// Update every fetch() in searchVideos, getDetail, fetchDoubanRankings,
// fetchFavorites, fetchHistory, fetchSubscriptions to await buildHeaders().
// Pattern (apply to all):
const res = await fetch(`${_apiBase}/api/search?q=${encodeURIComponent(query)}`, {
  headers: await buildHeaders(),
});
```

- [ ] **Step 2: Commit**

```bash
git add packages/ui-shared/src/lib/api-client.ts
git commit -m "feat(ui-shared): send local CMS sources via X-Cms-Sources header"
```

---

### Task 5: Server-side merge of client-provided sources

**Files:**
- Modify: `apps/web/src/lib/sources.ts`
- Modify: `apps/web/src/app/api/search/route.ts`
- Modify: `apps/web/src/app/api/detail/route.ts`
- Modify: `apps/web/src/app/api/douban/route.ts`
- Modify: `apps/web/src/app/api/availability/route.ts`
- Modify: `apps/web/src/app/api/speedtest/route.ts`

- [ ] **Step 1: Add `loadSourcesFromRequest()` to sources.ts**

```typescript
// Add to apps/web/src/lib/sources.ts:
export function loadSourcesFromRequest(request: Request): CmsSource[] {
  try {
    const header = request.headers.get('X-Cms-Sources');
    if (header) {
      const parsed = JSON.parse(header);
      if (Array.isArray(parsed)) {
        const clientSources = parsed.filter(isValidSource);
        if (clientSources.length > 0) return clientSources;
      }
    }
  } catch { /* fall through */ }
  return loadSources();
}
```

- [ ] **Step 2: In each of the 5 API routes, replace `loadSources()` with `loadSourcesFromRequest(request)`**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/sources.ts apps/web/src/app/api/search/route.ts apps/web/src/app/api/detail/route.ts apps/web/src/app/api/douban/route.ts apps/web/src/app/api/availability/route.ts apps/web/src/app/api/speedtest/route.ts
git commit -m "feat(web): accept client-provided CMS sources via X-Cms-Sources header"
```

---

### Task 6: Add `getDetail()` and storage API functions to api-client

**Files:**
- Modify: `packages/ui-shared/src/lib/api-client.ts`
- Modify: `packages/ui-shared/src/lib/index.ts`
- Modify: `packages/ui-shared/src/index.ts`

- [ ] **Step 1: Add functions**

```typescript
// In api-client.ts:
export async function getDetail(source: string, id: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${_apiBase}/api/detail?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}`,
      { headers: await buildHeaders() },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function fetchFavorites(): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(`${_apiBase}/api/storage/favorites`, { headers: await buildHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export async function fetchHistory(): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(`${_apiBase}/api/storage/history`, { headers: await buildHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export async function fetchSubscriptions(): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(`${_apiBase}/api/storage/subscriptions`, { headers: await buildHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}
```

- [ ] **Step 2: Export from index files**

```typescript
// In lib/index.ts add:
export { getDetail, fetchFavorites, fetchHistory, fetchSubscriptions } from './api-client';

// In src/index.ts add:
  getDetail,
  fetchFavorites,
  fetchHistory,
  fetchSubscriptions,
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui-shared/src/lib/api-client.ts packages/ui-shared/src/lib/index.ts packages/ui-shared/src/index.ts
git commit -m "feat(ui-shared): add getDetail + storage API fetch functions"
```

---

### Task 7: Fix `usePlayerData` to call real API

**Files:**
- Modify: `packages/ui-shared/src/hooks/usePlayerData.ts`

- [ ] **Step 1: Replace stub with real API call**

```typescript
import type { PlayLine, VideoDetail } from '@marstv/core';
import { useEffect, useState } from 'react';
import { getDetail } from '../lib/api-client';

export interface PlayerData {
  lines: PlayLine[];
  videoDetail: VideoDetail | null;
  loading: boolean;
  error: string | null;
}

export function usePlayerData(source: string, id: string): PlayerData {
  const [lines, setLines] = useState<PlayLine[]>([]);
  const [videoDetail, setVideoDetail] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDetail(source, id);
        if (cancelled) return;
        if (data) {
          const detail = data as unknown as VideoDetail;
          setVideoDetail(detail);
          setLines(detail.lines ?? []);
        } else {
          setLines([]);
          setError('Failed to load video detail');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (source && id) load();
    return () => { cancelled = true; };
  }, [source, id]);

  return { lines, videoDetail, loading, error };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ui-shared/src/hooks/usePlayerData.ts
git commit -m "fix(ui-shared): wire usePlayerData to real getDetail API"
```

---

### Task 8: Wire desktop app entry to Tauri source store

**Files:**
- Modify: `apps/desktop/src/main.tsx`

- [ ] **Step 1: Wire source store before app renders**

```typescript
// Add to apps/desktop/src/main.tsx, before ReactDOM.createRoot:
import { setSourceStore } from '@marstv/ui-shared';
import { tauriSourceStore } from './lib/source-store';

setSourceStore(tauriSourceStore);
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/main.tsx
git commit -m "feat(desktop): wire tauriSourceStore on app startup"
```

---

### Task 9: Upgrade desktop SettingsPage with proper source management UI

**Files:**
- Modify: `apps/desktop/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Replace JSON textarea with per-source form UI, make handlers async**

```typescript
// apps/desktop/src/pages/SettingsPage.tsx
import { getApiBase, setApiBase, getSources, addSource, removeSource } from '@marstv/ui-shared';
import type { CmsSource } from '@marstv/core';
import { useEffect, useState } from 'react';

export function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(getApiBase());
  const [saved, setSaved] = useState(false);
  const [sources, setSources] = useState<CmsSource[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newApi, setNewApi] = useState('');

  useEffect(() => { getSources().then(setSources); }, []);

  const handleSaveApi = () => {
    setApiBase(apiUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddSource = async () => {
    const key = newKey.trim(), name = newName.trim(), api = newApi.trim();
    if (!key || !name || !api) return;
    await addSource({ key, name, api });
    setSources(await getSources());
    setNewKey(''); setNewName(''); setNewApi('');
  };

  const handleRemoveSource = async (key: string) => {
    await removeSource(key);
    setSources(await getSources());
  };

  // ... (JSX same as before with per-source key/name/api inputs + source list)
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/pages/SettingsPage.tsx
git commit -m "feat(desktop): replace JSON paste with async per-source form UI"
```

---

### Task 10: Add source management UI to mobile settings screen

**Files:**
- Modify: `apps/mobile/app/settings.tsx`

- [ ] **Step 1: Add async source management**

```typescript
// Add imports:
import { getSources, addSource, removeSource } from '@marstv/ui-shared';
import type { CmsSource } from '@marstv/core';

// Add state + handlers (all async, same pattern as desktop):
const [sources, setSourcesState] = useState<CmsSource[]>([]);
const [newKey, setNewKey] = useState('');
const [newName, setNewName] = useState('');
const [newApi, setNewApi] = useState('');
const [showSources, setShowSources] = useState(false);

useEffect(() => { getSources().then(setSourcesState); }, []);

const handleAddSource = async () => {
  const key = newKey.trim(), name = newName.trim(), api = newApi.trim();
  if (!key || !name || !api) { Alert.alert('Error', 'All fields required'); return; }
  await addSource({ key, name, api });
  setSourcesState(await getSources());
  setNewKey(''); setNewName(''); setNewApi('');
};

const handleRemoveSource = async (key: string) => {
  await removeSource(key);
  setSourcesState(await getSources());
};
```

- [ ] **Step 2: Add JSX for source list (same structure as original plan — toggle button, 3 inputs, source cards with remove)**

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/settings.tsx
git commit -m "feat(mobile): add async CMS source management UI to settings"
```

---

### Task 11: Implement mobile `IStorage` via AsyncStorage

**Files:**
- Install: `@react-native-async-storage/async-storage`
- Create: `apps/mobile/src/lib/native-storage.ts`

- [ ] **Step 1: Install**

```bash
cd apps/mobile && pnpm add @react-native-async-storage/async-storage
```

- [ ] **Step 2: Create NativeStorageBackend** (full `IStorage` implementation using AsyncStorage — same code as original plan, mapping `marstv:history` / `marstv:favorites` / `marstv:subscriptions` keys to JSON arrays)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/lib/native-storage.ts apps/mobile/package.json
git commit -m "feat(mobile): implement IStorage via AsyncStorage"
```

---

### Task 12: Wire mobile home screen to real API data

**Files:**
- Modify: `apps/mobile/app/index.tsx`

- [ ] **Step 1: Replace mock data with real API calls** — use `fetchDoubanRankings`, `fetchHistory`, `fetchSubscriptions` from `@marstv/ui-shared`. Show 3 horizontal sections: Continue Watching (history), Douban Rankings, My Subscriptions.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/index.tsx
git commit -m "feat(mobile): wire home screen to real API data"
```

---

### Task 13: Wire mobile history, favorites, subscriptions, douban screens

**Files:**
- Modify: `apps/mobile/app/history.tsx`
- Modify: `apps/mobile/app/favorites.tsx`
- Modify: `apps/mobile/app/subscriptions.tsx`
- Modify: `apps/mobile/app/douban.tsx`

- [ ] **Step 1: Replace mock data in all 4 screens** — each screen calls its corresponding `fetch*()` function from `@marstv/ui-shared` on mount + pull-to-refresh. Douban adds movie/tv tab switcher.

- [ ] **Step 2: Commit each screen separately**

```bash
git add apps/mobile/app/history.tsx && git commit -m "feat(mobile): wire history screen to storage API"
git add apps/mobile/app/favorites.tsx && git commit -m "feat(mobile): wire favorites screen to storage API"
git add apps/mobile/app/subscriptions.tsx && git commit -m "feat(mobile): wire subscriptions screen to storage API"
git add apps/mobile/app/douban.tsx && git commit -m "feat(mobile): wire douban screen to real API"
```

---

### Task 14: Verify typecheck passes

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS. Fix any errors, commit fixes.

---

### Task 15: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Document `@marstv/ui-shared` in monorepo diagram**
- [ ] **Step 2: Update mobile tech stack with expo-file-system + AsyncStorage**
- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document ui-shared package and updated mobile stack"
```
